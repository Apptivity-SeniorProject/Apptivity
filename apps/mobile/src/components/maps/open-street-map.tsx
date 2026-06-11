import { useEffect, useMemo, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapRegion = MapCoordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export type OpenStreetMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  subtitle?: string;
  count?: number;
  isCluster?: boolean;
  isSelected?: boolean;
  variant?: 'default' | 'current-location' | 'selection';
};

type OpenStreetMapMessage =
  | {
      type: 'markerPress';
      markerId: string;
    }
  | {
      type: 'interaction';
      active: boolean;
    }
  | ({
      type: 'mapPress';
    } & MapCoordinate)
  | ({
      type: 'regionChange';
    } & MapRegion);

type OpenStreetMapProps = {
  interactive?: boolean;
  markers?: OpenStreetMapMarker[];
  onMapPress?: (coordinate: MapCoordinate) => void;
  onMarkerPress?: (markerId: string) => void;
  onRegionChange?: (region: MapRegion) => void;
  onInteractionChange?: (active: boolean) => void;
  region: MapRegion;
  selectedCoordinate?: MapCoordinate | null;
  style?: StyleProp<ViewStyle>;
  viewportKey?: number | string;
};

function clampZoom(value: number) {
  return Math.max(2, Math.min(18, value));
}

function getZoomFromRegion(region: MapRegion) {
  const lngDelta = Math.max(region.longitudeDelta, 0.001);
  return clampZoom(Math.round(Math.log2(360 / lngDelta)));
}

