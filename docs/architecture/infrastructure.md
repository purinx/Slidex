# Infrastructure Design Doc

## 1. 目的

このドキュメントは SlideX のインフラ設計を定義する。

インフラは Terraform で管理する。AWS 上に Amplify Hosting、S3、IAM、必要に応じた Route 53 / ACM / CloudFront 設定を作成し、Vite フロントエンドと Hono バックエンドを同じ Amplify Hosting アプリとしてホスティングする。

## 2. 前提

- IaC は Terraform を利用する。
- AWS Provider を利用する。
- ホスティングは Amplify Hosting を第一候補にする。
- フロントエンドは Amplify Hosting の static primitive で配信する。
- Hono backend は Amplify Hosting の compute primitive で実行する。
- スライドファイルは S3 に保存する。
- S3 バケット名、リージョン、プレフィックスは環境変数または Terraform variable で管理する。
- GitHub などのリポジトリ連携は Terraform で管理する。ただし access token は Terraform state に残らない運用を優先する。

## 3. 採用 AWS サービス

- AWS Amplify Hosting
  - Vite static assets と Hono compute を配信する。
  - Git branch 連携による CI/CD を提供する。
- Amazon S3
  - スライド HTML、関連アセット、`manifest.json`、`deck.json`、`ogp.json` を保存する。
- AWS IAM
  - Amplify compute が S3 へアクセスするための role/policy を管理する。
- Amazon Route 53
  - 独自ドメインを利用する場合に管理する。
- AWS Certificate Manager
  - 独自ドメインの TLS 証明書を管理する。

## 4. Amplify Hosting 構成

Amplify Hosting は deployment specification に従う。

```text
.amplify-hosting/
├── static/
│   ├── index.html
│   └── assets/...
├── compute/
│   └── default/
│       ├── server.js
│       └── node_modules/...
└── deploy-manifest.json
```

ルーティング方針:

- `/api/*`
  - Hono compute に転送する。
- `/deck/*`
  - Hono compute に転送する。
  - OGP メタタグ付き HTML shell を返す。
- `/assets/*`
  - static assets として返す。
- その他
  - SPA fallback として `index.html` を返す。

Amplify Hosting deployment specification は static と compute を分ける構成を要求する。Terraform は Amplify app/branch/domain を管理し、実際の `.amplify-hosting` 成果物はリポジトリの build command が生成する。

参考:

- AWS Amplify Hosting deployment specification: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-deployment-specification.html
- AWS Amplify environment variables: https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html
- AWS Amplify SSR environment variables: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html

## 5. Terraform 管理対象

### 5.1 Core

- `aws_s3_bucket`
  - スライド保存用バケット。
- `aws_s3_bucket_public_access_block`
  - public access をブロックする。
- `aws_s3_bucket_versioning`
  - manifest 更新や再アップロードに備えて有効化する。
- `aws_s3_bucket_server_side_encryption_configuration`
  - SSE-S3 または SSE-KMS を有効化する。
- `aws_s3_bucket_cors_configuration`
  - 署名付き PUT と slide asset 取得に必要な CORS を設定する。
- `aws_iam_role`
  - Amplify compute 用 role。
- `aws_iam_policy`
  - S3 read/write/list 権限。
- `aws_amplify_app`
  - Amplify Hosting app。
- `aws_amplify_branch`
  - `main` などの deploy branch。
- `aws_amplify_domain_association`
  - 独自ドメインを使う場合のみ。

### 5.2 Optional

- `aws_kms_key`
  - S3 暗号化を KMS 管理にする場合。
- `aws_route53_record`
  - DNS を Terraform で管理する場合。
- `aws_ssm_parameter`
  - secret を Parameter Store に置く場合。
- `aws_cloudfront_distribution`
  - スライド配信用 CDN を Amplify とは別に持つ場合。

## 6. Terraform ディレクトリ構成案

```text
infra/
├── terraform/
│   ├── environments/
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── terraform.tfvars.example
│   │   └── prod/
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── terraform.tfvars.example
│   └── modules/
│       ├── amplify_app/
│       ├── slide_bucket/
│       ├── iam/
│       └── domain/
```

環境ごとに state を分ける。初期実装では dev/prod の 2 環境を想定する。

## 7. Terraform Variables

```hcl
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "slides_bucket_name" {
  type = string
}

variable "slides_prefix" {
  type    = string
  default = "decks"
}

variable "amplify_repository" {
  type = string
}

variable "amplify_branch_name" {
  type    = string
  default = "main"
}

variable "domain_name" {
  type    = string
  default = null
}

variable "upload_max_file_size_mb" {
  type    = number
  default = 20
}

variable "upload_max_deck_size_mb" {
  type    = number
  default = 200
}
```

## 8. Amplify Environment Variables

Amplify branch に設定する値:

```text
VITE_S3_BUCKET_NAME
VITE_S3_REGION
VITE_S3_PREFIX
VITE_S3_PUBLIC_BASE_URL
VITE_API_BASE_URL
UPLOAD_MAX_FILE_SIZE_MB
UPLOAD_MAX_DECK_SIZE_MB
OGP_DEFAULT_IMAGE_URL
```

## 9. S3 バケット設計

### 9.1 Bucket Policy

- public access block を有効化する。
- Amplify compute role からの read/write/list を許可する。
- 必要に応じて CloudFront OAC からの read を許可する。

### 9.2 CORS

署名付き PUT でブラウザから直接アップロードするため、S3 CORS を設定する。

許可 origin:

- Amplify の本番ドメイン。
- 独自ドメイン。
- 開発用 localhost は dev バケットのみ。

許可 method:

