# PRD: SlideX

## 1. 概要

SlideX は、連番付きの複数 HTML ファイルを「スライド」として読み込み、ブラウザ上で閲覧・共有できる Web サービスである。

ユーザーはローカル開発環境では手元のディレクトリ内にある HTML ファイルを直接参照し、本番環境では S3 バケット上に配置された HTML ファイル群を参照する。各 HTML ファイルは 1 ページ分のスライドとして扱い、ファイル名からページ順とページタイトルを解釈する。

## 2. 背景と目的

HTML で作成されたスライドは、自由度が高く、既存の Web 技術や生成ツールとの相性がよい。一方で、複数の HTML ファイルをページ順に並べ、共有可能な形で閲覧するためには、ファイル一覧取得、ナビゲーション、ページタイトル管理、配信環境の差分吸収が必要になる。

SlideX はこれらをアプリケーション側で吸収し、HTML ファイルを所定の命名規則で配置するだけで、スライドデッキとして閲覧・共有できる状態を提供する。

## 3. ゴール

- ローカルのディレクトリに配置された連番付き HTML ファイルをスライドとして閲覧できる。
- 開発環境ではローカルファイルを直接参照し、即時確認できる。
- 本番環境では S3 に配置された HTML ファイルを参照できる。
- S3 バケット名は環境変数で切り替えられる。
- ブラウザからスライド一式を S3 にアップロードできる。
- ファイル名からスライド順とタイトルを自動抽出できる。
- スライド一覧、前後移動、現在位置表示、直接リンク共有ができる。
- 共有 URL に対して適切な OGP メタデータを返し、SNS やチャットツール上でスライド情報が展開される。
- Vite ベースで、フロントエンド中心の軽量な実装にする。

## 4. 非ゴール

- HTML スライド自体の編集機能は提供しない。
- PowerPoint、PDF、Markdown などからの変換機能は初期スコープに含めない。
- 複数ユーザー、組織、ロールベース権限管理は初期スコープに含めない。
- 初期スコープのアップロード認可は単一の管理用トークンまたは同等の簡易認可に限定する。
- リアルタイム共同閲覧や発表者モードは初期スコープに含めない。

## 5. 想定ユーザー

- HTML/CSS/JS でスライドを作成する開発者。
- 生成済み HTML スライドをレビュー・共有したい個人または小規模チーム。
- 静的ファイルとして管理されたスライドを、URL で簡単に共有したいユーザー。

## 6. ユースケース

### 6.1 ローカル開発での確認

1. ユーザーはローカルにスライド用ディレクトリを用意する。
2. ディレクトリに `01__イントロダクション.html` のような命名規則で HTML ファイルを配置する。
3. Vite の dev server を起動する。
4. アプリはローカルディレクトリのファイル一覧を取得し、スライドとして表示する。
5. ユーザーはブラウザでページ遷移やレイアウトを確認する。

### 6.2 本番環境での共有

1. ユーザーは同じ命名規則の HTML ファイル群を S3 バケットに配置する。
2. 本番環境では環境変数で S3 バケット名と必要なプレフィックスを指定する。
3. アプリは S3 上の HTML ファイル一覧を取得し、スライドとして表示する。
4. ユーザーは特定スライドの URL を共有できる。

### 6.3 スライド一式のアップロード

1. ユーザーはブラウザでアップロード画面を開く。
2. ローカルのスライドディレクトリ、または複数ファイルを選択する。
3. アプリはファイル名の命名規則、重複番号、必須 HTML ファイルの存在を検証する。
4. アプリは API から S3 への署名付きアップロード URL を取得する。
5. アプリは HTML ファイルと関連アセットを S3 にアップロードする。
6. アップロード完了後、manifest と OGP 用メタデータが生成・保存される。
7. ユーザーは共有 URL を取得できる。

### 6.4 OGP 付き共有

1. ユーザーはスライドデッキまたは特定スライドの URL を共有する。
2. SNS、Slack、Discord などのクローラーが URL にアクセスする。
3. サービスは対象デッキまたはスライドのタイトル、説明、OG画像を含む HTML メタタグを返す。
4. 通常のブラウザアクセスでは Vite アプリが起動し、対象スライドを表示する。

