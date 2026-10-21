import { insertOrReplaceApp1Segment, parseJpegSegments } from './jpeg';

export const XMP_APP1_SIGNATURE = 'http://ns.adobe.com/xap/1.0/\0';
const XMP_SIG_BYTES = new TextEncoder().encode(XMP_APP1_SIGNATURE);

export const IPTC4XMPCORE_NS = 'http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/';
export const DC_NS = 'http://purl.org/dc/elements/1.1/';
export const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
export const XML_NS = 'http://www.w3.org/XML/1998/namespace';

export interface XmpTextOptions {
  altText?: string | null;
  caption?: string | null;
  extDescription?: string | null;
}

export interface XmpMetadataOptions {
  keywords?: string[] | null;
  text?: XmpTextOptions;
}

/**
 * Text validation and normalization helpers:
 * - trim
 * - collapse repeated whitespace
 * - max 1,000 characters for alt text and caption
 * - max 5,000 characters for extended description
 */
export function normalizeAltText(text?: string | null): string | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const collapsed = text.trim().replace(/\s+/g, ' ');
  if (!collapsed) return undefined;
  return collapsed.length > 1000 ? collapsed.slice(0, 1000) : collapsed;
}

export function normalizeCaption(text?: string | null): string | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const collapsed = text.trim().replace(/\s+/g, ' ');
  if (!collapsed) return undefined;
  return collapsed.length > 1000 ? collapsed.slice(0, 1000) : collapsed;
}

export function normalizeExtDescription(text?: string | null): string | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const collapsed = text.trim().replace(/\s+/g, ' ');
  if (!collapsed) return undefined;
  return collapsed.length > 5000 ? collapsed.slice(0, 5000) : collapsed;
}

/**
 * Checks if a string is pure ASCII (characters 0 to 127).
 */
export function isPureAscii(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 127) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if an APP1 payload starts with the standard XMP signature.
 */
export function isXmpPayload(payload: Uint8Array): boolean {
  if (payload.length < XMP_SIG_BYTES.length) return false;
  for (let i = 0; i < XMP_SIG_BYTES.length; i++) {
    if (payload[i] !== XMP_SIG_BYTES[i]) return false;
  }
  return true;
}

/**
 * Extracts the raw XMP XML string from JPEG bytes if present.
 */
export function extractXmpString(jpegBytes: Uint8Array): string | null {
  const { segments } = parseJpegSegments(jpegBytes);
  for (const seg of segments) {
    if (seg.marker === 0xe1) {
      const payload = jpegBytes.subarray(
        seg.payloadStart,
        seg.payloadStart + seg.payloadLength
      );
      if (isXmpPayload(payload)) {
        const xmpBytes = payload.subarray(XMP_SIG_BYTES.length);
        return new TextDecoder('utf-8').decode(xmpBytes);
      }
    }
  }
  return null;
}

/**
 * Helper to extract text from an rdf:Alt element or direct text node.
 * Handles both plain values and rdf:Alt language alternatives (prefers x-default, else first entry).
 */
function extractAltTextFromElement(el: Element): string | undefined {
  // Check for child rdf:Alt
  const altEl =
    el.getElementsByTagNameNS(RDF_NS, 'Alt')[0] ||
    el.getElementsByTagName('rdf:Alt')[0];

  if (altEl) {
    const liItems = Array.from(
      altEl.getElementsByTagNameNS(RDF_NS, 'li')
    ).concat(Array.from(altEl.getElementsByTagName('rdf:li')));

    if (liItems.length > 0) {
      // Find x-default
      const defaultLi = liItems.find(
        (li) =>
          li.getAttribute('xml:lang')?.toLowerCase() === 'x-default' ||
          li.getAttributeNS(XML_NS, 'lang')?.toLowerCase() === 'x-default'
      );
      const chosen = defaultLi || liItems[0];
      const text = chosen.textContent?.trim();
      return text || undefined;
    }
  }

  // Fallback to direct text content
  const directText = el.textContent?.trim();
  return directText || undefined;
}

/**
 * Reads XMP text fields: AltTextAccessibility, caption (dc:description), and ExtDescrAccessibility.
 */
export function readXmpText(jpegBytes: Uint8Array): {
  altText?: string;
  caption?: string;
  extDescription?: string;
} {
  const xmpStr = extractXmpString(jpegBytes);
  if (!xmpStr) return {};

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmpStr, 'application/xml');

    let altText: string | undefined;
    let caption: string | undefined;
    let extDescription: string | undefined;

    // AltTextAccessibility
    const altEls = Array.from(doc.getElementsByTagNameNS(IPTC4XMPCORE_NS, 'AltTextAccessibility')).concat(
      Array.from(doc.getElementsByTagName('Iptc4xmpCore:AltTextAccessibility'))
    );
    if (altEls.length > 0) {
      altText = extractAltTextFromElement(altEls[0]);
    }

    // ExtDescrAccessibility
    const extEls = Array.from(doc.getElementsByTagNameNS(IPTC4XMPCORE_NS, 'ExtDescrAccessibility')).concat(
      Array.from(doc.getElementsByTagName('Iptc4xmpCore:ExtDescrAccessibility'))
    );
    if (extEls.length > 0) {
      extDescription = extractAltTextFromElement(extEls[0]);
    }

    // dc:description
    const descEls = Array.from(doc.getElementsByTagNameNS(DC_NS, 'description')).concat(
      Array.from(doc.getElementsByTagName('dc:description'))
    );
    if (descEls.length > 0) {
      caption = extractAltTextFromElement(descEls[0]);
    }

    return { altText, caption, extDescription };
  } catch {
    return {};
  }
}

