# Backend Design Doc

## 1. 目的

このドキュメントは SlideX のバックエンド設計を定義する。

バックエンドは Hono で実装し、Amplify Hosting compute 上で Node.js HTTP server として動作させる。主な責務は、アップロード API、manifest/OGP metadata 生成、OGP HTML shell 返却、スライド取得の API 化である。

## 2. 前提

- ランタイムは Node.js を前提にする。
- HTTP framework は Hono を採用する。
- 本番ホスティングは Amplify Hosting compute を第一候補とする。
- スライドファイル、manifest、OGP metadata は S3 に保存する。
- AWS SDK for JavaScript v3 を利用する。
- フロントエンドとは同一オリジンで動作する。
- 認証は初期実装では管理用トークンによる簡易認可とする。

## 3. 責務

バックエンドの責務:

- デッキ作成。
- 署名付きアップロード URL 発行。
- アップロード対象ファイルの検証。
- S3 オブジェクトの存在確認。
- `manifest.json` 生成。
- `deck.json` 生成。
- `ogp.json` 生成。
- OGP メタタグ付き HTML shell 生成。
- フロントエンドの SPA shell 返却。

バックエンドが持たない責務:

- HTML スライドの編集。
- 複雑なユーザー管理。
- PowerPoint/PDF/Markdown 変換。
- リアルタイム共同閲覧。

## 4. API 設計

### 4.1 Create Deck

```http
POST /api/decks
Authorization: Bearer {UPLOAD_ADMIN_TOKEN}
Content-Type: application/json
```

Request:

```json
{
  "title": "Product Intro",
  "description": "新規プロダクト紹介用スライド",
  "deckId": "product-intro"
}
```

Response:

```json
{
  "deckId": "product-intro",
  "uploadPrefix": "decks/product-intro/"
}
```

`deckId` が未指定の場合は API が生成する。

### 4.2 Request Upload URLs

```http
POST /api/decks/{deckId}/uploads
Authorization: Bearer {UPLOAD_ADMIN_TOKEN}
Content-Type: application/json
```

Request:

```json
{
  "files": [
    {
      "path": "01__イントロダクション.html",
      "size": 12000,
      "contentType": "text/html"
    },
    {
      "path": "assets/logo.png",
      "size": 40000,
      "contentType": "image/png"
    }
  ]
}
```

Response:

```json
{
  "deckId": "product-intro",
  "uploads": [
    {
      "path": "01__イントロダクション.html",
      "key": "decks/product-intro/01__イントロダクション.html",
      "url": "https://...",
      "expiresAt": "2026-05-27T12:00:00.000Z"
    }
  ],
  "warnings": []
}
```

### 4.3 Complete Upload

```http
POST /api/decks/{deckId}/complete
Authorization: Bearer {UPLOAD_ADMIN_TOKEN}
Content-Type: application/json
```

Request:

```json
{
  "files": [
    {
      "path": "01__イントロダクション.html",
      "size": 12000,
      "contentType": "text/html"
    }
  ],
  "metadata": {
    "title": "Product Intro",
    "description": "新規プロダクト紹介用スライド",
    "defaultOgImage": "og/default.png"
  }
}
```

Response:

```json
{
  "deckId": "product-intro",
  "manifestUrl": "/api/decks/product-intro/manifest",
  "deckUrl": "/deck/product-intro",
  "slides": 12
}
```

### 4.4 Get Manifest

```http
GET /api/decks/{deckId}/manifest
```

Response:

```json
{
  "deckId": "product-intro",
  "title": "Product Intro",
  "description": "新規プロダクト紹介用スライド",
  "slides": [
    {
      "order": 1,
      "title": "イントロダクション",
      "fileName": "01__イントロダクション.html",
      "url": "/api/decks/product-intro/files/01__イントロダクション.html"
    }
  ]
}
```

### 4.5 Resolve Slide File

```http
GET /api/decks/{deckId}/files/*path
```

初期実装では S3/CloudFront の公開 URL へリダイレクトする。S3 を private にする場合は短寿命の署名付き GET URL にリダイレクトする。

### 4.6 OGP HTML

```http
GET /deck/{deckId}
GET /deck/{deckId}?slide=03
```

HTML shell を返す。クローラーとブラウザの User-Agent による分岐は初期実装では行わず、常に OGP メタタグ付き HTML を返す。

## 5. Hono ルーティング構成

```text
server/
├── app.ts
├── routes/
│   ├── decks.ts
│   ├── uploads.ts
│   ├── files.ts
│   └── ogp.ts
├── domain/
│   ├── slideFile.ts
│   ├── manifest.ts
│   ├── ogp.ts
│   ├── uploadValidation.ts
│   └── deckId.ts
├── infra/
│   ├── s3Client.ts
│   ├── presign.ts
│   └── env.ts
└── server.ts
```