## 7. ファイル命名規則

HTML ファイルは以下の形式に従う。

```text
NN__ページタイトル.html
```

例:

```text
01__イントロダクション.html
02__課題と背景.html
03__提案アーキテクチャ.html
10__まとめ.html
```

### 7.1 パース仕様

- `NN` は 2 桁以上の半角数字とする。
- `__` は順序番号とページタイトルを区切る固定セパレーターとする。
- `ページタイトル` は拡張子 `.html` を除いた文字列とする。
- 表示タイトルでは必要に応じて URL デコードを行う。
- 並び順は `NN` の数値昇順とする。
- 同じ `NN` が複数存在する場合はエラーとして扱う。
- 命名規則に合わない `.html` ファイルは無視し、開発環境では警告を表示する。

### 7.2 制約

- 初期実装では `.html` のみを対象とする。
- `.htm` は対象外とする。
- ファイル名の大文字小文字は区別する。
- `index.html` は Vite アプリ本体のエントリとして扱い、スライドファイルには含めない。

## 8. 機能要件

### 8.1 スライドデッキ読み込み

- アプリは起動時にスライドファイル一覧を取得する。
- 取得元は実行環境によって切り替える。
  - 開発環境: ローカルディレクトリ。
  - 本番環境: S3。
- ファイル一覧は命名規則に従ってパースされ、スライドメタデータに変換される。
- スライドメタデータは以下を持つ。
  - `order`: ページ順。
  - `title`: ページタイトル。
  - `fileName`: ファイル名。
  - `url`: iframe などで読み込むための URL。

### 8.2 スライド表示

- 各 HTML ファイルはアプリ内の表示領域に読み込まれる。
- 初期実装では iframe による表示を基本とする。
- iframe はスライド内容の CSS/JS とホストアプリの CSS/JS を分離する。
- iframe のサイズはブラウザ viewport に追従する。
- スライド HTML 内の相対パスは、対象 HTML ファイルの配置ディレクトリを基準に解決される必要がある。

### 8.3 ナビゲーション

- 前のスライドへ移動できる。
- 次のスライドへ移動できる。
- スライド一覧から任意のスライドへ移動できる。
- 現在のスライド番号と総スライド数を表示する。
- 現在のスライドタイトルを表示する。
- キーボード操作に対応する。
  - `ArrowRight`, `Space`: 次へ。
  - `ArrowLeft`: 前へ。
  - `Home`: 先頭へ。
  - `End`: 最後へ。

### 8.4 URL 共有

- 現在スライドを URL で表現できる。
- 推奨形式はクエリパラメータまたはパスパラメータとする。
  - 例: `/deck?slide=03`
  - 例: `/deck/03`
- 初期実装では Vite の SPA ルーティングとの相性を考慮し、クエリパラメータ `?slide=NN` を採用する。
- 不正な `slide` 値の場合は先頭スライドへフォールバックする。

#### 8.4.1 フロントエンドページ

初期実装では React Router を導入せず、`window.location.pathname` によって表示する画面を切り替える。

| URL | 画面 | 主な機能 |
| --- | --- | --- |
| `/` | Presentation | 開発環境ではローカルデッキ、本番環境ではデフォルトデッキを読み込み、現在スライドを iframe で表示する。 |
| `/?slide=NN` | Presentation | ルート表示のまま、指定された順序番号のスライドを直接表示する。不正値は先頭スライドへフォールバックする。 |
| `/deck/{deckId}` | Presentation | 指定された `deckId` の manifest を読み込み、デッキ先頭スライドを表示する。本番では Hono が OGP 付き HTML シェルを返し、React 起動後に同じ URL を解釈する。 |
| `/deck/{deckId}?slide=NN` | Presentation | 指定デッキ内の特定スライドを直接表示する。共有 URL と OGP 返却の主要形式とする。 |
| `/admin` | Admin | デッキのアップロード、アップロード前検証、進捗表示、OGP プレビュー、現在 manifest の確認を行う。 |
| `/admin/*` | Admin | 管理画面配下の将来拡張用パス。初期実装では `/admin` と同じ Admin 画面を表示する。 |

補足:

