# Verification Checklist for Exported Photos

Follow this step-by-step checklist to verify that an exported photo from GeoTagger contains valid, uncorrupted metadata across standard operating systems, accessibility readers, and professional tools.

---

### 1. Verification with `exiftool` (Command Line)

Run `exiftool` on the exported JPEG to inspect the exact written tags for GPS, keywords, and accessibility descriptions:

#### A. GPS & Keywords Check
```bash
exiftool -a -G1 -GPSLatitude -GPSLongitude -GPSAltitude -Keywords -Subject -XPKeywords out-geotagged.jpg
```

**Expected Output:**
```text
[GPS]           GPS Latitude                    : 31 deg 31' 13.44" N
[GPS]           GPS Longitude                   : 74 deg 21' 31.32" E
[GPS]           GPS Altitude                    : 215 m
[IPTC]          Keywords                        : Lahore, Heritage, Travel
[XMP-dc]        Subject                         : Lahore, Heritage, Travel
[IFD0]          XP Keywords                     : Lahore; Heritage; Travel
```

#### B. Alt Text, Caption & Extended Description Check
```bash
exiftool -a -G1 -XMP-iptcCore:AltTextAccessibility -XMP-iptcCore:ExtDescrAccessibility -XMP-dc:Description -EXIF:ImageDescription out-geotagged.jpg
```

**Expected Output:**
```text
[XMP-iptcCore]  Alt Text Accessibility          : Minar-e-Pakistan illuminated at twilight
[XMP-iptcCore]  Ext Descr Accessibility         : Detailed architectural view of the minaret and gardens.
[XMP-dc]        Description                     : Minar-e-Pakistan illuminated at twilight
[IFD0]          Image Description               : Minar-e-Pakistan illuminated at twilight
```

> **Note on Accessibility Alt Text**: Most conventional image viewers (e.g. macOS Preview, Windows Photos) will **NOT** display `AltTextAccessibility`. This field is part of the IPTC Photo Metadata standard designed for screen readers, modern CMS platforms, and Digital Asset Management (DAM) systems. **ExifTool is the source of truth for that field.**
>
> *(Note: If the caption contains non-ASCII characters such as Urdu, Arabic, or accented letters, GeoTagger safely writes it to `XMP-dc:Description` and omits it from legacy `EXIF:ImageDescription` to avoid character corruption in older viewers.)*

---

### 2. Verification on Windows (File Explorer)

1. Right-click the exported file `out-geotagged.jpg` and select **Properties**.
2. Click on the **Details** tab.
3. Scroll to:
   - **GPS**: Confirm that **Latitude** and **Longitude** display the expected coordinates.
   - **Description / Title / Tags**: Confirm that the keywords appear in the **Tags** field, and ASCII captions appear under **Title** or **Subject**.
4. Double-click the image to open it in the default **Photos** app. Confirm the image displays sharp, clear, and identical to the original with no color shifts or compression artifacts.

---

### 3. Verification on macOS (Preview & Apple Photos)

1. Open `out-geotagged.jpg` in **Preview**.
2. Press **⌘ + I** (Inspector window) and click the **(i)** Info icon:
   - Under the **GPS** tab: An interactive Apple Map with an exact pin drop on the location must appear.
   - Under the **IPTC** or **Keywords** tab: The list of keywords must be displayed.
3. Drag the photo into the **Apple Photos** library:
   - Press **⌘ + I** to inspect the info panel.
   - Verify that the photo appears in the **Places** album and displays the keywords in the keyword tags section.

---

### 4. Verification in Adobe Lightroom, digiKam & Photoshop

1. Import `out-geotagged.jpg` into **Adobe Lightroom**, **digiKam**, or open in **Adobe Photoshop (File > File Info)**.
2. In **Lightroom**:
   - Switch to the **Map** module. The photo should automatically plot onto the exact geographic coordinates.
   - Open the **Keywording** panel on the right sidebar. All keywords should be populated in the keyword tag field.
   - Open the **Metadata** panel. Verify that the **Caption** field displays the written caption.
3. In **digiKam**:
   - Select the image and inspect the **Captions** / **Information** side dock.
   - Confirm that the **Caption** is displayed accurately.
4. In **Photoshop**:
   - Open **File > File Info...**
   - Click **Description** / **IPTC**: Keywords appear under `Keywords`, and the caption appears under `Description`.
   - Click **GPS**: Coordinates appear under `GPS Data`.

---

### 5. Verification in Google Photos

1. Navigate to [Google Photos](https://photos.google.com/) and upload `out-geotagged.jpg`.
2. Open the photo and click the **(i)** Info icon:
   - Google Photos will render a location map card with the name of the city/locality.
   - If keywords or descriptions are present, they are indexed in Google Photos search.

---

### 6. Pixel-Level Byte Integrity Check

To prove that GeoTagger never re-encodes pixels and only modifies metadata headers, compare the image entropy scan data after the Start of Scan (`0xFFDA`) marker between the original JPEG and the exported JPEG:

```bash
# Compare bytes after SOS marker using node or python
node -e '
const fs = require("fs");
function findSos(buf) {
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && buf[i+1] === 0xda) return i;
  }
  return -1;
}
const bOrig = fs.readFileSync("original.jpg");
const bOut = fs.readFileSync("out-geotagged.jpg");
const sOrig = bOrig.subarray(findSos(bOrig));
const sOut = bOut.subarray(findSos(bOut));
console.log("Entropy bytes identical?", sOrig.equals(sOut));
'
```

#### Expected Result:
```text
Entropy bytes identical? true
```
This confirms **100% loss-free, pixel-identical export**.