- `PUT`
- `GET`
- `HEAD`

許可 header:

- `Content-Type`
- `x-amz-*`

### 9.3 スライド配置ルール

スライドデッキは `slides_prefix` 配下にデッキ単位で配置する。

```text
s3://${slides_bucket_name}/${slides_prefix}/{deckId}/
├── deck.json
├── manifest.json
├── ogp.json
├── 01__イントロダクション.html
├── 02__課題と背景.html
├── assets/
│   └── ...
└── og/
    └── ...
```

キー設計:

- `slides_prefix` は Terraform variable または環境変数で管理し、既定値は `decks` とする。
- アプリケーションでは `slides_prefix` の先頭と末尾の `/` を取り除いて扱う。
- デッキのルート prefix は `${slides_prefix}/{deckId}/` とする。
- `deckId` は 1-80 文字の英数字、ハイフン、アンダースコアのみを許可する。
- 空の `slides_prefix` を許可する場合、デッキのルート prefix は `{deckId}/` とする。
- S3 key は API が決定し、クライアントから任意の絶対 key を指定させない。

アップロード path の扱い:

- アップロード path はデッキルートからの相対 path とする。
- `\` は `/` に正規化する。
- 先頭 `/`、Windows drive prefix、空 segment、`.`、`..` を含む path は拒否する。
- `index.html` は Amplify/Vite アプリ本体の entry として予約し、スライドデッキ内には配置しない。
- スライド HTML 内の相対参照が壊れないよう、関連アセットは元の相対ディレクトリ構造を保って配置する。

スライド HTML:

- スライドとして扱う HTML は `NN__ページタイトル.html` 形式にする。
- `NN` は 2 桁以上の数値とし、表示順は数値昇順とする。
- `ページタイトル` は `.html` を除いた部分を URL decode して表示タイトルに使う。
- 同一デッキ内で同じ `NN` が複数ある場合はアップロードを拒否する。
- `.htm` は対象外とし、`index.html` はスライドとして扱わない。

メタデータファイル:

- `deck.json` はユーザー入力由来のデッキメタデータを保存する。
- `manifest.json` はフロントエンドがスライド一覧を構築するための正規ファイルとする。
- `ogp.json` は `/deck/{deckId}` と `/deck/{deckId}?slide=NN` の OGP HTML 生成に使う。
- `manifest.json` と `ogp.json` はアップロード完了 API が S3 上のオブジェクト検証後に生成または更新する。
- 本番ブラウザは S3 の `ListObjectsV2` に依存せず、API 経由または公開ベース URL 経由で `manifest.json` を取得する。

配信:

- S3 bucket は private とし、オブジェクトの public read は有効化しない。
- スライド HTML とアセットは Hono API から署名付き GET URL へ redirect するか、将来的に CloudFront OAC 経由で配信する。
- `VITE_S3_PUBLIC_BASE_URL` を設定する場合も、ベース URL はデッキルート prefix を指す URL とし、`manifest.json` や各 `fileName` を相対結合できる形にする。

### 9.4 Lifecycle

初期実装では lifecycle は設定しない。

将来的な候補:

- 古い upload staging prefix の削除。
- 古い object version の期限切れ削除。
- ログ保存期間の制御。

## 10. IAM 設計

Amplify compute role に付与する最小権限:

```text
s3:GetObject
s3:PutObject
s3:DeleteObject
s3:ListBucket
s3:HeadObject
```

対象 resource:

```text
arn:aws:s3:::${slides_bucket_name}
arn:aws:s3:::${slides_bucket_name}/${slides_prefix}/*
```

署名付き URL 発行は compute role の権限で行う。

## 11. CI/CD

Amplify build command は以下を行う。

1. 依存関係をインストールする。
2. フロントエンドを Vite build する。
3. Hono server を Node.js 用に bundle する。
4. `.amplify-hosting/static` に Vite build 成果物を配置する。
5. `.amplify-hosting/compute/default` に server bundle を配置する。
6. `.amplify-hosting/deploy-manifest.json` を生成する。

Terraform は Amplify app と branch を作成するが、アプリケーション build artifact 自体は Git push による Amplify build で生成する。

## 12. State 管理

Terraform backend は S3 + DynamoDB lock を推奨する。

```text
tfstate bucket: slidex-terraform-state-{account}
lock table: slidex-terraform-locks
```

初期開発では local state でもよいが、prod 作成前に remote backend へ移行する。

## 13. セキュリティ

- S3 bucket は private。
- public access block を有効化する。
- Amplify compute role は slides bucket への最小権限のみ持つ。
- dev/prod はバケットと Amplify app を分離する。
- CORS origin は環境ごとに限定する。

## 14. 運用

### 14.1 デプロイ

1. Terraform で AWS リソースを作成する。
2. Amplify app と branch を Git repository に接続する。
3. Git push により Amplify build/deploy を実行する。
4. Hono `/healthz` を確認する。
5. テストデッキをアップロードする。
6. `/deck/{deckId}` の OGP を確認する。

### 14.2 ロールバック

- アプリケーションは Amplify の過去ビルドへ戻す。
- スライドデータは S3 versioning から復元する。
- Terraform 変更は PR レビュー後に apply し、必要なら前の commit に戻して再 apply する。

## 15. 未決定事項

- Amplify compute role の IAM role を Terraform で完全に関連付けられるか、Amplify 側の制約確認が必要。
- S3 slide file の閲覧を CloudFront 経由にするか、Hono の署名付き GET URL redirect にするか。
- 独自ドメインを初期リリースに含めるか。
- Terraform module を最初から分けるか、初期は単一構成にするか。
