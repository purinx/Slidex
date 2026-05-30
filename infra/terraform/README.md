# SlideX Terraform

Terraform manages the AWS infrastructure for SlideX:

- private S3 bucket for uploaded slide decks
- IAM role and policy for Amplify compute access to S3
- Amplify Hosting app, branch, build spec, and optional custom domain

## Layout

```text
infra/terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── versions.tf
└── modules/
    ├── amplify_app/
    ├── iam/
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

If you use the Amplify default domain for browser uploads, add the emitted `amplify_branch_url` origin to `cors_allowed_origins` and apply again. Custom domains are added to CORS automatically when `domain_name` is set.

By default Terraform creates the Amplify app without connecting a Git repository. To connect GitHub during `terraform apply`, set both `amplify_repository` and `amplify_access_token`; otherwise connect the repository later from the Amplify Console.

## Notes

- The backend reads Vite's built `index.html` from `FRONTEND_DIST_DIR=./frontend-dist` inside the Amplify compute bundle so `/deck/*` can return OGP tags plus the SPA shell.
- S3 buckets are private with public access blocked and versioning enabled.
- Terraform manages only the production environment.
- `force_destroy_slide_bucket` defaults to `false`.
