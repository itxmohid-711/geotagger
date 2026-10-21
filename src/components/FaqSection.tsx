'use client';

import React from 'react';

export function FaqSection() {
  return (
    <section
      aria-label="Frequently Asked Questions and Guide"
      className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 max-w-4xl mx-auto w-full px-4"
    >
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          How GeoTagger Works &amp; Frequently Asked Questions
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-lg mx-auto">
          Learn how metadata tagging works, why your photos remain 100% private, and how coordinates are embedded.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">🔒</span>
            Are my photos uploaded to a server?
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            <strong>No, never.</strong> GeoTagger is 100% client-side. All JPEG binary parsing, EXIF and XMP segment rewriting, and ZIP creation run directly inside your browser memory using WebAssembly and pure JavaScript. No image bytes ever traverse the network.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">💎</span>
            Are image pixels re-encoded or compressed?
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            <strong>Zero loss.</strong> Unlike tools that load images into a canvas and export them (causing JPEG generation loss), GeoTagger only rewrites the header metadata segments (APP1 EXIF &amp; XMP). The entropy-coded scan data after the Start of Scan (SOS) marker remains 100% byte-identical.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">🏷️</span>
            Which metadata fields are written?
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            GPS coordinates are written to the standard EXIF GPS IFD tag hierarchy (<code className="px-1 bg-slate-100 dark:bg-slate-800 rounded">GPSLatitude</code>, <code className="px-1 bg-slate-100 dark:bg-slate-800 rounded">GPSLongitude</code>, <code className="px-1 bg-slate-100 dark:bg-slate-800 rounded">GPSAltitude</code>). Keywords are stored across both Adobe XMP (<code className="px-1 bg-slate-100 dark:bg-slate-800 rounded">dc:subject</code>) and Windows EXIF (<code className="px-1 bg-slate-100 dark:bg-slate-800 rounded">XPKeywords</code>) for maximum compatibility.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">⚠️</span>
            Why might some apps not show my tags?
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            Some social media platforms (like Facebook, Instagram, Twitter, and WhatsApp) deliberately strip all EXIF and GPS tags upon upload to protect user privacy. Apple Photos, Google Photos, Adobe Lightroom, and OS file inspectors (Finder / Windows Explorer) read them natively.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs md:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs">🌐</span>
            Does embedded alt text show up on my website?
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            <strong>No, browsers use the HTML alt attribute.</strong> Embedded alt text is stored in the file for tools that read IPTC/XMP metadata (photo managers, DAMs, CMSs). To use it on your website, click the &ldquo;Copy alt text&rdquo; button on any photo card to quickly copy and paste it directly into your HTML <code className="px-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px]">alt=&quot;...&quot;</code> tag or CMS image settings.
          </p>
        </div>
      </div>
    </section>
  );
}
