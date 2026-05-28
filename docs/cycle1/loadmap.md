# Cycle 1 Loadmap

## Scope Decisions

- Presentation viewer controls are intentionally out of scope for this cycle.
  - Do not add previous/next buttons, slide list controls, share copy controls, or upload entry points to the presentation screen.
- Slide HTML files are self-contained.
  - Asset delivery for images, CSS, JavaScript, fonts, or other referenced files is out of scope.
  - Relative asset path support inside uploaded slide HTML is not required.
- S3 PUT upload can remain sequential for now.
  - Parallel upload and concurrency limits are not required in this cycle.
- Malformed slide file structure must be treated as a blocking error.
  - Do not downgrade slide structure problems to warnings.

## Implementation Plan

### 1. Align Manifest and OGP Generation

- Read optional uploaded `deck.json` or `metadata.json` during completion.
- Normalize deck metadata into `deck.json`, `manifest.json`, and `ogp.json`.
- Apply metadata precedence consistently:
  - Request body metadata.
  - Uploaded `deck.json` or `metadata.json`.
  - Generated fallback values.
- Prefer absolute OGP image URLs for crawler compatibility.
- Use `OGP_DEFAULT_IMAGE_URL` when no valid deck-level OGP image is provided.
- Keep generated slide URLs focused on self-contained HTML files.

### 2. Simplify Upload File Scope

- Restrict upload validation to the cycle scope:
  - Valid slide HTML files.
  - Optional `deck.json`.
  - Optional `metadata.json`.
- Remove or disable support for uploaded image, CSS, JavaScript, font, map, and miscellaneous asset files.
- Keep direct S3 PUT upload sequential.
- Ensure frontend and backend extension allowlists match.

### 3. Make Slide Structure Errors Blocking

- Treat these cases as invalid deck errors:
  - No valid slide HTML files.
  - Any `.html` file not matching `NN__title.html`.
  - Any `index.html`.
  - Duplicate slide order numbers.
  - Invalid or incomplete manifest slide entries.
- Stop generating a manifest when the slide deck is structurally invalid.
- Show all validation errors to the uploader instead of failing at the first error where practical.

## Error Design

Introduce a shared deck validation shape at the domain boundary.

```ts
type SlideDeckValidationError = {
  code:
    | "NO_SLIDES"
    | "INVALID_SLIDE_FILENAME"
    | "RESERVED_INDEX_HTML"
    | "DUPLICATE_SLIDE_ORDER"
    | "INVALID_METADATA"
    | "UNSUPPORTED_FILE_TYPE";
  message: string;
  fileName?: string;
};
```

Backend API behavior:

- Return `400 INVALID_SLIDE_DECK` for structural deck errors.
- Include all collected validation errors in `error.details`.
- Keep path traversal, oversized files, and authorization errors as separate security or request validation errors.

Frontend behavior:

- Run the same structural checks before upload.
- Disable upload if any structural error exists.
- Render all validation errors with file names where available.
- Treat remote manifest normalization errors as a viewer-level error state.

## Verification

- Add unit tests for successful self-contained HTML decks.
- Add unit tests for invalid `.html` names, `index.html`, duplicate orders, and zero-slide uploads.
- Add unit tests for metadata precedence and OGP fallback behavior.
- Add backend route tests for `400 INVALID_SLIDE_DECK` details.
- Run:

```sh
mise run test
mise run typecheck
```
