# SlideX Terraform

Terraform manages the AWS infrastructure for SlideX:

- S3 bucket for frontend build assets
- CloudFront distribution in front of the app
- Lambda Function URL backend for `/api/*` and `/deck/*`
- private S3 bucket for uploaded slide decks
- IAM role and policy for Lambda access to slide storage

## Layout

```text
infra/terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── versions.tf
├── lambda-placeholder/
└── modules/
    └── slide_bucket/
```

## Usage

```sh
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

Common commands are managed by `mise` from the repository root:

```sh
mise install
mise run install
mise run check
mise run tf:fmt
mise run tf:validate
mise run tf:plan
```

Deploy frontend and backend code after `terraform apply`:

```sh
mise run deploy
```

## Routing

CloudFront routes requests as follows:

- `/api/*` to Lambda
- `/deck/*` to Lambda for OGP-aware HTML
- all other frontend routes to S3, with SPA paths rewritten to `/index.html`

## Notes

- The Lambda placeholder lets Terraform create the function before the real backend bundle exists.
- The deploy script replaces the Lambda code package and uploads frontend assets.
- The slide bucket is private with public access blocked and versioning enabled.
