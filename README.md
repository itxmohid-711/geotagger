# GeoTagger

> **100% Client-Side JPEG Geotagging & Keyword Metadata Tool**
> Embed GPS coordinates and keywords directly into JPEG photos inside your browser. No files are ever uploaded anywhere. Zero pixel re-encoding loss.

---

## 🌟 What It Does

GeoTagger is a free, privacy-first web application designed for photographers, digital asset managers, real estate professionals, and travelers who need to add, adjust, or remove location coordinates and keywords on photos.

- **Set Coordinates**: Place pins on an interactive OpenStreetMap, search addresses with Nominatim, enter latitude/longitude/altitude manually, or use your current device location.
- **Manage Keywords**: Add keyword chips, toggle between "Add to existing" and "Replace all", use session autocomplete, or save/load custom presets in your browser.
- **Zero Generation Loss**: Unlike typical canvas-based tools that decode and recompress JPEG pixels, GeoTagger **only rewrites metadata segments** (`APP1` EXIF & XMP). All entropy-coded scan bytes (the actual pixel image data after `SOS`) remain 100% byte-identical.
- **Multi-Select & Batching**: Select single photos or batch apply coordinates and keywords to dozens of images at once.
- **Export Options**: Download individual files, stream into a ZIP bundle powered by `fflate`, or save directly to a local folder in Chromium browsers via `window.showDirectoryPicker`.
- **Privacy Stripping**: Instantly remove embedded GPS coordinates or keywords from photos before sharing them online.

---

## 🔒 Privacy Model

- **100% Client-Side Execution**: All JPEG binary parsing, EXIF generation via `piexifjs`, XMP parsing via `DOMParser`, and ZIP compression via `fflate` run completely inside client memory in your browser.
- **Zero Server Uploads**: No backend servers, no image processing API routes, and no external storage.
- **No Analytics / No Tracking**: No cookies, no session trackers, and no third-party telemetry.
- **Open Data Services**: Address search and map tiles are served directly from OpenStreetMap and Nominatim under their public usage policies.

---

## 📷 Supported Formats (v1)

- **Supported**: JPEG (`.jpg`, `.jpeg`, `image/jpeg`).
- **Unsupported (v1)**: HEIC, PNG, WEBP, AVIF, RAW (`.CR2`, `.NEF`, `.ARW`).
  - *Non-JPEG files are detected on drop and marked with a clear warning explaining they are not yet supported. They are never dropped silently.*

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Static Pre-rendering)
- **UI Engine**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Maps**: [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/) (Custom SVG markers, dynamic client loading)
- **Metadata Libraries**:
  - `piexifjs` (EXIF GPS IFD & `XPKeywords` segment serialization)
  - `exifr` (Fast multi-format EXIF/IPTC/XMP extraction)
  - Native browser `DOMParser` & `XMLSerializer` (Adobe XMP `dc:subject` manipulation)
- **Packaging**: `fflate` (High-speed, memory-efficient ZIP creation with zero recompression)
- **Testing**: [Vitest](https://vitest.dev/) with `jsdom`

---

## 🚀 Local Setup & Development

### Prerequisites
- Node.js `20.9+` (or Node `24.x`)
- npm `10+`

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Quality & Test Checks
```bash
# Run unit & integration test suites
npm test

# Run ESLint validation
npm run lint

# Create production build
npm run build
```

---

## ⚙️ Environment Variables (Optional)

GeoTagger requires **zero** environment variables to build or run. If you wish to use a custom map tile server, you can optionally configure:

```env
# Custom tile server URL template (defaults to standard OSM tiles)
NEXT_PUBLIC_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png

# Tile layer copyright attribution
NEXT_PUBLIC_TILE_ATTRIBUTION=&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
```

See `.env.example` for details.

---

## ⚠️ Known Limitations

1. **JPEG Only in v1**: RAW, HEIC, and PNG files are not yet supported because EXIF/XMP byte structures differ across formats.
2. **APP1 Segment Size Limit**: JPEG specifications limit standard `APP1` markers to 65,535 bytes total. Extreme keyword lists exceeding ~60 KB of raw XML will raise a descriptive warning.
3. **Social Media Stripping**: Social platforms (Instagram, Twitter, WhatsApp, Facebook) automatically strip all EXIF metadata on upload to protect user privacy. GeoTagger tags are recognized natively by macOS Photos/Preview, Windows Explorer, Lightroom, and Google Photos.
4. **Geolocation Permission**: The "Use my current location" feature requires an HTTPS connection in modern browsers (standard on `localhost` and Vercel).

---

## 🗺️ Roadmap

- [ ] **v1.1**: GPX track log import and auto-synchronization by photo timestamps.
- [ ] **v1.2**: Support for PNG metadata (`eXIf` chunk).
- [ ] **v2.0**: Client-side WebAssembly parser for HEIC and camera RAW formats.
- [ ] **v2.1**: Offline PWA (Progressive Web App) support with cached map tiles.