/**
 * Reads keywords from XMP dc:subject rdf:Bag items.
 */
export function readXmpKeywords(jpegBytes: Uint8Array): string[] {
  const xmpStr = extractXmpString(jpegBytes);
  if (!xmpStr) return [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmpStr, 'application/xml');

    const subjects = doc.getElementsByTagNameNS(DC_NS, 'subject');
    const keywords: string[] = [];

    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      const bagElements = subject.getElementsByTagNameNS(RDF_NS, 'Bag');
      for (let j = 0; j < bagElements.length; j++) {
        const bag = bagElements[j];
        const liElements = bag.getElementsByTagNameNS(RDF_NS, 'li');
        for (let k = 0; k < liElements.length; k++) {
          const text = liElements[k].textContent?.trim();
          if (text) {
            keywords.push(text);
          }
        }
      }
      const plainLi = subject.getElementsByTagName('rdf:li');
      for (let k = 0; k < plainLi.length; k++) {
        const text = plainLi[k].textContent?.trim();
        if (text && !keywords.includes(text)) {
          keywords.push(text);
        }
      }
    }

    return keywords;
  } catch {
    return [];
  }
}

/**
 * XML escape helper supporting full Unicode and RTL.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Creates an rdf:Alt XML snippet with xml:lang="x-default".
 */
function formatRdfAlt(nsPrefix: string, propName: string, value: string): string {
  return (
    `    <${nsPrefix}:${propName}>\n` +
    `     <rdf:Alt>\n` +
    `      <rdf:li xml:lang="x-default">${escapeXml(value)}</rdf:li>\n` +
    `     </rdf:Alt>\n` +
    `    </${nsPrefix}:${propName}>`
  );
}

/**
 * Creates a minimal valid XMP packet containing dc:subject and/or accessibility text properties.
 */
function createMinimalXmpPacket(opts: XmpMetadataOptions): string {
  const parts: string[] = [];

  if (opts.keywords && opts.keywords.length > 0) {
    const bagItems = opts.keywords
      .map((k) => `      <rdf:li>${escapeXml(k)}</rdf:li>`)
      .join('\n');
    parts.push(
      `    <dc:subject>\n     <rdf:Bag>\n${bagItems}\n     </rdf:Bag>\n    </dc:subject>`
    );
  }

  if (opts.text?.caption) {
    parts.push(formatRdfAlt('dc', 'description', opts.text.caption));
  }

  if (opts.text?.altText) {
    parts.push(formatRdfAlt('Iptc4xmpCore', 'AltTextAccessibility', opts.text.altText));
  }

  if (opts.text?.extDescription) {
    parts.push(formatRdfAlt('Iptc4xmpCore', 'ExtDescrAccessibility', opts.text.extDescription));
  }

  const innerXml = parts.join('\n');

  return (
    `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">\n` +
    ` <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n` +
    `  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/">\n` +
    `${innerXml ? innerXml + '\n' : ''}` +
    `  </rdf:Description>\n` +
    ` </rdf:RDF>\n` +
    `</x:xmpmeta>\n` +
    `<?xpacket end="w"?>`
  );
}

/**
 * Helper to remove all elements matching namespace URI and tag name from a document.
 */
function removeElements(doc: Document, nsUri: string, localName: string, prefixName: string) {
  const els = [
    ...Array.from(doc.getElementsByTagNameNS(nsUri, localName)),
    ...Array.from(doc.getElementsByTagName(prefixName)),
  ];
  for (const el of els) {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }
}

/**
 * Helper to append an rdf:Alt property to an rdf:Description element.
 */
function appendRdfAltProperty(
  doc: Document,
  parent: Element,
  nsUri: string,
  prefixedName: string,
  value: string
) {
  const propEl = doc.createElementNS(nsUri, prefixedName);
  const altEl = doc.createElementNS(RDF_NS, 'rdf:Alt');
  const liEl = doc.createElementNS(RDF_NS, 'rdf:li');
  liEl.setAttributeNS(XML_NS, 'xml:lang', 'x-default');
  liEl.textContent = value;
  altEl.appendChild(liEl);
  propEl.appendChild(altEl);
  parent.appendChild(propEl);
}

/**
 * Writes XMP metadata (combining keywords and text in ONE single XMP rewrite pass).
 * Preserves all other unrelated XMP tags and namespaces.
 * Throws if the resulting APP1 segment would exceed 65,535 bytes.
 */
