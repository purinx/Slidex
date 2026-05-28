# SlideX Format Reference

## Required Files

Create one self-contained HTML document per slide:

```text
01__Intro.html
02__Problem.html
03__Proposal.html
```

Rules:

- Prefix must be 2 or more half-width digits.
- Separator must be exactly `__`.
- Extension must be exactly `.html`.
- `index.html` is reserved and invalid.
- Duplicate numeric prefixes are invalid.
- Any malformed `.html` file makes the deck invalid.
- Uploaded non-slide files are out of scope except optional `deck.json` or `metadata.json`.

## Optional Metadata

Use either `deck.json` or `metadata.json`:

```json
{
  "title": "Product Intro",
  "description": "A short share description.",
  "defaultOgImage": "https://example.com/og/product-intro.png"
}
```

Prefer an absolute URL for `defaultOgImage`. Do not create local image assets just for OGP unless the app implementation is changed to support them.

## HTML Starter Pattern

Use this as a compact starting point and adjust visual design for the deck topic:

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Slide title</title>
    <style>
      :root {
        color: #172033;
        background: #f7f9fc;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
      }

      .slide {
        display: grid;
        min-height: 100vh;
        padding: clamp(32px, 6vw, 88px);
        align-content: center;
        gap: 28px;
      }

      h1 {
        margin: 0;
        max-width: 980px;
        font-size: clamp(44px, 7vw, 92px);
        line-height: 1.02;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        max-width: 760px;
        color: #526173;
        font-size: clamp(20px, 2.5vw, 32px);
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <main class="slide">
      <h1>Slide title</h1>
      <p>Concise supporting message.</p>
    </main>
  </body>
</html>
```

## Content Patterns

- Title slide: one clear deck title and short context line.
- Problem slide: 2-3 crisp points with a strong hierarchy.
- Process slide: use a horizontal or vertical CSS grid, not external diagrams.
- Comparison slide: use a table or two-column layout.
- Summary slide: include the decision, recommendation, or next action.

## Avoid

- External local assets such as `assets/logo.png`, `style.css`, or `script.js`.
- Oversized text that clips on mobile or smaller projected screens.
- Negative letter spacing.
- JavaScript-only rendering for core slide content.
- Host-app-specific assumptions such as global CSS variables or parent DOM access.