- `/admin` で始まるパスは Admin 画面、それ以外は Presentation 画面として扱う。
- `/assets/*` は Vite build の静的アセット配信用であり、フロントエンドの画面 URL ではない。
- `/api/*`、`/__slides`、`/__slide-files/*` は画面ではなくデータ取得またはスライドファイル配信用のエンドポイントである。

### 8.5 アップロード

- ユーザーはブラウザからスライド一式をアップロードできる。
- アップロード対象は以下を許可する。
  - HTML スライドファイル。
  - HTML から参照される画像、CSS、JavaScript、フォントなどの関連アセット。
  - 任意の `deck.json` または `metadata.json`。
- アップロード前にクライアント側で以下を検証する。
  - `NN__ページタイトル.html` 形式の HTML ファイルが 1 件以上存在する。
  - 順序番号が重複していない。
  - ファイルサイズが上限を超えていない。
  - 許可されていない拡張子が含まれていない。
- サーバー側でも同じ検証を行う。
- アップロードは API が発行した署名付き URL を利用し、ブラウザから S3 へ直接 PUT する。
- アップロード完了後、API は `manifest.json` と OGP 用メタデータを生成または更新する。
- アップロード先の S3 プレフィックスはデッキ単位で分離する。
  - 例: `decks/{deckId}/01__イントロダクション.html`
- 同じ `deckId` に再アップロードする場合は、既存ファイルとの差分更新または全置換を選択できる。
- 初期実装では全置換を標準動作とする。

### 8.6 OGP

- デッキ共有 URL とスライド共有 URL に OGP メタデータを付与する。
- OGP 対象 URL は以下を想定する。
  - デッキトップ: `/deck/{deckId}`
  - 特定スライド: `/deck/{deckId}?slide=NN`
- OGP では以下のメタタグを返す。
  - `og:title`
  - `og:description`
  - `og:type`
  - `og:url`
  - `og:image`
  - `twitter:card`
  - `twitter:title`
  - `twitter:description`
  - `twitter:image`
- SPA の `index.html` だけではクローラーごとに異なる OGP を返せないため、OGP 対応はサーバーまたはエッジで HTML シェルを生成する。
- 通常のブラウザアクセスでは、OGP メタタグ付き HTML シェルから Vite アプリを読み込み、対象スライドを表示する。
- `og:title` は原則としてデッキ名またはスライドタイトルを利用する。
- `og:description` は deck metadata で指定された説明文を優先し、未指定の場合はスライドタイトルと枚数から自動生成する。
- `og:image` は以下の優先順位で決定する。
  1. deck metadata で指定された画像。
  2. スライドごとの metadata で指定された画像。
  3. アップロード時に生成されたデッキ代表画像。
  4. デフォルト OGP 画像。
- 初期実装では、OG画像の自動スクリーンショット生成は Should とし、Must では metadata 指定またはデフォルト画像を利用する。

### 8.7 エラー表示

- スライドが 1 件も見つからない場合、空状態を表示する。
- ファイル一覧取得に失敗した場合、再試行可能なエラー状態を表示する。
- 重複した順序番号が存在する場合、該当ファイル名を表示する。
- iframe の読み込みに失敗した場合、対象ファイル名と URL を表示する。
- アップロードに失敗した場合、失敗したファイル名、原因、再試行可否を表示する。
- OGP メタデータが不足している場合、フォールバック値を使い、開発環境では警告を表示する。

## 9. 環境別仕様

### 9.1 開発環境

開発環境では、ローカルファイルを直接参照する。

ブラウザだけでは任意のローカルディレクトリを安全に列挙できないため、Vite dev server のミドルウェアでローカルディレクトリを読み取り、ファイル一覧 API を提供する。

#### 開発環境 API

```http
GET /__slides/{deckId}
```

レスポンス例:

```json
{
  "source": "local",
  "slides": [
    {
      "order": 1,
      "title": "イントロダクション",
      "fileName": "01__イントロダクション.html",
      "url": "/__slide-files/product-intro/01__イントロダクション.html"
    }
  ],
  "warnings": []
}
```

#### 開発環境設定

