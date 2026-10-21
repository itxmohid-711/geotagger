export interface Coordinates {
  lat: number;
  lng: number;
  alt?: number;
}

export interface ImageMeta {
  coords?: Coordinates;
  keywords: string[];
  dateTaken?: string;
  altText?: string;
  caption?: string;
  extDescription?: string;
}

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  status: 'loading' | 'ready' | 'unsupported' | 'error';
  error?: string;
  original: ImageMeta;
  edit: ImageMeta;
  stripGps: boolean;
  stripKeywords: boolean;
  stripText: boolean;
  dirty: boolean;
}

export type KeywordMode = 'add' | 'replace';
export type TextMode = 'fill-empty' | 'overwrite';
