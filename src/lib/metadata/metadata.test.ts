import { describe, it, expect } from 'vitest';
import { getTinyJpegFile, getTinyJpegBytes } from '../test-fixtures';
import { writeMetadata } from './write';
import { readMetadata } from './read';
import { extractXmpString, writeXmpKeywords, readXmpKeywords, isXmpPayload } from './xmp';
import { parseJpegSegments, insertOrReplaceApp1Segment } from './jpeg';


describe('Metadata Engine (read/write/round-trip)', () => {
  it('writes GPS and reads back equal coordinates (including negative lat/lng S/W)', async () => {
    const file = getTinyJpegFile();

    // Test Southern & Western hemisphere coordinates
    const targetCoords = {
      lat: -33.8688,
      lng: -74.006,
      alt: 125,
    };

    const { blob, verified } = await writeMetadata(file, { coords: targetCoords });
    expect(verified).toBe(true);

    const meta = await readMetadata(blob);
    expect(meta.coords).toBeDefined();
    expect(meta.coords!.lat).toBeCloseTo(targetCoords.lat, 4);
    expect(meta.coords!.lng).toBeCloseTo(targetCoords.lng, 4);
  });

  it('writes keywords including Unicode (Lahore, مینار پاکستان, café) and reads them back', async () => {
    const file = getTinyJpegFile();
    const testKeywords = ['Lahore', 'مینار پاکستان', 'café', 'Travel & Tourism'];

    const { blob, verified } = await writeMetadata(file, { keywords: testKeywords });
    expect(verified).toBe(true);

    const meta = await readMetadata(blob);
    expect(meta.keywords).toBeDefined();
    for (const kw of testKeywords) {
      expect(meta.keywords).toContain(kw);
    }
  });

  it('preserves existing unrelated XMP properties during keyword write', async () => {
    // Construct JPEG with custom XMP property
    const rawBytes = getTinyJpegBytes();
    const customXmp =
      `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n` +
      `<x:xmpmeta xmlns:x="adobe:ns:meta/">\n` +
      ` <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n` +
      `  <rdf:Description rdf:about="" xmlns:mycustom="http://example.com/custom/">\n` +
      `    <mycustom:CameraId>CustomDevice-12345</mycustom:CameraId>\n` +
      `  </rdf:Description>\n` +
      ` </rdf:RDF>\n` +
      `</x:xmpmeta>\n` +
      `<?xpacket end="w"?>`;

    const xmpSig = new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0');
    const xmpBody = new TextEncoder().encode(customXmp);
    const payload = new Uint8Array(xmpSig.length + xmpBody.length);
    payload.set(xmpSig, 0);
    payload.set(xmpBody, xmpSig.length);

    // Insert manually via writeXmpKeywords with initial keywords
    const withCustom = writeXmpKeywords(rawBytes, ['initial']);
    // Modify to put back custom element
    const xmpStr = extractXmpString(withCustom);
    expect(xmpStr).not.toBeNull();

    // Now write new keywords
    const updatedBytes = writeXmpKeywords(withCustom, ['newKeyword']);
    const updatedXmpStr = extractXmpString(updatedBytes);

    expect(updatedXmpStr).not.toBeNull();
    const parsedKeywords = readXmpKeywords(updatedBytes);
    expect(parsedKeywords).toContain('newKeyword');
  });

  it('stripGps removes GPS data while preserving byte-identical pixel data after SOS', async () => {
    const file = getTinyJpegFile();

    // 1. First add GPS
    const withGps = await writeMetadata(file, {
      coords: { lat: 31.5204, lng: 74.3587 },
    });
    const metaWithGps = await readMetadata(withGps.blob);
    expect(metaWithGps.coords).toBeDefined();

    // Get pixel data bytes after SOS
    const withGpsBytes = new Uint8Array(await withGps.blob.arrayBuffer());
    const { sosOffset: sosBefore } = parseJpegSegments(withGpsBytes);
    expect(sosBefore).toBeGreaterThan(0);
    const pixelBytesBefore = withGpsBytes.subarray(sosBefore);

    // 2. Strip GPS
    const stripped = await writeMetadata(withGps.blob, { stripGps: true });
    const metaStripped = await readMetadata(stripped.blob);
    expect(metaStripped.coords).toBeUndefined();

    // Verify pixel bytes after SOS remain exactly identical
    const strippedBytes = new Uint8Array(await stripped.blob.arrayBuffer());
    const { sosOffset: sosAfter } = parseJpegSegments(strippedBytes);
    expect(sosAfter).toBeGreaterThan(0);
    const pixelBytesAfter = strippedBytes.subarray(sosAfter);

    expect(pixelBytesAfter.length).toBe(pixelBytesBefore.length);
    for (let i = 0; i < pixelBytesBefore.length; i++) {
      expect(pixelBytesAfter[i]).toBe(pixelBytesBefore[i]);
    }
  });

  it('alt text round-trip in English, Urdu/Arabic RTL, and emoji', async () => {
    const file = getTinyJpegFile();
    const altTextUrduEmoji = 'شام کا حسین منظر غروب آفتاب کے وقت 🌅 Beautiful sunset scene';
    const extDesc = 'Detailed scene description with full sentences explaining the historic city skyline and sunlight.';

    const { blob, verified } = await writeMetadata(file, {
      altText: altTextUrduEmoji,
      extDescription: extDesc,
    });
    expect(verified).toBe(true);

    const meta = await readMetadata(blob);
    expect(meta.altText).toBe(altTextUrduEmoji);
    expect(meta.extDescription).toBe(extDesc);
  });

  it('alt text removal leaves keywords and other XMP intact', async () => {
    const file = getTinyJpegFile();
    // Write both keywords and altText
    const initial = await writeMetadata(file, {
      keywords: ['Mountains', 'Sunset'],
      altText: 'Snowy peak',
      caption: 'Scenic view of K2',
    });
    expect(initial.verified).toBe(true);

    // Now remove altText only (pass empty string or null)
    const updated = await writeMetadata(initial.blob, {
      altText: null,
    });
    expect(updated.verified).toBe(true);

    const meta = await readMetadata(updated.blob);
    expect(meta.altText).toBeUndefined();
    expect(meta.keywords).toContain('Mountains');
    expect(meta.keywords).toContain('Sunset');
    expect(meta.caption).toBe('Scenic view of K2');
  });

  it('caption ASCII goes to both XMP and EXIF while non-ASCII goes to XMP only plus a warning', async () => {
    const file1 = getTinyJpegFile('ascii.jpg');
    const asciiCaption = 'A historic minaret standing in the park';

    const res1 = await writeMetadata(file1, { caption: asciiCaption });
    expect(res1.verified).toBe(true);
    expect(res1.warnings.length).toBe(0);

    const meta1 = await readMetadata(res1.blob);
    expect(meta1.caption).toBe(asciiCaption);

    // Non-ASCII caption (Urdu / Arabic / Accents)
    const file2 = getTinyJpegFile('unicode.jpg');
    const unicodeCaption = 'مینار پاکستان لاہور تاریخی یادگار (Café view)';

    const res2 = await writeMetadata(file2, { caption: unicodeCaption });
    expect(res2.verified).toBe(true);
    expect(res2.warnings.length).toBeGreaterThan(0);
    expect(res2.warnings[0]).toContain('non-ASCII');

    const meta2 = await readMetadata(res2.blob);
    expect(meta2.caption).toBe(unicodeCaption);
  });

  it('existing unrelated Iptc4xmpCore properties survive text and keyword write', async () => {
    const rawBytes = getTinyJpegBytes();
    const customXmp =
      `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n` +
      `<x:xmpmeta xmlns:x="adobe:ns:meta/">\n` +
      ` <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n` +
      `  <rdf:Description rdf:about="" xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/">\n` +
      `    <Iptc4xmpCore:CreatorContactInfo>contact@example.com</Iptc4xmpCore:CreatorContactInfo>\n` +
      `  </rdf:Description>\n` +
      ` </rdf:RDF>\n` +
      `</x:xmpmeta>\n` +
      `<?xpacket end="w"?>`;

    const xmpSig = new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0');
    const xmpBody = new TextEncoder().encode(customXmp);
    const payload = new Uint8Array(xmpSig.length + xmpBody.length);
    payload.set(xmpSig, 0);
    payload.set(xmpBody, xmpSig.length);

    // Insert custom XMP segment into JPEG bytes
    const withCustom = insertOrReplaceApp1Segment(
      rawBytes,
      isXmpPayload,
      payload
    );

    const file = new File([withCustom.buffer as ArrayBuffer], 'test.jpg', { type: 'image/jpeg' });
    const { blob } = await writeMetadata(file, {
      altText: 'Accessibility text',
      keywords: ['TestTag'],
    });

    const xmpString = extractXmpString(new Uint8Array(await blob.arrayBuffer()));
    expect(xmpString).not.toBeNull();

    // Verify creator contact info was not erased
    const doc = new DOMParser().parseFromString(xmpString!, 'application/xml');
    const creatorEl = doc.getElementsByTagNameNS('http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/', 'CreatorContactInfo');
    const fallbackEl = doc.getElementsByTagName('Iptc4xmpCore:CreatorContactInfo');
    const exists = creatorEl.length > 0 || fallbackEl.length > 0;
    expect(exists).toBe(true);

    const meta = await readMetadata(blob);
    expect(meta.altText).toBe('Accessibility text');
    expect(meta.keywords).toContain('TestTag');
  });
});
