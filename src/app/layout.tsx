import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadataBase = new URL("https://geotagger.app");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase,
  title: "GeoTagger — Add GPS Coordinates & Keywords to Photos Free (100% Client-Side)",
  description:
    "Free, 100% private, client-side tool to add GPS geotags and keywords to JPEG metadata in your browser. No files are ever uploaded. Zero re-encoding loss.",
  keywords: [
    "geotag photos",
    "add gps to jpeg",
    "exif editor",
    "photo keyword editor",
    "iptc tags",
    "free geotagger",
    "client-side exif",
    "reverse geocode photos",
  ],
  authors: [{ name: "GeoTagger" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "GeoTagger — Geotag Photos Directly in Browser",
    description:
      "Embed GPS coordinates and IPTC/XMP keywords into your JPEG photos directly in your browser. Zero uploads, zero pixel recompression.",
    url: "https://geotagger.app",
    siteName: "GeoTagger",
    images: [
      {
        url: "/favicon.svg",
        width: 128,
        height: 128,
        alt: "GeoTagger Pin Icon",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "GeoTagger — Free Client-Side Photo Geotagging Tool",
    description:
      "Add GPS coordinates & keywords directly into JPEG metadata without server uploads or pixel compression.",
    images: ["/favicon.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white motion-reduce:transition-none">
        {/* Header */}
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3 transition-colors">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight tracking-tight">GeoTagger</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Tag coordinates &amp; keywords directly into your JPEG metadata
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Your photos never leave your device</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">{children}</div>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 py-4 px-4 sm:px-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>GeoTagger — 100% Client-Side JPEG Geotagging &amp; Keyword Tool</span>
            <span>Map data © OpenStreetMap contributors</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