function buildHtml({
  interactive,
  region,
  viewportKey,
}: Required<Pick<OpenStreetMapProps, 'interactive' | 'region'>> &
  Pick<OpenStreetMapProps, 'viewportKey'>) {
  const payload = JSON.stringify({
    interactive,
    region,
    zoom: getZoomFromRegion(region),
  });

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #f8fafc;
      }

      .event-pin,
      .cluster-marker,
      .selection-marker,
      .current-location-marker,
      .picked-marker {
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-weight: 700;
      }

      .event-pin {
        position: relative;
        width: 28px;
        height: 40px;
        filter: drop-shadow(0 10px 14px rgba(15, 23, 42, 0.22));
      }

      .event-pin.selected {
        width: 34px;
        height: 48px;
        filter: drop-shadow(0 14px 18px rgba(53, 124, 28, 0.28));
      }

      .event-pin-core {
        position: absolute;
        top: 0;
        left: 50%;
        z-index: 2;
        width: 28px;
        height: 28px;
        transform: translateX(-50%);
        border-radius: 999px;
        border: 3px solid #ffffff;
        background:
          radial-gradient(circle at 35% 35%, #d9ffba 0%, #8cf457 42%, #54bf28 100%);
        box-shadow:
          inset 0 -4px 8px rgba(21, 128, 61, 0.22),
          0 6px 16px rgba(84, 191, 40, 0.22);
      }

      .event-pin.selected .event-pin-core {
        width: 34px;
        height: 34px;
        background:
          radial-gradient(circle at 35% 35%, #e7ffd4 0%, #9df471 38%, #357c1c 100%);
        box-shadow:
          inset 0 -4px 10px rgba(20, 83, 45, 0.24),
          0 8px 18px rgba(53, 124, 28, 0.34);
      }

      .event-pin-core::after {
        content: "";
        position: absolute;
        inset: 50% auto auto 50%;
        width: 9px;
        height: 9px;
        margin: -4.5px 0 0 -4.5px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.18);
      }

      .event-pin-stem {
        position: absolute;
        left: 50%;
        bottom: 0;
        z-index: 1;
        width: 16px;
        height: 16px;
        background: linear-gradient(180deg, #66d134 0%, #2f7d17 100%);
        transform: translateX(-50%) rotate(45deg);
        border-radius: 2px 0 6px 0;
        border-right: 3px solid #ffffff;
        border-bottom: 3px solid #ffffff;
      }

      .event-pin.selected .event-pin-stem {
        width: 18px;
        height: 18px;
        background: linear-gradient(180deg, #5fcd31 0%, #255f14 100%);
      }

      .cluster-marker {
        min-width: 34px;
        height: 34px;
        padding: 0 10px;
        border-radius: 999px;
        border: 3px solid rgba(255, 255, 255, 0.95);
        background:
          radial-gradient(circle at 35% 30%, #a7f07b 0%, #4fa726 55%, #255f14 100%);
        color: #ffffff;
        font-size: 12px;
        letter-spacing: 0.02em;
        box-shadow:
          0 12px 24px rgba(37, 95, 20, 0.26),
          0 0 0 6px rgba(119, 227, 73, 0.16);
      }

      .selection-marker {
        position: relative;
        width: 28px;
        height: 40px;
        filter: drop-shadow(0 10px 14px rgba(15, 23, 42, 0.22));
      }

      .selection-marker .event-pin-core {
        background:
          radial-gradient(circle at 35% 35%, #d9ffba 0%, #8cf457 42%, #54bf28 100%);
      }

      .selection-marker .event-pin-stem {
        background: linear-gradient(180deg, #66d134 0%, #2f7d17 100%);
      }

      .current-location-marker {
        position: relative;
        width: 24px;
        height: 24px;
        border-radius: 999px;
        border: 3px solid #ffffff;
        background: radial-gradient(circle at 35% 35%, #c8f3ff 0%, #38bdf8 55%, #0284c7 100%);
        box-shadow:
          0 10px 18px rgba(2, 132, 199, 0.24),
          0 0 0 5px rgba(56, 189, 248, 0.16);
      }

      .current-location-marker::after {
        content: "";
        position: absolute;
        inset: 50% auto auto 50%;
        width: 6px;
        height: 6px;
        margin: -3px 0 0 -3px;
        border-radius: 999px;
        background: #ffffff;
      }

      .picked-marker {
        position: relative;
        width: 24px;
        height: 24px;
        border-radius: 999px;
        border: 3px solid #ffffff;
        background: radial-gradient(circle at 35% 35%, #c8f3ff 0%, #38bdf8 55%, #0284c7 100%);
        box-shadow:
          0 10px 18px rgba(2, 132, 199, 0.24),
          0 0 0 5px rgba(56, 189, 248, 0.16);
      }

      .picked-marker::after {
        content: "";
        position: absolute;
        inset: 50% auto auto 50%;
        width: 6px;
        height: 6px;
        margin: -3px 0 0 -3px;
        border-radius: 999px;
        background: #ffffff;
      }

      .leaflet-control-attribution {
        font-size: 9px;
      }

      .leaflet-tooltip {
        border: 0;
        border-radius: 14px;
        padding: 10px 12px;
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.16);
        color: #0f172a;
      }

      .leaflet-tooltip strong {
        display: block;
        margin-bottom: 2px;
        font-size: 13px;
      }
    </style>
  </head>
  <body data-viewport-key="${String(viewportKey)}">
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const payload = ${payload};
      const map = L.map('map', {
        zoomControl: payload.interactive,
        attributionControl: true,
        dragging: payload.interactive,
        touchZoom: payload.interactive,
        doubleClickZoom: payload.interactive,
        scrollWheelZoom: payload.interactive,
        boxZoom: payload.interactive,
        keyboard: payload.interactive,
        tap: payload.interactive,
      }).setView([payload.region.latitude, payload.region.longitude], payload.zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      function post(message) {
        if (!window.ReactNativeWebView) {
          return;
        }

        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }

      function emitRegionChange() {
        const center = map.getCenter();
        const bounds = map.getBounds();
        post({
          type: 'regionChange',
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: Math.abs(bounds.getNorth() - bounds.getSouth()),
          longitudeDelta: Math.abs(bounds.getEast() - bounds.getWest()),
        });
      }

      function setInteractionState(active) {
        post({
          type: 'interaction',
          active,
        });
      }

      function createDivIcon(className, html, size, anchorY) {
        return L.divIcon({
          className: '',
          html: '<div class="' + className + '">' + html + '</div>',
          iconSize: [size, size],
          iconAnchor: [size / 2, anchorY]
        });
      }

      const markerLayer = L.layerGroup().addTo(map);
      let selectedMarker = null;

      function renderMapData(data) {
        markerLayer.clearLayers();

        data.markers.forEach((marker) => {
          const icon = marker.isCluster
            ? createDivIcon('cluster-marker', String(marker.count || 1), 34, 17)
            : marker.variant === 'selection'
              ? createDivIcon(
                  'selection-marker',
                  '<div class="event-pin-core"></div><div class="event-pin-stem"></div>',
                  28,
                  38
                )
              : marker.variant === 'current-location'
                ? createDivIcon('current-location-marker', '', 24, 12)
                : createDivIcon(
                    marker.isSelected ? 'event-pin selected' : 'event-pin',
                    '<div class="event-pin-core"></div><div class="event-pin-stem"></div>',
                    marker.isSelected ? 34 : 28,
                    marker.isSelected ? 46 : 38
                  );

          const leafletMarker = L.marker([marker.latitude, marker.longitude], { icon }).addTo(markerLayer);

          if (marker.title || marker.subtitle) {
            const title = marker.title ? '<strong>' + marker.title + '</strong>' : '';
            const subtitle = marker.subtitle ? '<div style="margin-top:4px;">' + marker.subtitle + '</div>' : '';
            leafletMarker.bindTooltip(title + subtitle);
          }

          leafletMarker.on('click', () => {
            post({
              type: 'markerPress',
              markerId: marker.id,
            });
          });
        });

        if (selectedMarker) {
          markerLayer.removeLayer(selectedMarker);
          selectedMarker = null;
        }

        if (data.selectedCoordinate) {
          const selectedIcon = createDivIcon('picked-marker', '', 24, 12);
          selectedMarker = L.marker(
            [data.selectedCoordinate.latitude, data.selectedCoordinate.longitude],
            { icon: selectedIcon }
          ).addTo(markerLayer);
        }
      }

      window.updateMapData = renderMapData;
      window.setRegion = (lat, lng, zoom) => {
        if (map) {
          map.setView([lat, lng], zoom);
        }
      };
      renderMapData({ markers: [], selectedCoordinate: null });

      if (payload.interactive) {
        map.on('click', (event) => {
          post({
            type: 'mapPress',
            latitude: event.latlng.lat,
            longitude: event.latlng.lng,
          });
        });

        const mapElement = document.getElementById('map');
        if (mapElement) {
          mapElement.addEventListener(
            'touchstart',
            () => {
              setInteractionState(true);
            },
            { passive: true }
          );
          mapElement.addEventListener(
            'touchend',
            (event) => {
              if ((event.touches?.length || 0) === 0) {
                setInteractionState(false);
              }
            },
            { passive: true }
          );
          mapElement.addEventListener(
            'touchcancel',
            () => {
              setInteractionState(false);
            },
            { passive: true }
          );
          mapElement.addEventListener(
            'mouseup',
            () => {
              setInteractionState(false);
            },
            { passive: true }
          );
        }
      }

      map.whenReady(emitRegionChange);
      map.on('moveend', emitRegionChange);
    </script>
  </body>
</html>`;
}

export function OpenStreetMap({
  interactive = true,
  markers = [],
  onMapPress,
  onMarkerPress,
  onRegionChange,
  onInteractionChange,
  region,
  selectedCoordinate = null,
  style,
  viewportKey = 'default',
}: OpenStreetMapProps) {
  const initialRegionRef = useRef(region);
  const lastViewportKeyRef = useRef<number | string>(viewportKey);
  const lastInternalRegionRef = useRef<MapRegion | null>(null);
  const webViewRef = useRef<WebView>(null);
  const latestMapDataRef = useRef({
    markers,
    selectedCoordinate,
  });

  latestMapDataRef.current = {
    markers,
    selectedCoordinate,
  };

  if (lastViewportKeyRef.current !== viewportKey) {
    initialRegionRef.current = region;
    lastViewportKeyRef.current = viewportKey;
  }

  const source = useMemo(
    () => ({
      html: buildHtml({
        interactive,
        region: initialRegionRef.current,
        viewportKey,
      }),
    }),
    [interactive, viewportKey]
  );

  useEffect(() => {
    const payload = JSON.stringify({
      markers,
      selectedCoordinate,
    }).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    webViewRef.current?.injectJavaScript(`
      if (window.updateMapData) {
        window.updateMapData(JSON.parse('${payload}'));
      }
      true;
    `);
  }, [markers, selectedCoordinate]);

  useEffect(() => {
    const internal = lastInternalRegionRef.current;
    const isSame =
      internal &&
      Math.abs(internal.latitude - region.latitude) < 0.0001 &&
      Math.abs(internal.longitude - region.longitude) < 0.0001;

    if (isSame) {
      return;
    }

    const zoom = getZoomFromRegion(region);
    webViewRef.current?.injectJavaScript(`
      if (window.setRegion) {
        window.setRegion(${region.latitude}, ${region.longitude}, ${zoom});
      }
      true;
    `);
  }, [region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta]);

  const syncMapData = () => {
    const payload = JSON.stringify(latestMapDataRef.current).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    webViewRef.current?.injectJavaScript(`
      if (window.updateMapData) {
        window.updateMapData(JSON.parse('${payload}'));
      }
      true;
    `);
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as OpenStreetMapMessage;

      if (message.type === 'mapPress') {
        onMapPress?.({
          latitude: message.latitude,
          longitude: message.longitude,
        });
        return;
      }

      if (message.type === 'markerPress') {
        onMarkerPress?.(message.markerId);
        return;
      }

      if (message.type === 'interaction') {
        onInteractionChange?.(message.active);
        return;
      }

      if (message.type === 'regionChange') {
        const nextRegion = {
          latitude: message.latitude,
          longitude: message.longitude,
          latitudeDelta: message.latitudeDelta,
          longitudeDelta: message.longitudeDelta,
        };
        lastInternalRegionRef.current = nextRegion;
        onRegionChange?.(nextRegion);
      }
    } catch {
      // Ignore malformed WebView bridge events.
    }
  };

  return (
    <View style={style}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={source}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        containerStyle={styles.webViewContainer}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#0f172a" />
          </View>
        )}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={syncMapData}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webViewContainer: {
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});
