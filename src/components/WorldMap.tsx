import React, { memo, useState, useEffect, useRef } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { useMapStore } from '../store/mapStore';
import { countryCodeToName } from '../data/countryCodes';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface WorldMapProps {
  initialCountry?: string;
  initCountryCode?: string;
  defaultShowUnselected?: boolean;
  standalone?: boolean;
}

// Map GeoJSON country names to our standardized names
const standardizeCountryName = (geoName: string): string => {
  const nameMap: { [key: string]: string } = {
    'United States of America': 'United States',
    // Add more mappings if needed
  };
  return nameMap[geoName] || geoName;
};

export const WorldMap: React.FC<WorldMapProps> = memo(({ 
  initialCountry,
  initCountryCode,
  defaultShowUnselected = true,
  standalone = false
}) => {
  const [tooltip, setTooltip] = useState<{ content: string; position: { x: number; y: number } } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  
  // Local state for standalone mode
  const [localState, setLocalState] = useState({
    selectedCountry: initialCountry || (initCountryCode ? countryCodeToName[initCountryCode] : null),
    center: [0, 0] as [number, number],
    zoom: 1,
    showUnselected: defaultShowUnselected
  });

  // Global store state
  const store = useMapStore(state => ({
    selectedCountry: state.selectedCountry,
    center: state.center,
    zoom: state.zoom,
    showUnselected: state.showUnselected,
    selectCountryByName: state.selectCountryByName
  }));

  // Use either local or store state based on standalone mode
  const {
    selectedCountry,
    center,
    zoom,
    showUnselected
  } = standalone ? localState : store;

  useEffect(() => {
    const countryToUse = initialCountry || (initCountryCode ? countryCodeToName[initCountryCode] : null);
    if (countryToUse && standalone) {
      import('../data/countries').then(({ countries }) => {
        const country = countries.find(c => c.value === countryToUse);
        if (country) {
          setLocalState(prev => ({
            ...prev,
            selectedCountry: country.value,
            center: country.coordinates,
            zoom: country.zoom
          }));
        }
      });
    } else if (countryToUse && !standalone && store.selectCountryByName) {
      store.selectCountryByName(countryToUse);
    }
  }, [initialCountry, initCountryCode, standalone, store.selectCountryByName]);

  const getGeographyStyles = (isSelected: boolean, isVisible: boolean) => ({
    default: {
      fill: isSelected
        ? '#3b82f6'
        : showUnselected
          ? '#2a4365'
          : 'rgb(17, 24, 39)',
      stroke: showUnselected ? '#1a202c' : 'transparent',
      strokeWidth: 0.5,
      outline: 'none',
      cursor: isVisible ? 'pointer' : 'default',
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? 'auto' : 'none',
    },
    hover: {
      fill: isVisible ? '#60a5fa' : 'rgb(17, 24, 39)',
      stroke: showUnselected ? '#1a202c' : 'transparent',
      strokeWidth: 0.5,
      outline: 'none',
      cursor: isVisible ? 'pointer' : 'default',
    },
    pressed: {
      fill: '#3b82f6',
      stroke: showUnselected ? '#1a202c' : 'transparent',
      strokeWidth: 0.5,
      outline: 'none',
    },
  });

  return (
    <div className="w-full h-full relative" style={{ aspectRatio: '16/9' }} ref={mapRef}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 150
        }}
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          minZoom={1}
          maxZoom={8}
          onMoveEnd={({ coordinates, zoom }) => {
            if (standalone) {
              setLocalState(prev => ({
                ...prev,
                center: coordinates as [number, number],
                zoom
              }));
            } else if (store) {
              store.setCenter?.(coordinates as [number, number]);
              store.setZoom?.(zoom);
            }
          }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const standardizedName = standardizeCountryName(geo.properties.name);
                const isSelected = selectedCountry === standardizedName;
                const shouldShowTooltip = showUnselected && !isSelected;
                const isVisible = isSelected || showUnselected;
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={(evt) => {
                      if (shouldShowTooltip) {
                        const { pageX, pageY } = evt;
                        setTooltip({
                          content: standardizedName,
                          position: { x: pageX, y: pageY }
                        });
                      }
                    }}
                    onMouseLeave={() => {
                      setTooltip(null);
                    }}
                    onClick={() => {
                      if (isVisible) {
                        if (standalone) {
                          setLocalState(prev => ({
                            ...prev,
                            selectedCountry: standardizedName
                          }));
                        } else if (store.selectCountryByName) {
                          store.selectCountryByName(standardizedName);
                        }
                      }
                    }}
                    style={getGeographyStyles(isSelected, isVisible)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      {tooltip && (
        <div
          className="tooltip"
          style={{
            left: tooltip.position.x,
            top: tooltip.position.y - 40
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
});