- `VITE_SLIDES_DIR`
  - ローカルのスライド fixture ルートディレクトリ。
  - 例: `../fixtures/slides`
  - Vite dev server 起動時に参照する。

開発環境では Vite middleware が `VITE_SLIDES_DIR/{deckId}` 配下の HTML と関連アセットを静的配信する。

### 9.2 本番環境

本番環境では、スライドファイルは S3 に配置される。

本番ブラウザから S3 のファイル一覧を直接取得するには、S3 ListObjects API の認証や CORS が課題になる。そのため、初期実装では次のいずれかを採用する。

推奨方式:

- デプロイ時またはアップロード時に `manifest.json` を生成し、S3 に配置する。
- フロントエンドは `manifest.json` を取得してスライド一覧を構築する。

代替方式:

- Cloudflare Workers、AWS Lambda、または同等の軽量 API で S3 の ListObjectsV2 を実行し、一覧 API を提供する。

初期スコープでは、運用とセキュリティを単純化するため `manifest.json` 方式を採用する。

#### 本番 manifest

S3 に以下のファイルを配置する。

```text
deck.json
manifest.json
ogp.json
01__イントロダクション.html
02__課題と背景.html
assets/...
og/default.png
```

`manifest.json` 例:

```json
{
  "deckId": "product-intro",
  "title": "Product Intro",
  "description": "Product Intro の共有用スライドです。",
  "slides": [
    {
      "fileName": "01__イントロダクション.html",
      "ogImage": "og/01.png"
    },
    {
      "fileName": "02__課題と背景.html"
    }
  ]
}
```

フロントエンドは manifest の `fileName` を命名規則でパースし、`order`、`title`、`url` を補完する。

`deck.json` はアップロード時にユーザーが指定できる任意メタデータを保持する。

```json
{
  "title": "Product Intro",
  "description": "新規プロダクト紹介用のスライドです。",
  "defaultOgImage": "og/default.png"
}
```

`ogp.json` は OGP 返却用に正規化されたメタデータを保持する。

```json
{
  "deck": {
    "title": "Product Intro",
    "description": "新規プロダクト紹介用のスライドです。",
    "image": "og/default.png"
  },
  "slides": {
    "01": {
      "title": "イントロダクション",
      "description": "Product Intro - イントロダクション",
      "image": "og/01.png"
    }
  }
}
```

#### 本番アップロード API

アップロード機能には、フロントエンドから直接 AWS 認証情報を扱わないための API を用意する。

```http
POST /api/decks
POST /api/decks/{deckId}/uploads
POST /api/decks/{deckId}/complete
```

- `POST /api/decks`
  - 新しい `deckId` を発行する。
  - デッキタイトル、説明、公開設定を受け取る。
- `POST /api/decks/{deckId}/uploads`
  - ファイル一覧を受け取り、検証する。
  - S3 署名付き PUT URL の一覧を返す。
- `POST /api/decks/{deckId}/complete`
  - アップロード完了後に呼び出す。
  - S3 上のファイルを検証する。
  - `manifest.json`、`deck.json`、`ogp.json` を生成する。

#### OGP 返却

OGP はクローラーが JavaScript 実行前に読むため、静的な Vite SPA だけでは成立しない。以下のいずれかで HTML シェルを生成する。

採用方式:

- Amplify Hosting compute 上の Hono アプリで `/deck/{deckId}` へのアクセスを処理する。
- `ogp.json` を参照し、対象デッキまたはスライド用の OGP メタタグを含む HTML を返す。
- HTML body では Vite アプリの `index.html` と同じ JS/CSS を読み込む。
- `/api/*` も同じ Hono アプリで処理し、アップロード API と OGP HTML 生成を同一バックエンドに集約する。

将来的な代替方式:

- CloudFront + Lambda@Edge または CloudFront Functions で OGP HTML を返す。
- API Gateway + Lambda で `/deck/{deckId}` を返す。
- Vercel/Netlify の edge functions で OGP HTML を返す。

#### 本番環境設定

- `VITE_S3_BUCKET_NAME`
  - S3 バケット名。
  - 例: `my-slide-bucket`
- `VITE_S3_REGION`
  - S3 リージョン。
  - 例: `ap-northeast-1`
