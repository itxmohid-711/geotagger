'use client';

import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinates } from '@/types';

// Custom modern SVG Pin Icons
function createSvgPin(color: string, isDraggable = false): L.DivIcon {
  const svg = `
    <div style="position: relative; width: 32px; height: 38px; transform: translate(-50%, -100%); cursor: ${
      isDraggable ? 'grab' : 'pointer'
    };">
      <svg width="32" height="38" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16344 0 0 7.16344 0 16C0 26.5 16 38 16 38C16 38 32 26.5 32 16C32 7.16344 24.8366 0 16 0Z" fill="${color}" filter="drop-shadow(0px 3px 5px rgba(0,0,0,0.3))"/>
        <circle cx="16" cy="15" r="6" fill="white"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-pin-marker',
    iconSize: [32, 38],
    iconAnchor: [16, 38],
  });
}

const activePinIcon = createSvgPin('#2563eb', true); // Blue, draggable pin
const multiPinIcon = createSvgPin('#059669', false); // Emerald for existing multi-pins

interface MapClickHandlerProps {
  onMapClick: (coords: Coordinates) => void;
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
}

function MapFlyTo({ coords }: { coords?: Coordinates | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lng], Math.max(map.getZoom(), 14), {
        duration: 0.8,
      });
    }
  }, [coords, map]);
  return null;
}

export interface MapViewProps {
  currentCoords?: Coordinates | null;
  allExistingCoords?: { id: string; coords: Coordinates; name: string }[];
  onCoordsChange: (coords: Coordinates) => void;
}

export default function MapView({
  currentCoords,
  allExistingCoords = [],
  onCoordsChange,
}: MapViewProps) {
  const tileUrl =
    process.env.NEXT_PUBLIC_TILE_URL ||
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution =
    process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const defaultCenter: LatLngExpression = useMemo(() => {
    if (currentCoords) return [currentCoords.lat, currentCoords.lng];
    if (allExistingCoords.length > 0)
      return [allExistingCoords[0].coords.lat, allExistingCoords[0].coords.lng];
    return [20, 0]; // World view
  }, [currentCoords, allExistingCoords]);

  const defaultZoom = currentCoords || allExistingCoords.length > 0 ? 13 : 2;

  const eventHandlers = useMemo(
    () => ({
      dragend(e: L.LeafletEvent) {
        const marker = e.target as L.Marker;
        const latlng = marker.getLatLng();
        onCoordsChange({
          lat: Number(latlng.lat.toFixed(6)),
          lng: Number(latlng.lng.toFixed(6)),
        });
      },
    }),
    [onCoordsChange]
  );

  return (
    <div className="relative w-full h-full min-h-[300px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 z-0">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[300px]"
      >
        <TileLayer url={tileUrl} attribution={tileAttribution} />
        <MapClickHandler onMapClick={onCoordsChange} />
        {currentCoords && <MapFlyTo coords={currentCoords} />}

        {/* Other existing pins in multi-selection */}
        {allExistingCoords.map((item) => (
          <Marker
            key={item.id}
            position={[item.coords.lat, item.coords.lng]}
            icon={multiPinIcon}
            title={item.name}
          />
        ))}

        {/* Current Active Pin */}
        {currentCoords && (
          <Marker
            position={[currentCoords.lat, currentCoords.lng]}
            icon={activePinIcon}
            draggable={true}
            eventHandlers={eventHandlers}
          />
        )}
      </MapContainer>
    </div>
  );
}
