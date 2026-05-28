export type ParsedSlideFile = {
  order: number;
  orderText: string;
  title: string;
  fileName: string;
};

const SLIDE_FILE_PATTERN = /^(\d{2,})__(.+)\.html$/;

export function parseSlideFileName(fileName: string): ParsedSlideFile | null {
  const baseName = fileName.split("/").pop() ?? fileName;

  if (baseName === "index.html") {
    return null;
  }

  const match = SLIDE_FILE_PATTERN.exec(baseName);
  if (!match) {
    return null;
  }

  const [, orderText, rawTitle] = match;
  return {
    order: Number(orderText),
    orderText,
    title: decodeTitle(rawTitle),
    fileName
  };
}

function decodeTitle(rawTitle: string) {
  try {
    return decodeURIComponent(rawTitle);
  } catch {
    return rawTitle;
  }
}
