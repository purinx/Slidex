# SlideX Terraform

Terraform manages the AWS infrastructure for SlideX:

- private S3 bucket for uploaded slide decks
- IAM role and policy for Amplify compute access to S3
- Amplify Hosting app, branch, build spec, and optional custom domain

`UPLOAD_ADMIN_TOKEN` is intentionally not managed here because Terraform state would store the value. Configure it in Amplify Console, CI secrets, SSM, or another secret store after creating the app.

## Layout

```text
infra/terraform/
├── environments/
│   ├── dev/
│   └── prod/
└── modules/
    ├── amplify_app/
    ├── iam/
    └── slide_bucket/
```

## Usage

```sh
cd infra/terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
mise run tf:init:dev
mise run tf:plan:dev
mise run tf:apply:dev
```

Common commands are managed by `mise` from the repository root:

```sh
mise install
mise run install
mise run check
mise run tf:fmt
mise run tf:validate:dev
```

After the first apply, set `UPLOAD_ADMIN_TOKEN` for the Amplify branch outside Terraform.

If you use the Amplify default domain for browser uploads, add the emitted `amplify_branch_url` origin to `cors_allowed_origins` and apply again. Custom domains are added to CORS automatically when `domain_name` is set.

## Notes

- The backend reads Vite's built `index.html` from `FRONTEND_DIST_DIR=./frontend-dist` inside the Amplify compute bundle so `/deck/*` can return OGP tags plus the SPA shell.
- S3 buckets are private with public access blocked and versioning enabled.
- `prod` defaults `force_destroy_slide_bucket` to `false`; `dev` defaults it to `true`.
