'use client';

import React, { useState, FormEvent, ClipboardEvent } from 'react';
import { useApp } from '@/state/AppContext';
import { Coordinates } from '@/types';
import { parseCoordinates, validateCoordinates } from '@/lib/geo/coords';
import { searchPlaces, reverseGeocode, NominatimResult } from '@/lib/geo/nominatim';
import { MapWrapper } from './map/MapWrapper';

interface LocationFormProps {
  selectedImages: ReturnType<typeof useApp>['state']['images'];
}

function LocationForm({ selectedImages }: LocationFormProps) {
  const { state, applyCoords, setStrip } = useApp();
  const selectedCount = selectedImages.length;

  // Determine initial coordinates from selection
  const initialCoords = React.useMemo(() => {
    if (selectedCount === 1) {
      const img = selectedImages[0];
      return img.edit.coords && !img.stripGps ? img.edit.coords : null;
    } else if (selectedCount > 1) {
      const withCoords = selectedImages.filter((img) => img.edit.coords && !img.stripGps);
      if (
        withCoords.length === selectedCount &&
        withCoords.every(
          (img) =>
            img.edit.coords!.lat === withCoords[0].edit.coords!.lat &&
            img.edit.coords!.lng === withCoords[0].edit.coords!.lng
        )
      ) {
        return withCoords[0].edit.coords || null;
      }
    }
    return null;
  }, [selectedCount, selectedImages]);

  // Active coordinates in the editor form
  const [coords, setCoords] = useState<Coordinates | null>(initialCoords);
  const [latInput, setLatInput] = useState<string>(initialCoords ? initialCoords.lat.toString() : '');
  const [lngInput, setLngInput] = useState<string>(initialCoords ? initialCoords.lng.toString() : '');
  const [altInput, setAltInput] = useState<string>(
    initialCoords && initialCoords.alt !== undefined ? initialCoords.alt.toString() : ''
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Reverse geocoded place name
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Geolocation status
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Existing locations of other selected photos for multi-pin display
  const allExistingCoords = selectedImages
    .filter((img) => img.edit.coords && !img.stripGps)
    .map((img) => ({
      id: img.id,
      name: img.name,
      coords: img.edit.coords!,
    }));

  const hasMultipleDifferentLocations =
    selectedCount > 1 &&
    new Set(allExistingCoords.map((c) => `${c.coords.lat},${c.coords.lng}`)).size > 1;

  // Update map & inputs synchronously
  const handleMapCoordsChange = (newCoords: Coordinates) => {
    setCoords(newCoords);
    setLatInput(newCoords.lat.toString());
    setLngInput(newCoords.lng.toString());
    setPlaceName(null);
  };

  // Live input changes
  const handleLatChange = (value: string) => {
    setLatInput(value);
    const parsedLat = parseFloat(value);
    const parsedLng = parseFloat(lngInput);
    if (validateCoordinates(parsedLat, parsedLng)) {
      setCoords({
        lat: parsedLat,
        lng: parsedLng,
        alt: altInput ? parseFloat(altInput) : undefined,
      });
    }
  };

  const handleLngChange = (value: string) => {
    setLngInput(value);
    const parsedLat = parseFloat(latInput);
    const parsedLng = parseFloat(value);
    if (validateCoordinates(parsedLat, parsedLng)) {
      setCoords({
        lat: parsedLat,
        lng: parsedLng,
        alt: altInput ? parseFloat(altInput) : undefined,
      });
    }
  };

  const handleAltChange = (value: string) => {
    setAltInput(value);
    if (coords) {
      setCoords({
        ...coords,
        alt: value ? parseFloat(value) : undefined,
      });
    }
  };

  // Support pasting "lat, lng" into either box
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const parsed = parseCoordinates(text);
    if (parsed) {
      e.preventDefault();
      setLatInput(parsed.lat.toString());
      setLngInput(parsed.lng.toString());
      setCoords({
        lat: parsed.lat,
        lng: parsed.lng,
        alt: altInput ? parseFloat(altInput) : undefined,
      });
    }
  };

  // Address search via Nominatim
  const handleSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('No places found matching your query.');
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (res: NominatimResult) => {
    const lat = parseFloat(res.lat);
    const lng = parseFloat(res.lon);
    if (validateCoordinates(lat, lng)) {
      const newCoords = {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        alt: altInput ? parseFloat(altInput) : undefined,
      };
      setCoords(newCoords);
      setLatInput(newCoords.lat.toString());
      setLngInput(newCoords.lng.toString());
      setPlaceName(res.display_name);
      setSearchResults([]);
    }
  };

  // Use current location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const newCoords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          alt: pos.coords.altitude !== null ? Math.round(pos.coords.altitude) : undefined,
        };
        setCoords(newCoords);
        setLatInput(newCoords.lat.toString());
        setLngInput(newCoords.lng.toString());
        if (newCoords.alt !== undefined) {
          setAltInput(newCoords.alt.toString());
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Please allow location access in your browser.');
        } else if (err.code === err.TIMEOUT) {
          setGeoError('Location request timed out. Please try again.');
        } else {
          setGeoError('Unable to retrieve current location.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Show place name (reverse geocode)
  const handleShowPlaceName = async () => {
    if (!coords) return;
    setIsReverseGeocoding(true);
    try {
      const name = await reverseGeocode(coords.lat, coords.lng);
      setPlaceName(name);
    } catch {
      setPlaceName('Could not find place name for these coordinates.');
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Apply coordinates to selected photos
  const handleApply = () => {
    if (!coords || selectedCount === 0) return;
    const selectedIds = Array.from(state.selectedIds);
    applyCoords(selectedIds, coords);
  };

  // Copy location from first photo with coordinates to others
  const handleCopyFromFirst = () => {
    const source = selectedImages.find((img) => img.edit.coords && !img.stripGps);
    if (source && source.edit.coords) {
      const selectedIds = Array.from(state.selectedIds);
      applyCoords(selectedIds, source.edit.coords);
      setCoords(source.edit.coords);
      setLatInput(source.edit.coords.lat.toString());
      setLngInput(source.edit.coords.lng.toString());
      setAltInput(
        source.edit.coords.alt !== undefined ? source.edit.coords.alt.toString() : ''
      );
    }
  };

  // Clear location
  const handleClearLocation = () => {
    const selectedIds = Array.from(state.selectedIds);
    setStrip(selectedIds, { gps: true });
    setCoords(null);
    setLatInput('');
    setLngInput('');
    setAltInput('');
    setPlaceName(null);
  };

  const isFormValid =
    !!coords && validateCoordinates(coords.lat, coords.lng) && selectedCount > 0;

  return (
    <section
      aria-label="Location editor"
      className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Set Photo Location
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click map, drag the pin, search addresses, or type coordinates
          </p>
        </div>

        {hasMultipleDifferentLocations && (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Multiple locations
          </span>
        )}
      </div>

      {/* Address Search */}
      <form onSubmit={handleSearchSubmit} className="relative flex flex-col gap-1.5">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address or landmark (press Enter)..."
            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            aria-label="Search address or landmark"
          />
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors shrink-0"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Nominatim Search Attribution */}
        <span className="text-[10px] text-slate-400">
          Search by Nominatim / &copy; OpenStreetMap contributors
        </span>

        {/* Search Results List */}
        {searchResults.length > 0 && (
          <ul
            className="mt-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-lg divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto z-20"
            role="listbox"
          >
            {searchResults.map((res) => (
              <li
                key={res.place_id}
                onClick={() => handleSelectSearchResult(res)}
                className="p-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer transition-colors"
                role="option"
                aria-selected="false"
              >
                {res.display_name}
              </li>
            ))}
          </ul>
        )}

        {searchError && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            {searchError}
          </p>
        )}
      </form>

      {/* Interactive Map */}
      <div className="h-64 sm:h-72 w-full">
        <MapWrapper
          currentCoords={coords}
          allExistingCoords={allExistingCoords}
          onCoordsChange={handleMapCoordsChange}
        />
      </div>

      {/* Quick Action: Current Location & Place Name */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
          </svg>
          {isLocating ? 'Locating...' : 'Use my current location'}
        </button>

        {coords && (
          <button
            type="button"
            onClick={handleShowPlaceName}
            disabled={isReverseGeocoding}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            {isReverseGeocoding ? 'Looking up...' : 'Show place name'}
          </button>
        )}
      </div>

      {geoError && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{geoError}</p>
      )}

      {placeName && (
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <span className="font-semibold block text-slate-700 dark:text-slate-200">
            Place Name:
          </span>
          {placeName}
        </div>
      )}

      {/* Manual Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Latitude (-90 to 90)
          </label>
          <input
            type="text"
            value={latInput}
            onChange={(e) => handleLatChange(e.target.value)}
            onPaste={handlePaste}
            placeholder="e.g. 31.5204"
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Longitude (-180 to 180)
          </label>
          <input
            type="text"
            value={lngInput}
            onChange={(e) => handleLngChange(e.target.value)}
            onPaste={handlePaste}
            placeholder="e.g. 74.3587"
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Altitude (m, optional)
          </label>
          <input
            type="text"
            value={altInput}
            onChange={(e) => handleAltChange(e.target.value)}
            placeholder="e.g. 217"
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Batch Location Action Buttons */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={handleApply}
          disabled={!isFormValid}
          className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
        >
          {selectedCount === 0
            ? 'Select photos to apply location'
            : !coords
            ? 'Set or pick coordinates on map'
            : `Apply to ${selectedCount} selected photo${selectedCount === 1 ? '' : 's'}`}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {selectedCount > 1 && allExistingCoords.length > 0 && (
            <button
              type="button"
              onClick={handleCopyFromFirst}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Copy location from tagged photo to all selected
            </button>
          )}

          {selectedCount > 0 && (
            <button
              type="button"
              onClick={handleClearLocation}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline ml-auto"
            >
              Clear location from selected
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function LocationPanel() {
  const { state } = useApp();
  const selectedImages = state.images.filter((img) => state.selectedIds.has(img.id));
  const selectionKey = selectedImages
    .map((img) => `${img.id}-${img.edit.coords?.lat},${img.edit.coords?.lng}-${img.stripGps}`)
    .join('|');

  return <LocationForm key={selectionKey} selectedImages={selectedImages} />;
}