export function writeXmpMetadata(
  jpegBytes: Uint8Array,
  opts: XmpMetadataOptions
): Uint8Array {
  const existingXmp = extractXmpString(jpegBytes);
  let newXmp: string;

  if (existingXmp) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(existingXmp, 'application/xml');

    // 1. Find or create rdf:Description
    let description =
      doc.getElementsByTagNameNS(RDF_NS, 'Description')[0] ||
      doc.getElementsByTagName('rdf:Description')[0];

    if (!description) {
      let rdf =
        doc.getElementsByTagNameNS(RDF_NS, 'RDF')[0] ||
        doc.getElementsByTagName('rdf:RDF')[0];
      if (!rdf) {
        rdf = doc.createElementNS(RDF_NS, 'rdf:RDF');
        doc.documentElement.appendChild(rdf);
      }
      description = doc.createElementNS(RDF_NS, 'rdf:Description');
      description.setAttributeNS(RDF_NS, 'rdf:about', '');
      rdf.appendChild(description);
    }

    // Ensure Iptc4xmpCore namespace is declared on rdf:Description if we write text
    if (opts.text && !description.getAttribute('xmlns:Iptc4xmpCore')) {
      description.setAttributeNS(
        'http://www.w3.org/2000/xmlns/',
        'xmlns:Iptc4xmpCore',
        IPTC4XMPCORE_NS
      );
    }
    if (!description.getAttribute('xmlns:dc')) {
      description.setAttributeNS(
        'http://www.w3.org/2000/xmlns/',
        'xmlns:dc',
        DC_NS
      );
    }

    // 2. Handle Keywords (dc:subject)
    if (opts.keywords !== undefined) {
      removeElements(doc, DC_NS, 'subject', 'dc:subject');
      if (opts.keywords && opts.keywords.length > 0) {
        const subjectEl = doc.createElementNS(DC_NS, 'dc:subject');
        const bagEl = doc.createElementNS(RDF_NS, 'rdf:Bag');
        for (const kw of opts.keywords) {
          const liEl = doc.createElementNS(RDF_NS, 'rdf:li');
          liEl.textContent = kw;
          bagEl.appendChild(liEl);
        }
        subjectEl.appendChild(bagEl);
        description.appendChild(subjectEl);
      }
    }

    // 3. Handle Text properties (altText, caption, extDescription)
    if (opts.text) {
      // altText: Iptc4xmpCore:AltTextAccessibility
      if (opts.text.altText !== undefined) {
        removeElements(doc, IPTC4XMPCORE_NS, 'AltTextAccessibility', 'Iptc4xmpCore:AltTextAccessibility');
        if (opts.text.altText) {
          appendRdfAltProperty(doc, description, IPTC4XMPCORE_NS, 'Iptc4xmpCore:AltTextAccessibility', opts.text.altText);
        }
      }

      // extDescription: Iptc4xmpCore:ExtDescrAccessibility
      if (opts.text.extDescription !== undefined) {
        removeElements(doc, IPTC4XMPCORE_NS, 'ExtDescrAccessibility', 'Iptc4xmpCore:ExtDescrAccessibility');
        if (opts.text.extDescription) {
          appendRdfAltProperty(doc, description, IPTC4XMPCORE_NS, 'Iptc4xmpCore:ExtDescrAccessibility', opts.text.extDescription);
        }
      }

      // caption: dc:description
      if (opts.text.caption !== undefined) {
        removeElements(doc, DC_NS, 'description', 'dc:description');
        if (opts.text.caption) {
          appendRdfAltProperty(doc, description, DC_NS, 'dc:description', opts.text.caption);
        }
      }
    }

    const serializer = new XMLSerializer();
    newXmp = serializer.serializeToString(doc);
  } else {
    newXmp = createMinimalXmpPacket(opts);
  }

  // Encode payload: Signature + newXmp
  const xmpBytes = new TextEncoder().encode(newXmp);
  const totalPayloadLength = XMP_SIG_BYTES.length + xmpBytes.length;

  if (totalPayloadLength + 2 > 65535) {
    throw new Error(
      `XMP metadata packet size (${totalPayloadLength} bytes) exceeds maximum JPEG APP1 capacity of 65,533 bytes.`
    );
  }

  const payload = new Uint8Array(totalPayloadLength);
  payload.set(XMP_SIG_BYTES, 0);
  payload.set(xmpBytes, XMP_SIG_BYTES.length);

  return insertOrReplaceApp1Segment(jpegBytes, isXmpPayload, payload);
}

/**
 * Backward compatibility alias for keyword writing.
 */
export function writeXmpKeywords(
  jpegBytes: Uint8Array,
  keywords: string[]
): Uint8Array {
  return writeXmpMetadata(jpegBytes, { keywords });
}

/**
 * Dedicated helper to write text fields.
 */
export function writeXmpText(
  jpegBytes: Uint8Array,
  text: XmpTextOptions
): Uint8Array {
  return writeXmpMetadata(jpegBytes, { text });
}
