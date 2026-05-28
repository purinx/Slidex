---
name: slidex-slide-builder
description: Create or revise SlideX-compatible HTML slide decks for this repository. Use when Codex needs to generate slides for the SlideX app, convert outlines or notes into SlideX slide files, validate slide filenames and structure, or produce self-contained `NN__title.html` files plus optional `deck.json` or `metadata.json` metadata.
---

# SlideX Slide Builder

## Overview

Create self-contained HTML slide decks that can be loaded by SlideX without extra asset delivery. Each slide is a complete HTML document named with SlideX's required `NN__title.html` convention.

Read `references/slidex-format.md` when you need exact file rules, metadata examples, or an HTML starter pattern.

## Workflow

1. Decide the output directory.
   - Use the user's requested directory if provided.
   - For local preview in this repo, default to `frontend/slides`.
2. Create one complete `.html` file per slide.
   - Name files `01__Title.html`, `02__Next.html`, etc.
   - Use 2+ digit numeric prefixes and keep prefixes unique.
   - Do not create `index.html`.
3. Keep slides self-contained.
   - Inline CSS in a `<style>` tag.
   - Inline small diagrams with HTML/CSS or SVG inside the HTML.
   - Do not reference local images, CSS, JS, fonts, or other asset files.
   - Avoid CDN dependencies unless the user explicitly asks for them.
4. Add optional metadata only when useful.
   - Use `deck.json` or `metadata.json` for title, description, and default OGP image.
   - Prefer an absolute external URL for `defaultOgImage`.
5. Validate before finishing.
   - Ensure at least one valid slide file exists.
   - Ensure every `.html` file is a valid SlideX slide file.
   - Ensure there are no duplicate numeric prefixes.
   - Mention how to preview with the app if applicable.

## Slide Design Rules

- Design for an iframe that fills the browser viewport.
- Use `min-height: 100vh` and a stable layout so the slide scales cleanly.
- Keep text readable at common projector and laptop sizes.
- Avoid relying on host app CSS; each slide must define its own styles.
- Prefer semantic HTML and simple class names.
- Use `lang="ja"` for Japanese decks unless the content is primarily another language.
- Escape HTML-sensitive characters in generated copy where needed.

## Validation Checklist

Before final response, check:

- File names match `^\d{2,}__.+\.html$`.
- No `.htm` files were created.
- No `index.html` file exists in the deck directory.
- No non-metadata asset files were created for the deck.
- All slides include `<!doctype html>`, `<html>`, `<head>`, and `<body>`.
- Each slide has a meaningful `<title>`.
- Prefixes sort in the intended presentation order.

## Useful Commands

List generated deck files:

```sh
rg --files frontend/slides
```

Run frontend preview from the repo root:

```sh
mise run dev:frontend
```

Open the presentation at `http://127.0.0.1:5173/`.