`server.ts` は Node.js HTTP server を起動し、Amplify Hosting compute の期待する port で listen する。

## 6. データモデル

### 6.1 Deck Metadata

```ts
type DeckMetadata = {
  deckId: string;
  title: string;
  description?: string;
  defaultOgImage?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 6.2 Slide Manifest

```ts
type SlideManifest = {
  deckId: string;
  title: string;
  description?: string;
  slides: Slide[];
};

type Slide = {
  order: number;
  title: string;
  fileName: string;
  key: string;
  url: string;
  ogImage?: string;
};
```

### 6.3 OGP Metadata

```ts
type OgpMetadata = {
  deck: OgpEntry;
  slides: Record<string, OgpEntry>;
};

type OgpEntry = {
  title: string;
  description?: string;
  image: string;
};
```

## 7. S3 キー設計

```text
decks/{deckId}/deck.json
decks/{deckId}/manifest.json
decks/{deckId}/ogp.json
decks/{deckId}/01__イントロダクション.html
decks/{deckId}/02__課題.html
decks/{deckId}/assets/logo.png
decks/{deckId}/og/default.png
```

`deckId` は URL と S3 key に利用するため、以下に制限する。

- 半角英数字。
- hyphen。
- underscore。
- 1 文字以上 80 文字以下。

## 8. アップロード検証

サーバー側検証:

- `deckId` が許可形式である。
- `path` が相対パスである。
- `path` に `..` が含まれない。
- パス先頭が `/` ではない。
- HTML スライドが 1 件以上ある。
- HTML スライドのファイル名が `NN__ページタイトル.html` 形式である。
- 順序番号が重複していない。
- allowlist 外の拡張子を拒否する。
- 1 ファイルサイズと総容量が上限内である。

許可拡張子の初期値:

- `.html`
- `.css`
- `.js`
- `.png`
- `.jpg`
- `.jpeg`
- `.webp`
- `.gif`
- `.svg`
- `.woff`
- `.woff2`
- `.json`

## 9. 認可

初期実装では `Authorization: Bearer {UPLOAD_ADMIN_TOKEN}` を利用する。

対象:

- `POST /api/decks`
- `POST /api/decks/{deckId}/uploads`
- `POST /api/decks/{deckId}/complete`

読み取り API と OGP HTML は公開する。

将来拡張:

- Cognito。
- GitHub OAuth。
- デッキ単位の編集権限。
- 公開/非公開デッキ。

## 10. OGP HTML 生成

OGP HTML は以下を含む。

- `title`
- `meta name="description"`
- `meta property="og:title"`
- `meta property="og:description"`
- `meta property="og:type"`
- `meta property="og:url"`
- `meta property="og:image"`
- `meta name="twitter:card"`
- `meta name="twitter:title"`
- `meta name="twitter:description"`
- `meta name="twitter:image"`
- Vite build の JS/CSS 読み込み。

メタタグ値は必ず HTML エスケープする。

`og:image` の優先順位:

1. スライド metadata。
2. デッキ metadata。
3. `OGP_DEFAULT_IMAGE_URL`。

## 11. エラー形式

```json
{
  "error": {
    "code": "INVALID_SLIDE_FILENAME",
    "message": "命名規則に合わないHTMLファイルがあります。",
    "details": {
      "fileName": "intro.html"
    }
  }
}
```

主要エラーコード:

- `UNAUTHORIZED`
- `INVALID_DECK_ID`
- `INVALID_FILE_PATH`
- `INVALID_SLIDE_FILENAME`
- `DUPLICATE_SLIDE_ORDER`
- `FILE_TOO_LARGE`
- `DECK_TOO_LARGE`
- `S3_UPLOAD_NOT_FOUND`
- `MANIFEST_GENERATION_FAILED`

## 12. テスト方針

単体テスト:

- deckId validation。
- path normalization。
- slide file parser。
- manifest generation。
- OGP HTML escaping。

統合テスト:

- 署名付き URL 発行。
- complete upload による manifest/ogp 生成。
- OGP HTML 返却。

ローカルでは S3 互換ストレージを使うか、S3 client を mock する。

## 13. 未決定事項

- S3 ファイル閲覧を CloudFront public URL にするか、署名付き GET URL にするか。
- OGP HTML を Hono compute で返すか、将来的に edge function へ分離するか。
- 管理用トークンをどの secret store から注入するか。
- アップロード完了時に既存ファイルを全削除して置換するか、差分更新するか。

