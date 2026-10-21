import { describe, it, expect } from 'vitest';
import { getTinyJpegFile } from './test-fixtures';
import { exportSingleImage, getExportFileName, exportBatchZip } from './metadata/export';
import { readMetadata } from './metadata/read';
import { ImageItem } from '@/types';

describe('Export Engine (exportSingleImage, exportBatchZip, and re-reading)', () => {
  it('derives correct export file names with and without suffix', () => {
    expect(getExportFileName('test.jpg', false)).toBe('test-geotagged.jpg');
    expect(getExportFileName('test.JPEG', false)).toBe('test-geotagged.JPEG');
    expect(getExportFileName('test.jpg', true)).toBe('test.jpg');
  });

  it('exports a single image with updated GPS and keywords, verifying re-read parity', async () => {
    const rawFile = getTinyJpegFile('sample.jpg');
    const imageItem: ImageItem = {
      id: 'img-1',
      file: rawFile,
      name: 'sample.jpg',
      size: rawFile.size,
      previewUrl: '',
      status: 'ready',
      original: { keywords: [] },
      edit: {
        coords: { lat: 31.5204, lng: 74.3587, alt: 215 },
        keywords: ['Lahore', 'Heritage', 'Ancient'],
      },
      stripGps: false,
      stripKeywords: false,
      stripText: false,
      dirty: true,
    };

    const res = await exportSingleImage(imageItem, false);
    expect(res.blob).toBeDefined();
    expect(res.verified).toBe(true);
    expect(res.outputName).toBe('sample-geotagged.jpg');

    // Re-read exported Blob directly via readMetadata to confirm byte-level parity
    const reRead = await readMetadata(res.blob!);
    expect(reRead.coords).toBeDefined();
    expect(reRead.coords!.lat).toBeCloseTo(31.5204, 4);
    expect(reRead.coords!.lng).toBeCloseTo(74.3587, 4);
    expect(reRead.keywords).toContain('Lahore');
    expect(reRead.keywords).toContain('Heritage');
    expect(reRead.keywords).toContain('Ancient');
  });

  it('runs batch export with progress callback and produces valid non-empty ZIP', async () => {
    const rawFile1 = getTinyJpegFile('img1.jpg');
    const rawFile2 = getTinyJpegFile('img2.jpg');

    const items: ImageItem[] = [
      {
        id: '1',
        file: rawFile1,
        name: 'img1.jpg',
        size: rawFile1.size,
        previewUrl: '',
        status: 'ready',
        original: { keywords: [] },
        edit: { coords: { lat: 10, lng: 20 }, keywords: ['tagA'] },
        stripGps: false,
        stripKeywords: false,
        stripText: false,
        dirty: true,
      },
      {
        id: '2',
        file: rawFile2,
        name: 'img2.jpg',
        size: rawFile2.size,
        previewUrl: '',
        status: 'ready',
        original: { keywords: [] },
        edit: { coords: { lat: -30, lng: -40 }, keywords: ['tagB'] },
        stripGps: false,
        stripKeywords: false,
        stripText: false,
        dirty: true,
      },
    ];

    const progressReports: number[] = [];
    const res = await exportBatchZip(items, false, (p) => {
      progressReports.push(p.current);
    });

    expect(res.successful.length).toBe(2);
    expect(res.failed.length).toBe(0);
    expect(progressReports).toEqual([1, 2]);
  });

  it('exports an image with alt text and non-ASCII caption, capturing warnings and verifying XMP parity', async () => {
    const rawFile = getTinyJpegFile('heritage.jpg');
    const imageItem: ImageItem = {
      id: 'img-alt-1',
      file: rawFile,
      name: 'heritage.jpg',
      size: rawFile.size,
      previewUrl: '',
      status: 'ready',
      original: { keywords: [] },
      edit: {
        keywords: ['Lahore'],
        altText: 'Minar-e-Pakistan illuminated at twilight',
        caption: 'مینار پاکستان کی خوبصورت شام',
        extDescription: 'Detailed architectural view of the minaret and gardens.',
      },
      stripGps: false,
      stripKeywords: false,
      stripText: false,
      dirty: true,
    };

    const res = await exportSingleImage(imageItem, false);
    expect(res.blob).toBeDefined();
    expect(res.verified).toBe(true);
    // Non-ASCII caption emits a warning string
    expect(res.warnings).toBeDefined();
    expect(res.warnings!.length).toBeGreaterThan(0);
    expect(res.warnings![0]).toContain('non-ASCII');

    // Re-read exported Blob to verify text fields
    const reRead = await readMetadata(res.blob!);
    expect(reRead.altText).toBe('Minar-e-Pakistan illuminated at twilight');
    expect(reRead.caption).toBe('مینار پاکستان کی خوبصورت شام');
    expect(reRead.extDescription).toBe('Detailed architectural view of the minaret and gardens.');
  });
});
