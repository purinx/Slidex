export const DECK_OG_IMAGE_PATH = "og/deck.svg";

export function renderDeckOgImageSvg(input: {
  deckTitle: string;
  description?: string;
  metadataLine?: string;
}) {
  const deckTitle = input.deckTitle;
  const description = input.description ? escapeXml(input.description) : undefined;
  const metadataLine = input.metadataLine ? escapeXml(input.metadataLine) : undefined;
  const titleLayout = layoutSvgTitle(deckTitle);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(deckTitle)}">
  <rect width="1200" height="630" fill="#ffffff"/>
  <text x="600" y="${titleLayout.y}" fill="#162033" text-anchor="middle" dominant-baseline="middle" font-family="Inter, system-ui, sans-serif" font-size="${titleLayout.fontSize}" font-weight="850">
    ${titleLayout.lines.map((line, index) => `<tspan x="600" dy="${index === 0 ? 0 : titleLayout.lineHeight}">${escapeXml(line)}</tspan>`).join("")}
  </text>
  ${metadataLine ? `<text x="600" y="418" fill="#526173" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="34" font-weight="750">${metadataLine}</text>` : ""}
  ${
    description
      ? `<text x="40" y="522" fill="#526173" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="700">
    ${wrapSvgText(description, 40, 522, 900, 42, 1)}
  </text>`
      : ""
  }
  <text x="1160" y="582" fill="#174ea6" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="850">HTML slide deck</text>
</svg>`;
}

function layoutSvgTitle(text: string) {
  const maxWidth = 1000;
  const maxFontSize = 116;
  const minSingleLineFontSize = 74;
  const oneLineSize = Math.min(maxFontSize, Math.floor(maxWidth / estimateTextUnits(text)));

  if (oneLineSize >= minSingleLineFontSize) {
    return {
      fontSize: oneLineSize,
      lineHeight: oneLineSize * 1.04,
      lines: [text],
      y: 315
    };
  }

  const lines = splitTitleLines(text, 2);
  const longestLineUnits = Math.max(...lines.map(estimateTextUnits));
  const fontSize = Math.max(56, Math.min(92, Math.floor(maxWidth / longestLineUnits)));

  return {
    fontSize,
    lineHeight: fontSize * 1.04,
    lines,
    y: 315 - (lines.length - 1) * fontSize * 0.52
  };
}

function splitTitleLines(text: string, maxLines: number) {
  const lines: string[] = [];
  let rest = text.trim();

  while (rest.length > 0 && lines.length < maxLines) {
    if (lines.length === maxLines - 1) {
      lines.push(rest);
      break;
    }

    const targetUnits = estimateTextUnits(rest) / (maxLines - lines.length);
    let take = 0;
    let units = 0;

    for (const char of rest) {
      units += estimateCharUnits(char);
      take += char.length;
      if (units >= targetUnits) {
        break;
      }
    }

    const slice = rest.slice(0, take);
    const breakAt = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("　"), slice.lastIndexOf("-"));
    const splitAt = breakAt > slice.length * 0.45 ? breakAt + (slice[breakAt] === "-" ? 1 : 0) : take;
    lines.push(rest.slice(0, splitAt).trim());
    rest = rest.slice(splitAt).trim();
  }

  return lines.filter(Boolean);
}

function estimateTextUnits(text: string) {
  return Array.from(text).reduce((total, char) => total + estimateCharUnits(char), 0) || 1;
}

function estimateCharUnits(char: string) {
  if (/\s/.test(char)) return 0.35;
  if (/[\u3000-\u9fff\uff00-\uffef]/.test(char)) return 1;
  if (/[ilI.,'|]/.test(char)) return 0.32;
  if (/[mwMW@#%&]/.test(char)) return 0.9;
  return 0.58;
}

function wrapSvgText(text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const charsPerLine = Math.max(1, Math.floor(maxWidth / 44));
  const lines: string[] = [];
  let rest = text;

  while (rest.length > 0 && lines.length < maxLines) {
    if (rest.length <= charsPerLine) {
      lines.push(rest);
      break;
    }

    const slice = rest.slice(0, charsPerLine);
    const breakAt = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("　"));
    const take = breakAt > charsPerLine * 0.45 ? breakAt : charsPerLine;
    lines.push(rest.slice(0, take).trim());
    rest = rest.slice(take).trim();
  }

  if (rest.length > 0 && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.…]+$/, "")}...`;
  }

  return lines
    .map((line, index) => `<tspan x="${x}" y="${y + index * lineHeight}">${line}</tspan>`)
    .join("");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
