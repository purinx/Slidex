export type Slide = {
  order: number;
  orderText: string;
  title: string;
  fileName: string;
  url: string;
  ogImage?: string;
};

export type SlideWarning = {
  code: string;
  message: string;
  fileName?: string;
};

export type SlideManifest = {
  deckId?: string;
  title: string;
  description?: string;
  ogImage?: string;
  slides: Slide[];
  warnings: SlideWarning[];
  source: "local" | "api" | "s3";
};

export type DeckSummary = {
  deckId: string;
  title: string;
  description?: string;
  ogImage?: string;
  slideCount: number;
  warnings?: SlideWarning[];
};

export type RemoteManifest = {
  deckId?: string;
  title?: string;
  description?: string;
  ogImage?: string;
  slides?: Array<{
    order?: number;
    title?: string;
    fileName: string;
    url?: string;
    ogImage?: string;
  }>;
  warnings?: SlideWarning[];
};
