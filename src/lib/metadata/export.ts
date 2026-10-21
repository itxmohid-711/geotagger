import { zipSync, AsyncZippable } from 'fflate';
import { ImageItem } from '@/types';
import { writeMetadata, WriteMetadataResult } from './write';

export interface ExportProgress {
  current: number;
  total: number;
  currentFileName: string;
}

export interface ExportFileResult {
  id: string;
  name: string;
  outputName: string;
  blob?: Blob;
  verified: boolean;
  warnings?: string[];
  error?: string;
}

export interface ExportBatchResult {
  successful: ExportFileResult[];
  failed: ExportFileResult[];
}

/**
 * Derives export file name.
 */
export function getExportFileName(originalName: string, keepOriginalName: boolean): string {
  if (keepOriginalName) return originalName;
  const lastDot = originalName.lastIndexOf('.');
  if (lastDot === -1) return `${originalName}-geotagged.jpg`;
  const base = originalName.slice(0, lastDot);
  const ext = originalName.slice(lastDot);
  return `${base}-geotagged${ext}`;
}

/**
 * Downloads a single Blob via a temporary link and revokes URL immediately after click.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!URL.createObjectURL) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Yield before revoking
  setTimeout(() => {
    if (URL.revokeObjectURL) URL.revokeObjectURL(url);
  }, 1500);
}

/**
 * Processes a single ImageItem into an exported Blob with updated EXIF/XMP metadata.
 */
export async function exportSingleImage(
  item: ImageItem,
  keepOriginalName = false
): Promise<ExportFileResult> {
  const outputName = getExportFileName(item.name, keepOriginalName);

  try {
    const writeRes: WriteMetadataResult = await writeMetadata(item.file, {
      coords: item.stripGps ? null : item.edit.coords,
      keywords: item.stripKeywords ? [] : item.edit.keywords,
      altText: item.stripText ? null : item.edit.altText,
      caption: item.stripText ? null : item.edit.caption,
      extDescription: item.stripText ? null : item.edit.extDescription,
      stripGps: item.stripGps,
      stripKeywords: item.stripKeywords,
      stripText: item.stripText,
    });

    return {
      id: item.id,
      name: item.name,
      outputName,
      blob: writeRes.blob,
      verified: writeRes.verified,
      warnings: writeRes.warnings,
    };
  } catch (err) {
    return {
      id: item.id,
      name: item.name,
      outputName,
      verified: false,
      error: err instanceof Error ? err.message : 'Export failed',
    };
  }
}

/**
 * Processes multiple items sequentially, yielding to the UI event loop between files.
 * Packages successful files into a ZIP using fflate (store mode, level: 0 for JPEG).
 */
export async function exportBatchZip(
  items: ImageItem[],
  keepOriginalName: boolean,
  onProgress?: (p: ExportProgress) => void
): Promise<ExportBatchResult> {
  const successful: ExportFileResult[] = [];
  const failed: ExportFileResult[] = [];
  const zippable: AsyncZippable = {};

  const total = items.length;

  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        currentFileName: item.name,
      });
    }

    // Yield to the UI event loop so browser never freezes
    await new Promise((resolve) => setTimeout(resolve, 0));

    const result = await exportSingleImage(item, keepOriginalName);

    if (result.blob) {
      successful.push(result);
      const buffer = await result.blob.arrayBuffer();
      // fflate level: 0 is STORE mode (no recompression on already-compressed JPEGs)
      zippable[result.outputName] = [new Uint8Array(buffer), { level: 0 }];
    } else {
      failed.push(result);
    }
  }

  if (successful.length > 0) {
    const zippedBytes = zipSync(zippable);
    const zipBlob = new Blob([zippedBytes.buffer as ArrayBuffer], { type: 'application/zip' });
    triggerFileDownload(zipBlob, `geotagged-photos-${Date.now()}.zip`);
  }

  return { successful, failed };
}

/**
 * Progressive enhancement: Saves files directly into a user-selected folder
 * using window.showDirectoryPicker (supported in Chromium browsers).
 */
export async function exportToDirectory(
  items: ImageItem[],
  keepOriginalName: boolean,
  onProgress?: (p: ExportProgress) => void
): Promise<ExportBatchResult> {
  // @ts-expect-error showDirectoryPicker is a standard Web API in Chromium
  const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  const successful: ExportFileResult[] = [];
  const failed: ExportFileResult[] = [];

  const total = items.length;

  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        currentFileName: item.name,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 0));

    const result = await exportSingleImage(item, keepOriginalName);

    if (result.blob) {
      try {
        const fileHandle = await dirHandle.getFileHandle(result.outputName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(result.blob);
        await writable.close();
        successful.push(result);
      } catch (err) {
        failed.push({
          ...result,
          error: err instanceof Error ? err.message : 'Failed to write to folder',
        });
      }
    } else {
      failed.push(result);
    }
  }

  return { successful, failed };
}