- `VITE_S3_PREFIX`
  - バケット内の任意プレフィックス。
  - 例: `decks/product-intro`
  - 未指定の場合はバケット直下を参照する。
- `VITE_S3_PUBLIC_BASE_URL`
  - CloudFront または S3 static website hosting の公開 URL。
  - 例: `https://slides.example.com/product-intro`
  - 指定がある場合、スライド URL と manifest URL の生成に優先使用する。
- `VITE_API_BASE_URL`
  - アップロード API と OGP API のベース URL。
  - 例: `https://api.slides.example.com`
  - Amplify Hosting compute で同一オリジン運用する場合は未指定または空文字にできる。
- `UPLOAD_ADMIN_TOKEN`
  - アップロード API の簡易認可トークン。
  - サーバー側のみで参照し、フロントエンドビルドには含めない。
- `OGP_DEFAULT_IMAGE_URL`
  - デッキまたはスライドに OGP 画像が指定されていない場合のデフォルト画像。

本番構成は Amplify Hosting + Hono compute + S3 で確定する。フロントエンド静的アセットと Hono サーバーは同じ Amplify Hosting アプリでホスティングする。スライド HTML は S3 に保存し、S3 バケット自体は public read にせず、Amplify/Hono から署名付き URL を発行するか CloudFront 経由で公開する。

## 10. 技術スタック

### 10.1 フロントエンド

- Vite
  - 高速な dev server とシンプルなビルド構成を利用する。
- React
  - スライドビューア、ナビゲーション、状態管理をコンポーネントとして整理する。
- TypeScript
  - ファイルメタデータ、環境設定、パース結果を型で管理する。
- CSS Modules または Vanilla CSS
  - 初期実装では小規模な UI のため、追加 UI フレームワークは導入しない。

### 10.2 ルーティング

- React Router は初期実装では必須にしない。
- 現在スライドは `URLSearchParams` で管理する。
- 将来的に複数デッキや管理画面が必要になった時点で React Router の導入を検討する。

### 10.3 API / サーバーサイド

- Node.js
  - アップロード API、manifest 生成、OGP HTML 生成を実装する。
- Hono
  - 軽量な HTTP API として利用する。
  - Web Standard API ベースで、Node.js、AWS Lambda、Lambda@Edge など複数ランタイムへ移植しやすい。
- AWS SDK for JavaScript v3
  - S3 署名付き URL の発行、オブジェクト検証、manifest 書き込みに利用する。
- Amplify Hosting compute
  - フロントエンド静的アセット、Hono API、OGP HTML 生成を 1 つの Amplify Hosting アプリとして配信する。
  - Hono は Node.js HTTP server として起動し、Amplify Hosting の compute primitive で実行する。
- Lambda + API Gateway
  - 初期スコープでは採用しない。将来的に API を分離する場合の移行先候補とする。
- Lambda@Edge または CloudFront Functions
  - 初期スコープでは採用しない。将来的に OGP 生成を CDN edge 側に分離したい場合の候補とする。

### 10.4 開発補助

- Vite plugin / configureServer middleware
  - 開発環境でローカルディレクトリのファイル一覧取得と静的配信を行う。
- Node.js `fs` / `path`
  - dev server のみで利用する。

### 10.5 本番ホスティング

- フロントエンドアプリ + Hono API: Amplify Hosting でホスティングする。
  - Vite build の静的アセットは Amplify Hosting の static primitive で配信する。
  - Hono の Node.js server は Amplify Hosting の compute primitive で実行する。
  - `/api/*` は Hono API にルーティングする。
  - `/deck/*` は OGP HTML 生成を含む Hono ルートにルーティングする。
  - その他の SPA ルートは Vite アプリへフォールバックする。
- スライド HTML: S3。
- アップロード API: Hono on Amplify Hosting compute。
- OGP HTML 生成: Hono on Amplify Hosting compute。
- CDN: Amplify Hosting が提供する配信基盤を利用する。スライドファイル配信に追加要件が出た場合のみ CloudFront の併用を検討する。

ビルド成果物は Amplify Hosting deployment specification に合わせる。

```text
.amplify-hosting/
├── static/
│   └── assets/...
├── compute/
│   └── default/
│       └── server.js
└── deploy-manifest.json
```

