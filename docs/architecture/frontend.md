# Frontend Design Doc

## 1. 目的

このドキュメントは SlideX のフロントエンド設計を定義する。

フロントエンドは Vite + React + TypeScript で実装し、ローカルまたは S3 上の HTML ファイル群をスライドデッキとして表示する。アップロード、スライド閲覧、共有 URL コピー、OGP プレビューを提供し、バックエンドとは Hono API 経由で通信する。

## 2. 前提

- アプリは Vite でビルドする。
- UI は React + TypeScript で実装する。
- スライド HTML は iframe で表示する。
- 開発環境では Vite middleware からローカルファイル一覧と静的ファイルを取得する。
- 本番環境では Amplify Hosting の static primitive で配信される。
- API は同一オリジンの `/api/*` を基本とする。
- 別オリジン運用が必要な場合のみ `VITE_API_BASE_URL` を利用する。

## 3. 技術選定

- Vite
  - dev server と build を担当する。
  - Amplify Hosting の static 出力へ組み込みやすい。
- React
  - ビューア、アップロード、一覧、ダイアログをコンポーネント化する。
- TypeScript
  - スライドメタデータ、API response、アップロード状態を型で管理する。
- CSS Modules または Vanilla CSS
  - 初期実装では小規模であるため、UI framework は導入しない。
- Vitest
  - ファイル名パーサー、URL 状態、API client のテストに利用する。
- Playwright
  - スライド閲覧、アップロード、OGP preview の E2E に利用する。

## 4. 画面構成

### 4.1 Deck Viewer

スライド閲覧のメイン画面。

表示要素:

- スライド iframe。
- 現在スライドタイトル。
- 現在位置。
- 前へ / 次へボタン。
- スライド一覧ボタン。
- 共有 URL コピー。
- アップロードボタン。

責務:

- manifest を取得する。
- URL の `slide` パラメータから現在スライドを決定する。
- iframe に対象 HTML を読み込む。
- キーボード操作を処理する。
- 現在スライド変更時に URL を更新する。

### 4.2 Slide List

デッキ内のスライド一覧。

表示要素:

- スライド番号。
- スライドタイトル。
- 選択中状態。
- 命名規則違反などの警告。

デスクトップではサイドパネル、モバイルではモーダルまたはドロワーとして表示する。

### 4.3 Upload Dialog

スライド一式をアップロードする画面。

表示要素:

- ファイルまたはディレクトリ選択。
- デッキ名入力。
- デッキ説明入力。
- OGP 画像選択。
- 検証結果。
- アップロード進捗。
- 完了後の共有 URL。

責務:

- 選択されたファイルをクライアント側で検証する。
- Hono API から署名付き URL を取得する。
- S3 へ直接 PUT する。
- アップロード完了を API に通知する。

### 4.4 OGP Preview

共有時の見え方を確認する簡易プレビュー。

表示要素:

- `og:title`。
- `og:description`。
- `og:image`。
- 共有 URL。

実際の SNS クローラー挙動を完全再現するものではなく、アップロード済み metadata の確認用途とする。

## 5. ルーティング

初期実装では React Router を導入せず、URL と `URLSearchParams` で状態を管理する。

主要 URL:

```text
/                         デフォルトデッキまたはアップロード画面
/deck/{deckId}            デッキ表示
/deck/{deckId}?slide=03   特定スライド表示
```

ブラウザアクセスでは Hono が OGP メタタグ付き HTML shell を返し、React アプリが起動後に同じ URL を解釈する。

## 6. 状態管理

グローバル状態管理ライブラリは初期導入しない。React hooks と小さな domain module で管理する。

主要 state:

- `deckId`
- `slides`
- `currentSlideOrder`
- `loadingState`
- `viewerError`
- `uploadState`
- `uploadProgress`
- `warnings`

状態遷移:

1. `idle`
2. `loadingManifest`
3. `ready`
4. `error`

アップロード状態:

1. `selecting`
2. `validating`
3. `requestingUploadUrls`
4. `uploading`
5. `completing`
6. `completed`
7. `failed`

## 7. データ取得

### 7.1 Manifest

開発環境:

```http
GET /__slides/{deckId}
```

本番環境:

```http
GET /api/decks/{deckId}/manifest
```

または公開 S3/CloudFront URL:

```http
GET {publicBaseUrl}/decks/{deckId}/manifest.json
```

初期実装では、API 経由の取得を優先する。S3 の公開構成を変えてもフロントエンドへの影響を小さくするため。

### 7.2 Upload

```http
POST /api/decks
POST /api/decks/{deckId}/uploads
PUT {signedUrl}
POST /api/decks/{deckId}/complete
```

S3 への PUT は API client ではなく upload service で扱い、進捗を UI に通知する。

## 8. ディレクトリ構成案

```text
src/
├── app/
│   ├── App.tsx
│   └── bootstrap.tsx
├── components/
│   ├── SlideViewer.tsx
│   ├── SlideControls.tsx
│   ├── SlideList.tsx
│   ├── UploadDialog.tsx
│   └── OgpPreview.tsx
├── data/
│   ├── apiClient.ts
│   ├── localSlideSource.ts
│   ├── s3ManifestSlideSource.ts
│   └── uploadClient.ts
├── domain/
│   ├── slideFile.ts
│   ├── slideManifest.ts
│   ├── uploadValidation.ts
│   └── urlState.ts
├── hooks/
│   ├── useDeck.ts
│   ├── useKeyboardNavigation.ts
│   └── useUpload.ts
└── styles/
    └── app.css
```

## 9. iframe 表示設計

- iframe の `src` は manifest/API で解決済みの URL を利用する。
- iframe の `title` は現在スライドタイトルにする。
- iframe の load/error を監視し、失敗時にエラー UI を表示する。
- スライド HTML の CSS/JS は iframe 内に閉じる。
- 初期実装では sandbox を強制しない。
- 外部ユーザーがアップロードした HTML を扱う段階では sandbox と別オリジン配信を再検討する。

## 10. アップロード検証

クライアント側で以下を検証する。

- `NN__ページタイトル.html` 形式の HTML が 1 件以上ある。
- 順序番号が重複していない。
- `index.html` がスライドとして含まれていない。
- 許可拡張子のみ含まれている。
- 1 ファイルサイズと総容量が上限内である。
- 空ファイルではない。

サーバー側でも同じ検証を行う。クライアント検証は UX 改善であり、信頼境界ではない。

## 11. エラー設計

ユーザーに表示するエラー:

- スライドが見つからない。
- manifest の取得に失敗した。
- iframe の読み込みに失敗した。
- アップロード対象ファイルが不正。
- 署名付き URL の取得に失敗した。
- S3 へのアップロードに失敗した。
- アップロード完了処理に失敗した。

API の詳細エラーは `code` と `message` を持つ形式に正規化し、UI では `message` を表示する。

## 12. テスト方針

単体テスト:

- ファイル名パーサー。
- URL state。
- upload validation。
- manifest parser。

コンポーネントテスト:

- SlideControls。
- SlideList。
- UploadDialog。

E2E:

- デッキを開く。
- `?slide=NN` で直接開く。
- キーボードで前後移動する。
- アップロードする。
- 完了後 URL を開く。

## 13. 未決定事項

- React Router を初期から導入するか。
- iframe sandbox を初期から有効にするか。
- OGP preview を Must にするか Should にするか。
- 複数デッキの一覧画面を初期リリースに含めるか。
