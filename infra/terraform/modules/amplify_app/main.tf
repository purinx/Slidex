locals {
  app_name                  = "${var.project_name}-${var.environment}"
  repository                = var.repository == null ? "" : trimspace(var.repository)
  access_token              = var.access_token == null ? "" : trimspace(var.access_token)
  has_repository_connection = local.repository != "" && local.access_token != ""
  build_spec                = <<-YAML
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - nvm install 22.13.0
            - nvm use 22.13.0
            - corepack enable
            - corepack prepare pnpm@11.3.0 --activate
            - CI=true pnpm install --frozen-lockfile
        build:
          commands:
            - pnpm --dir frontend build
            - pnpm --dir backend build
            - rm -rf .amplify-hosting
            - mkdir -p .amplify-hosting/static .amplify-hosting/compute/default
            - cp -R frontend/dist/. .amplify-hosting/static/
            - cp -R backend/dist/. .amplify-hosting/compute/default/
            - mkdir -p .amplify-hosting/compute/default/frontend-dist
            - cp -R frontend/dist/. .amplify-hosting/compute/default/frontend-dist/
            - cp backend/package.json .amplify-hosting/compute/default/package.json
            - pnpm --prod --dir .amplify-hosting/compute/default install
            - |
              cat > .amplify-hosting/deploy-manifest.json <<'JSON'
              {
                "version": 1,
                "framework": { "name": "slidex", "version": "0.1.0" },
                "routes": [
                  { "path": "/api/*", "target": { "kind": "Compute", "src": "default" } },
                  { "path": "/deck/*", "target": { "kind": "Compute", "src": "default" } },
                  { "path": "/assets/*", "target": { "kind": "Static" } },
                  { "path": "/*.*", "target": { "kind": "Static" } },
                  { "path": "/*", "target": { "kind": "Static" } }
                ],
                "computeResources": [
                  { "name": "default", "runtime": "nodejs20.x", "entrypoint": "server.js" }
                ]
              }
              JSON
      artifacts:
        baseDirectory: .amplify-hosting
        files:
          - '**/*'
  YAML
}

resource "aws_amplify_app" "this" {
  name                  = local.app_name
  repository            = local.has_repository_connection ? local.repository : null
  access_token          = local.has_repository_connection ? local.access_token : null
  iam_service_role_arn  = var.iam_service_role_arn
  platform              = "WEB_COMPUTE"
  build_spec            = local.build_spec
  environment_variables = var.environment_variables

  custom_rule {
    source = "/api/<*>"
    target = "/api/<*>"
    status = "200"
  }

  custom_rule {
    source = "/deck/<*>"
    target = "/deck/<*>"
    status = "200"
  }

  custom_rule {
    source = "/admin"
    target = "/index.html"
    status = "200"
  }

  custom_rule {
    source = "/admin/<*>"
    target = "/index.html"
    status = "200"
  }

  custom_rule {
    source = "/<*>"
    target = "/index.html"
    status = "404-200"
  }

  tags = var.tags
}

resource "aws_amplify_branch" "this" {
  app_id            = aws_amplify_app.this.id
  branch_name       = var.branch_name
  framework         = "React"
  stage             = upper(var.environment) == "PROD" ? "PRODUCTION" : "DEVELOPMENT"
  enable_auto_build = local.has_repository_connection && var.enable_auto_branch_build

  environment_variables = var.environment_variables

  tags = var.tags
}

resource "aws_amplify_domain_association" "this" {
  count       = var.domain_name == null ? 0 : 1
  app_id      = aws_amplify_app.this.id
  domain_name = var.domain_name

  sub_domain {
    branch_name = aws_amplify_branch.this.branch_name
    prefix      = var.sub_domain_prefix
  }
}