### 10.6 テスト

- Vitest
  - ファイル名パーサー、manifest パーサー、URL 状態管理の単体テスト。
- Testing Library
  - ナビゲーション UI のコンポーネントテスト。
- Playwright
  - スライド遷移、URL 共有、iframe 表示の E2E テスト。
- API integration test
  - 署名付き URL 発行、アップロード完了処理、manifest/OGP 生成を検証する。

### 10.7 Lint / Format

- ESLint
- Prettier
- TypeScript strict mode

## 11. アーキテクチャ

### 11.1 主要モジュール

- `src/domain/slideFile.ts`
  - ファイル名のパース。
  - スライドメタデータ生成。
  - 重複や不正ファイルの検出。
- `src/data/slideSource.ts`
  - 開発環境と本番環境の取得元を抽象化。
- `src/data/localSlideSource.ts`
  - `/__slides/{deckId}` からローカルスライド一覧を取得。
- `src/data/s3ManifestSlideSource.ts`
  - S3 または公開 URL 上の `manifest.json` を取得。
- `src/data/uploadClient.ts`
  - アップロード API と通信し、署名付き URL の取得と完了通知を行う。
- `src/components/SlideViewer.tsx`
  - iframe 表示。
- `src/components/SlideControls.tsx`
  - 前後移動、現在位置表示、キーボード操作。
- `src/components/SlideList.tsx`
  - スライド一覧。
- `src/components/UploadDialog.tsx`
  - スライドディレクトリまたは複数ファイルの選択、検証結果、アップロード進捗を表示する。
- `src/vite/slidesMiddleware.ts`
  - Vite dev server 用のローカルディレクトリ読み取りと静的配信。
- `api/routes/decks.ts`
  - デッキ作成、アップロード URL 発行、アップロード完了処理を提供する。
- `api/domain/manifest.ts`
  - manifest と OGP メタデータを生成する。
- `api/domain/ogp.ts`
  - OGP HTML シェルを生成する。

### 11.2 データフロー

1. アプリ起動。
2. 環境変数から実行モードとスライド取得元を決定。
3. スライド一覧を取得。
4. ファイル名をパースしてスライドメタデータを生成。
5. URL の `slide` パラメータから初期スライドを決定。
6. iframe に対象スライド HTML を読み込む。
7. ユーザー操作に応じて現在スライドと URL を更新する。

### 11.3 アップロードデータフロー

1. ユーザーがファイルまたはディレクトリを選択する。
2. クライアントがファイル名、重複、サイズ、拡張子を検証する。
3. クライアントが API にデッキ作成または更新をリクエストする。
4. API が S3 キーを決定し、署名付き PUT URL を返す。
5. クライアントが各ファイルを S3 に直接アップロードする。
6. クライアントが API にアップロード完了を通知する。
7. API が S3 上のファイルを確認し、manifest と OGP メタデータを書き込む。
8. クライアントが共有 URL を表示する。

### 11.4 OGP データフロー

1. クローラーまたはブラウザが `/deck/{deckId}` にアクセスする。
2. edge/API が `deckId` と `slide` パラメータを解析する。
3. edge/API が S3 またはキャッシュから `ogp.json` を取得する。
4. 対象デッキまたはスライドの OGP メタタグを組み立てる。
5. HTML シェルを返す。
6. ブラウザでは HTML シェル内の JS により Vite アプリが起動する。

## 12. UI 要件

### 12.1 レイアウト

- スライド iframe を画面全体に表示する。
- 通常閲覧時はスライド自体を主表示とし、アプリ UI は最小限に抑える。
- コントロールは画面端のオーバーレイとして表示する。
- コントロールはホバー、フォーカス、タップ、またはキーボード操作時に表示する。
- 左右キーで前後のスライドへ移動できる。
  - `←` / `ArrowLeft`: 前へ。
  - `→` / `ArrowRight`: 次へ。
- サイドバーまたはドロップダウンのスライド一覧は、必要な時だけ開く補助 UI とする。
- スライド閲覧を妨げないよう、UI はスライド上の重要な内容を常時覆わない。

### 12.2 表示項目

