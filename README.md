# SlideX

SlideX is a lightweight web service for viewing and sharing HTML files as a slide deck.

Slides are plain HTML files named with a numeric prefix:

```text
01__Intro.html
02__Architecture.html
10__Summary.html
```

The frontend renders each slide in an iframe. Local development reads files from `fixtures/slides/{deckId}` through Vite middleware. Production stores decks in S3 and serves the app through Amplify Hosting with a Hono backend for upload APIs, manifest generation, slide redirects, and OGP HTML.

## Stack

- Frontend: Vite, React, TypeScript
- Backend: Hono, Node.js, AWS SDK v3
- Infrastructure: Terraform, CloudFront, S3, Lambda, IAM
- Tooling: mise, pnpm, Vitest

## Repository

```text
frontend/         Vite React app and local slide middleware
backend/          Hono API and OGP server
infra/terraform/  AWS infrastructure
docs/             PRD and architecture docs
mise.toml         Tool versions and project tasks
```

## Setup

Install tools and dependencies:

```sh
mise install
mise run install
```

Managed tool versions:

```sh
mise current
```

## Development

Start the presentation frontend:

```sh
mise run dev:frontend
```

Open:

- Presentation: `http://127.0.0.1:5173/`
- Admin UI: `http://127.0.0.1:5173/admin`

Start the backend:

```sh
cp backend/.env.example backend/.env
mise run dev:backend
```

For backend upload APIs, set at least:

```text
SLIDES_BUCKET_NAME=...
```

## Common Tasks

```sh
mise run typecheck
mise run test
mise run build
mise run check
```

Individual tasks are also available, for example:

```sh
mise run test:frontend
mise run test:backend
mise run build:frontend
mise run build:backend
```

## Terraform

Terraform manages only the production environment:

```sh
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
```

The same commands are available through mise:

```sh
mise run tf:fmt
mise run tf:validate
mise run tf:plan
```

## Deploy

Deploy the current build to the Terraform-managed CloudFront/S3/Lambda stack:

```sh
mise run deploy
```

The deploy task builds the frontend and backend, syncs frontend assets to S3, updates the backend Lambda function, and creates a CloudFront invalidation.

Useful overrides:

```sh
FRONTEND_BUCKET_NAME=... LAMBDA_FUNCTION_NAME=... CLOUDFRONT_DISTRIBUTION_ID=... mise run deploy
DRY_RUN=1 mise run deploy
```

## Verification

Current baseline:

```sh
mise run check
mise run tf:validate
```
