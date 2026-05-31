#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TERRAFORM_DIR="${TERRAFORM_DIR:-$ROOT_DIR/infra/terraform}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-northeast-1}}"
DRY_RUN="${DRY_RUN:-0}"
KEEP_DEPLOY_ARTIFACTS="${KEEP_DEPLOY_ARTIFACTS:-0}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

terraform_output() {
  terraform -chdir="$TERRAFORM_DIR" output -raw "$1"
}

terraform_output_optional() {
  terraform -chdir="$TERRAFORM_DIR" output -raw "$1" 2>/dev/null || true
}

require_command aws
require_command node
require_command pnpm
require_command terraform
require_command zip

FRONTEND_BUCKET_NAME="${FRONTEND_BUCKET_NAME:-$(terraform_output_optional frontend_bucket_name)}"
LAMBDA_FUNCTION_NAME="${LAMBDA_FUNCTION_NAME:-$(terraform_output_optional lambda_function_name)}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-$(terraform_output_optional cloudfront_distribution_id)}"
CLOUDFRONT_URL="${CLOUDFRONT_URL:-$(terraform_output_optional cloudfront_url)}"

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/slidex-deploy.XXXXXX")"
LAMBDA_DIR="$WORK_DIR/lambda"
LAMBDA_ZIP="$WORK_DIR/slidex-backend-lambda.zip"

cleanup() {
  if [[ "$KEEP_DEPLOY_ARTIFACTS" == "1" ]]; then
    echo "Keeping deploy artifacts at $WORK_DIR"
  else
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

echo "Building frontend and backend..."
rm -rf "$ROOT_DIR/frontend/dist" "$ROOT_DIR/backend/dist"
pnpm --dir "$ROOT_DIR/frontend" build
pnpm --dir "$ROOT_DIR/backend" build

echo "Packaging backend Lambda..."
mkdir -p "$LAMBDA_DIR"
cp -R "$ROOT_DIR/backend/dist" "$LAMBDA_DIR/dist"
node - "$ROOT_DIR/backend/package.json" "$LAMBDA_DIR/package.json" <<'NODE'
const fs = require("node:fs");
const [sourcePath, targetPath] = process.argv.slice(2);
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const target = {
  name: source.name,
  version: source.version,
  private: true,
  type: source.type,
  dependencies: source.dependencies || {}
};
fs.writeFileSync(targetPath, `${JSON.stringify(target, null, 2)}\n`);
NODE
pnpm --dir "$LAMBDA_DIR" install --prod --ignore-scripts --config.node-linker=hoisted
(cd "$LAMBDA_DIR" && zip -qr "$LAMBDA_ZIP" .)

if [[ "$DRY_RUN" == "1" ]]; then
  echo "DRY_RUN=1 set; skipping AWS updates."
  echo "Frontend bucket: $FRONTEND_BUCKET_NAME"
  echo "Lambda function: $LAMBDA_FUNCTION_NAME"
  echo "CloudFront distribution: $CLOUDFRONT_DISTRIBUTION_ID"
  echo "Lambda package: $LAMBDA_ZIP"
  echo "Frontend dist: $ROOT_DIR/frontend/dist"
  exit 0
fi

if [[ -z "$FRONTEND_BUCKET_NAME" || -z "$LAMBDA_FUNCTION_NAME" || -z "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
  echo "Missing Terraform outputs. Run terraform apply first, or set FRONTEND_BUCKET_NAME, LAMBDA_FUNCTION_NAME, and CLOUDFRONT_DISTRIBUTION_ID." >&2
  exit 1
fi

echo "Syncing frontend assets to s3://$FRONTEND_BUCKET_NAME ..."
aws s3 sync "$ROOT_DIR/frontend/dist/" "s3://$FRONTEND_BUCKET_NAME/" \
  --region "$AWS_REGION" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

aws s3 cp "$ROOT_DIR/frontend/dist/index.html" "s3://$FRONTEND_BUCKET_NAME/index.html" \
  --region "$AWS_REGION" \
  --cache-control "public,max-age=0,must-revalidate" \
  --content-type "text/html; charset=utf-8"

echo "Updating Lambda function $LAMBDA_FUNCTION_NAME ..."
aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --zip-file "fileb://$LAMBDA_ZIP" \
  --region "$AWS_REGION" >/dev/null

echo "Waiting for Lambda update to finish..."
aws lambda wait function-updated \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --region "$AWS_REGION"

echo "Creating CloudFront invalidation..."
INVALIDATION_ID="$(
  aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text
)"

echo "Deployment complete."
echo "CloudFront URL: $CLOUDFRONT_URL"
echo "Invalidation ID: $INVALIDATION_ID"