- デッキ名またはアプリ名。
- 現在スライドタイトル。
- 現在位置。
  - 例: `3 / 12`
- 前へボタン。
- 次へボタン。
- スライド一覧ボタン。
- 共有 URL コピー機能。
- アップロードボタン。
- アップロード進捗。
- アップロード完了後の共有 URL 表示。
- OGP プレビュー。

### 12.3 レスポンシブ

- デスクトップではスライドを viewport 全体に表示し、一覧をオーバーレイパネルで表示できる。
- モバイルでは一覧をモーダルまたはドロワーで表示する。
- iframe は viewport に合わせて表示する。

## 13. セキュリティ要件

- スライド HTML は iframe で分離して表示する。
- 初期実装では同一オリジン配信のため、必要以上に iframe sandbox を強制しない。
- 将来的に外部ユーザーがアップロードした HTML を扱う場合は、sandbox 属性、CSP、別オリジン配信を必須化する。
- S3 バケット名や公開 URL は環境変数で管理する。
- AWS secret access key などの機密情報はフロントエンドに埋め込まない。
- 本番で S3 を直接公開する場合は、意図しないファイルが公開されないようプレフィックスとバケットポリシーを管理する。
- アップロード API は管理用トークンまたは同等の簡易認可を必須とする。
- S3 へのアップロードは短時間で失効する署名付き URL を利用する。
- アップロード可能な拡張子と MIME type を allowlist で制限する。
- 1 ファイルあたりのサイズ上限、1 デッキあたりの総容量上限を設定する。
- S3 キーは API 側で正規化し、`../` などのパストラバーサルを拒否する。
- OGP HTML 生成時はメタタグ値を HTML エスケープする。

## 14. パフォーマンス要件

- 初期表示で取得するのは manifest または一覧 API のみとする。
- 各スライド HTML は表示時に iframe で読み込む。
- 可能であれば前後 1 枚のスライドをプリロードする。
- manifest は CDN キャッシュ可能にする。
- manifest 更新時にキャッシュを制御できるよう、デプロイ時に cache invalidation または query versioning を利用できる設計にする。
- アップロードは複数ファイルを並列処理する。ただし同時アップロード数には上限を設ける。
- OGP HTML は edge または CDN で短時間キャッシュする。

## 15. アクセシビリティ要件

- ナビゲーションボタンはキーボード操作可能にする。
- ボタンには適切な `aria-label` を付与する。
- 現在位置はスクリーンリーダーで読み上げ可能にする。
- iframe には現在スライドタイトルを `title` 属性として設定する。
- フォーカス順序が破綻しないようにする。

## 16. 設定値

| 変数名 | 必須 | 環境 | 説明 |
| --- | --- | --- | --- |
| `VITE_SLIDES_DIR` | 開発のみ必須 | dev | ローカルスライド fixture ルートディレクトリ |
| `VITE_DEFAULT_DECK_ID` | 任意 | dev/prod | URL で deckId が指定されない場合のデフォルトデッキ ID |
| `VITE_S3_BUCKET_NAME` | 本番で必須 | prod | スライドを配置する S3 バケット名 |
| `VITE_S3_REGION` | 本番で必須 | prod | S3 リージョン |
| `VITE_S3_PREFIX` | 任意 | prod | バケット内プレフィックス |
| `VITE_S3_PUBLIC_BASE_URL` | 推奨 | prod | CloudFront などの公開ベース URL |
| `VITE_API_BASE_URL` | 任意 | prod | アップロード API のベース URL。同一オリジンの場合は未指定 |
| `UPLOAD_ADMIN_TOKEN` | 本番で必須 | server | アップロード API の簡易認可トークン |
| `UPLOAD_MAX_FILE_SIZE_MB` | 任意 | server | 1 ファイルあたりのアップロード上限 |
| `UPLOAD_MAX_DECK_SIZE_MB` | 任意 | server | 1 デッキあたりの総容量上限 |
| `OGP_DEFAULT_IMAGE_URL` | 推奨 | server | OGP 画像未指定時のデフォルト画像 |

## 17. 成功指標

