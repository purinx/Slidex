import fs from "node:fs/promises";
import path from "node:path";

export async function readAppHtml(frontendDistDir: string) {
  try {
    return await fs.readFile(path.join(frontendDistDir, "index.html"), "utf8");
  } catch {
    return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SlideX</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
  }
}

export async function readStaticAsset(frontendDistDir: string, relativePath: string) {
  const absolutePath = path.resolve(frontendDistDir, relativePath);
  const root = path.resolve(frontendDistDir);

  if (!absolutePath.startsWith(root + path.sep)) {
    return undefined;
  }

  try {
    return await fs.readFile(absolutePath);
  } catch {
    return undefined;
  }
}
