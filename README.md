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
- Infrastructure: Terraform, AWS Amplify Hosting, S3, IAM
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
UPLOAD_ADMIN_TOKEN=...
```

The frontend admin upload form asks for the admin token and sends it as `Authorization: Bearer ...`.

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

Development environment:

```sh
cd infra/terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
cd -
mise run tf:fmt
mise run tf:validate:dev
mise run tf:plan:dev
```

Production environment:

```sh
cd infra/terraform/environments/prod
cp terraform.tfvars.example terraform.tfvars
cd -
mise run tf:validate:prod
mise run tf:plan:prod
```

`UPLOAD_ADMIN_TOKEN` is intentionally not managed by Terraform because Terraform state would store the secret. Configure it in Amplify Console, CI secrets, SSM, or another secret store after creating the Amplify app.

## Verification

Current baseline:

```sh
mise run check
mise run tf:validate:dev
mise run tf:validate:prod
```
