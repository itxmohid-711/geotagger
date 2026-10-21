declare module 'piexifjs' {
  export interface ExifDict {
    '0th'?: Record<number, unknown>;
    Exif?: Record<number, unknown>;
    GPS?: Record<number, unknown>;
    Interop?: Record<number, unknown>;
    '1st'?: Record<number, unknown>;
    thumbnail?: string | null;
  }

  export const ImageIFD: {
    XPTitle: number;
    XPComment: number;
    XPAuthor: number;
    XPKeywords: number;
    XPSubject: number;
    [key: string]: number;
  };

  export const ExifIFD: {
    DateTimeOriginal: number;
    [key: string]: number;
  };

  export const GPSIFD: {
    GPSVersionID: number;
    GPSLatitudeRef: number;
    GPSLatitude: number;
    GPSLongitudeRef: number;
    GPSLongitude: number;
    GPSAltitudeRef: number;
    GPSAltitude: number;
    [key: string]: number;
  };

  export const InteropIFD: Record<string, number>;

  export function load(jpegData: string): ExifDict;
  export function dump(exifDict: ExifDict): string;
  export function insert(exifBinary: string, jpegBinary: string): string;
  export function remove(jpegBinary: string): string;

  const piexif: {
    load: typeof load;
    dump: typeof dump;
    insert: typeof insert;
    remove: typeof remove;
    ImageIFD: typeof ImageIFD;
    ExifIFD: typeof ExifIFD;
    GPSIFD: typeof GPSIFD;
    InteropIFD: typeof InteropIFD;
  };

  export default piexif;
}