- 開発環境で、指定ディレクトリ内の HTML ファイルが 1 秒以内に一覧表示される。
- 本番環境で、S3 上の manifest からスライド一覧を取得できる。
- ブラウザからスライド一式をアップロードし、S3 上に manifest と OGP メタデータが生成される。
- `01__タイトル.html` 形式のファイルが正しい順序とタイトルで表示される。
- URL を共有すると、同じスライドを直接開ける。
- Slack、Discord、X などで共有 URL の OGP が展開される。
- 主要ブラウザの最新版で基本操作が動作する。

## 18. 初期リリース範囲

### 18.1 Must

- Vite + React + TypeScript のアプリ基盤。
- ファイル名パーサー。
- dev server middleware によるローカルディレクトリ読み込み。
- S3 manifest 読み込み。
- 署名付き URL による S3 アップロード。
- アップロード前後のファイル検証。
- アップロード完了時の `manifest.json` と `ogp.json` 生成。
- OGP メタタグ付き HTML シェルの返却。
- iframe によるスライド表示。
- 前後移動。
- キーボード操作。
- `?slide=NN` による直接リンク。
- 基本的なエラー表示。
- パーサーとスライド取得処理の単体テスト。

### 18.2 Should

- スライド一覧パネル。
- 共有 URL コピー。
- 前後スライドのプリロード。
- OGP プレビュー UI。
- OGP 画像のアップロード。
- Playwright による E2E テスト。
- manifest 生成用 CLI スクリプト。

### 18.3 Could

- 複数デッキ対応。
- 発表者モード。
- フルスクリーン表示。
- テーマ切り替え。
- スライドごとのメタデータ拡張。
- スライド HTML のスクリーンショットから OGP 画像を自動生成する機能。
- アップロード履歴とロールバック。

## 19. 実装フェーズ案

### Phase 1: 基盤とドメイン

- Vite + React + TypeScript をセットアップする。
- `NN__ページタイトル.html` のパーサーを実装する。
- parser の Vitest を作成する。
- スライドメタデータ型を定義する。

### Phase 2: 開発環境読み込み

- Vite dev server middleware を実装する。
- `VITE_SLIDES_DIR` を読み取る。
- `/__slides/{deckId}` API を提供する。
- `/__slide-files/{deckId}/*` でローカル HTML とアセットを配信する。

### Phase 3: ビューア UI

- iframe ベースの SlideViewer を実装する。
- 前後移動、現在位置、タイトル表示を実装する。
- `?slide=NN` と状態を同期する。
- キーボード操作を実装する。

### Phase 4: 本番 S3 対応

- Amplify Hosting の static/compute 用ビルド出力を構成する。
- Hono server を Amplify Hosting compute で起動できるようにする。
- `manifest.json` 読み込みを実装する。
- S3/CloudFront の公開 URL 生成を実装する。
- 本番環境変数のバリデーションを実装する。
- CORS とキャッシュの運用手順をドキュメント化する。

### Phase 5: アップロード対応

- アップロード API を実装する。
- 署名付き PUT URL 発行を実装する。
- アップロード UI と進捗表示を実装する。
- アップロード完了時に manifest と deck metadata を生成する。
- 簡易認可とファイル検証を実装する。

### Phase 6: OGP 対応

- `ogp.json` 生成を実装する。
- OGP HTML シェル生成を実装する。
- デッキ共有 URL とスライド共有 URL の OGP を検証する。
- デフォルト OGP 画像を用意する。

### Phase 7: 仕上げ

- スライド一覧パネルを追加する。
- 共有 URL コピーを追加する。
- OGP プレビューを追加する。
- E2E テストを追加する。
- manifest 生成 CLI を追加する。

## 20. 未決定事項

- 複数デッキを初期段階から考慮した URL 設計にするか。
- スライド HTML 内の外部 JS 実行をどこまで許可するか。
- iframe sandbox を初期リリースから有効化するか。
- manifest を手動作成にするか、CLI で必ず生成する運用にするか。
- アップロード時の認可を管理用トークンで十分とするか、初期からユーザー認証を導入するか。
- OGP HTML 生成を Lambda@Edge、CloudFront Functions、通常の API のどれで実装するか。
- OGP 画像を手動指定に限定するか、自動スクリーンショット生成まで含めるか。
