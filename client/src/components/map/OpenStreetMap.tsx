import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { colors } from '../../theme/colors';
import { Device } from '../../types';

// React 19 JSX typing compatibility wrapper used by this repository.
const WebViewComponent = WebView as any;

export interface Coordinate {
  latitude: number;
  longitude: number;
}

interface LeafletDevice {
  _id: string;
  price: number;
  latitude: number;
  longitude: number;
}

export interface OpenStreetMapHandle {
  recenter: (position: Coordinate) => void;
}

// Backward-compatible alias
export type OpenStreetMapFallbackHandle = OpenStreetMapHandle;

export interface OpenStreetMapProps {
  controllerRef?: { current: OpenStreetMapHandle | null };
  userPosition: Coordinate;
  devices: Device[];
  selectedDeviceId: string | null;
  initialFitReady?: boolean;
  onSelectDevice: (deviceId: string) => void;
  onMapPress: () => void;
  onReady?: () => void;
}

// Backward-compatible alias
export type OpenStreetMapFallbackProps = OpenStreetMapProps;

type WebMessage =
  | { type: 'MAP_READY' }
  | { type: 'MAP_PRESSED' }
  | { type: 'DEVICE_SELECTED'; deviceId?: unknown }
  | { type: 'MAP_ERROR'; message?: unknown }
  | { type: 'TILE_ERROR'; url?: unknown }
  | { type: 'RENDER_STATE'; deviceCount?: unknown; fitPointCount?: unknown };

function validCoordinate(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180
  );
}

function toLeafletDevices(devices: Device[]): LeafletDevice[] {
  return devices.flatMap((device) => {
    const coordinates = device.location?.coordinates;
    if (
      !Array.isArray(coordinates) ||
      coordinates.length < 2 ||
      !validCoordinate(coordinates[1], coordinates[0])
    ) {
      return [];
    }

    const [longitude, latitude] = coordinates;
    const rawPrice = device.dailyRate ?? (device as any).pricePerDay ?? 0;
    return [{
      _id: String(device._id),
      price: Number.isFinite(Number(rawPrice)) ? Number(rawPrice) : 0,
      latitude,
      longitude,
    }];
  });
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildLeafletHtml(initialData: {
  userPosition: Coordinate;
  devices: LeafletDevice[];
  selectedDeviceId: string | null;
  initialFitReady: boolean;
}): string {
  const serializedInitialData = serializeForInlineScript(initialData);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://unpkg.com; style-src 'unsafe-inline' https://unpkg.com; img-src https://tile.openstreetmap.org data: blob:;" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body { position: fixed; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #e8edf2; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      #map { position: absolute; inset: 0; width: 100%; height: 100%; background: #e8edf2; }
      .leaflet-container { touch-action: none; }
      .leaflet-control-attribution { font-size: 10px; background: rgba(255,255,255,.9) !important; }
      .price-marker { background: transparent; border: 0; }
      .price-pill {
        display: inline-flex;
        min-width: 48px;
        height: 28px;
        padding: 0 8px;
        box-sizing: border-box;
        align-items: center;
        justify-content: center;
        border: 2px solid #2563eb;
        border-radius: 14px;
        background: #fff;
        color: #2563eb;
        font-size: 12px;
        font-weight: 800;
        line-height: 24px;
        white-space: nowrap;
        box-shadow: 0 2px 5px rgba(15, 23, 42, .22);
        transform: translate(-50%, -50%);
      }
      .price-pill.selected {
        border-color: #fff;
        background: #2563eb;
        color: #fff;
        box-shadow: 0 4px 9px rgba(37, 99, 235, .42);
        transform: translate(-50%, -50%) scale(1.08);
      }
      .user-marker {
        width: 18px;
        height: 18px;
        box-sizing: border-box;
        border: 3px solid #fff;
        border-radius: 50%;
        background: #2563eb;
        box-shadow: 0 0 0 7px rgba(37,99,235,.22), 0 2px 5px rgba(15,23,42,.3);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      var initialData = ${serializedInitialData};
      var map = null;
      var tileLayer = null;
      var userMarker = null;
      var deviceMarkers = Object.create(null);
      var currentDevices = initialData.devices || [];
      var selectedDeviceId = initialData.selectedDeviceId || null;
      var initialFitDone = false;
      var mapReadySent = false;
      var tileErrorCount = 0;

      function send(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function reportError(message) {
        send({ type: 'MAP_ERROR', message: String(message || 'Unable to load the map.') });
      }

      function formatPrice(value) {
        var price = Number(value);
        if (!Number.isFinite(price) || price <= 0) return '0K';
        if (price >= 1000000) {
          var millions = price / 1000000;
          return (Number.isInteger(millions) ? String(millions) : String(Number(millions.toFixed(1)))) + 'M';
        }
        if (price >= 1000) {
          var thousands = price / 1000;
          return (Number.isInteger(thousands) ? String(thousands) : String(Number(thousands.toFixed(1)))) + 'K';
        }
        return String(price);
      }

      function markerIcon(device, selected) {
        return L.divIcon({
          className: 'price-marker',
          html: '<div class="price-pill' + (selected ? ' selected' : '') + '">' + formatPrice(device.price) + '</div>',
          iconSize: [1, 1],
          iconAnchor: [0, 0]
        });
      }

      function updateUserLocation(position) {
        if (!map || !position || !Number.isFinite(position.latitude) || !Number.isFinite(position.longitude)) return;
        var latLng = [position.latitude, position.longitude];
        if (userMarker) {
          userMarker.setLatLng(latLng);
          return;
        }
        userMarker = L.marker(latLng, {
          interactive: false,
          keyboard: false,
          zIndexOffset: 2000,
          icon: L.divIcon({ className: '', html: '<div class="user-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] })
        }).addTo(map);
      }

      function clearDeviceMarkers() {
        Object.keys(deviceMarkers).forEach(function (id) {
          map.removeLayer(deviceMarkers[id]);
        });
        deviceMarkers = Object.create(null);
      }

      function renderDevices(devices) {
        if (!map) return;
        currentDevices = Array.isArray(devices) ? devices : [];
        clearDeviceMarkers();
        currentDevices.forEach(function (device) {
          if (!device || !Number.isFinite(device.latitude) || !Number.isFinite(device.longitude)) return;
          var id = String(device._id);
          var marker = L.marker([device.latitude, device.longitude], {
            icon: markerIcon(device, id === selectedDeviceId),
            keyboard: true,
            riseOnHover: true,
            zIndexOffset: id === selectedDeviceId ? 1000 : 0
          }).addTo(map);
          marker.on('click', function (event) {
            if (event && event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
            send({ type: 'DEVICE_SELECTED', deviceId: id });
          });
          deviceMarkers[id] = marker;
        });
        send({ type: 'RENDER_STATE', deviceCount: Object.keys(deviceMarkers).length });
      }

      function updateSelection(deviceId) {
        selectedDeviceId = deviceId == null ? null : String(deviceId);
        currentDevices.forEach(function (device) {
          var id = String(device._id);
          var marker = deviceMarkers[id];
          if (!marker) return;
          var selected = id === selectedDeviceId;
          marker.setIcon(markerIcon(device, selected));
          marker.setZIndexOffset(selected ? 1000 : 0);
        });
      }

      function fitInitialView() {
        if (!map || initialFitDone) return;
        var points = [[initialData.userPosition.latitude, initialData.userPosition.longitude]];
        currentDevices.forEach(function (device) {
          if (Number.isFinite(device.latitude) && Number.isFinite(device.longitude)) {
            points.push([device.latitude, device.longitude]);
          }
        });
        initialFitDone = true;
        send({ type: 'RENDER_STATE', fitPointCount: points.length });
        if (points.length > 1) {
          map.fitBounds(points, { padding: [42, 42], maxZoom: 15, animate: false });
        } else {
          map.setView(points[0], 14, { animate: false });
        }
      }

      function handleNativeMessage(event) {
        try {
          var message = JSON.parse(event.data);
          if (!message || typeof message.type !== 'string') return;
          if (message.type === 'UPDATE_DEVICES') {
            renderDevices(message.devices);
            if (message.initialFitReady) fitInitialView();
          } else if (message.type === 'UPDATE_USER_LOCATION') {
            updateUserLocation(message);
          } else if (message.type === 'SET_SELECTED_DEVICE') {
            updateSelection(message.deviceId);
          } else if (message.type === 'RECENTER') {
            if (map && Number.isFinite(message.latitude) && Number.isFinite(message.longitude)) {
              map.flyTo([message.latitude, message.longitude], Math.max(map.getZoom(), 15), { duration: 0.35 });
            }
          }
        } catch (error) {
          reportError(error && error.message ? error.message : error);
        }
      }

      document.addEventListener('message', handleNativeMessage);
      window.addEventListener('message', handleNativeMessage, true);
      window.__TECHSHARE_RECEIVE__ = handleNativeMessage;

      function initializeMap() {
        try {
          if (!window.L || map) return;
          map = L.map('map', {
            attributionControl: false,
            zoomControl: true,
            dragging: true,
            touchZoom: true,
            doubleClickZoom: true,
            scrollWheelZoom: true,
            boxZoom: false
          });
          L.control.attribution({ position: 'topright', prefix: false }).addTo(map);
          tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            minZoom: 2,
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          });
          tileLayer.on('tileload', function () {
            if (!mapReadySent) {
              mapReadySent = true;
              send({ type: 'MAP_READY' });
            }
          });
          tileLayer.on('tileerror', function (event) {
            tileErrorCount += 1;
            console.log('[OSM TILE ERROR]', event && event.tile ? event.tile.src : 'unknown tile');
            send({ type: 'TILE_ERROR', url: event && event.tile ? event.tile.src : '' });
            if (!mapReadySent && tileErrorCount >= 4) reportError('Unable to load OpenStreetMap.');
          });
          tileLayer.addTo(map);
          map.on('click', function () { send({ type: 'MAP_PRESSED' }); });
          updateUserLocation(initialData.userPosition);
          map.setView([initialData.userPosition.latitude, initialData.userPosition.longitude], 14, { animate: false });
          renderDevices(currentDevices);
          if (initialData.initialFitReady) fitInitialView();
        } catch (error) {
          reportError(error && error.message ? error.message : error);
        }
      }

      var leafletScript = document.createElement('script');
      leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      leafletScript.onload = initializeMap;
      leafletScript.onerror = function () { reportError('Unable to load Leaflet.'); };
      document.head.appendChild(leafletScript);
      window.setTimeout(function () {
        if (!map) reportError('Leaflet timed out.');
      }, 15000);
    </script>
  </body>
</html>`;
}

export function OpenStreetMap({
  controllerRef,
  userPosition,
  devices,
  selectedDeviceId,
  initialFitReady = true,
  onSelectDevice,
  onMapPress,
  onReady,
}: OpenStreetMapProps) {
  const webViewRef = useRef(null as any);
  const initialData = useRef({
    userPosition,
    devices: toLeafletDevices(devices),
    selectedDeviceId,
    initialFitReady,
  });
  const html = useMemo(() => buildLeafletHtml(initialData.current), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null as string | null);
  const [retryKey, setRetryKey] = useState(0);

  const sendToWeb = (message: object) => {
    const data = JSON.stringify(JSON.stringify(message))
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
    webViewRef.current?.injectJavaScript(
      `window.__TECHSHARE_RECEIVE__ && window.__TECHSHARE_RECEIVE__({ data: ${data} }); true;`,
    );
  };

  useEffect(() => {
    if (controllerRef) {
      controllerRef.current = {
        recenter: (position: Coordinate) => {
          sendToWeb({ type: 'RECENTER', latitude: position.latitude, longitude: position.longitude });
        },
      };
    }
    return () => {
      if (controllerRef) {
        controllerRef.current = null;
      }
    };
  }, [controllerRef]);

  useEffect(() => {
    if (!ready) return;
    sendToWeb({
      type: 'UPDATE_DEVICES',
      devices: toLeafletDevices(devices),
      initialFitReady,
    });
  }, [devices, initialFitReady, ready]);

  useEffect(() => {
    if (!ready) return;
    sendToWeb({
      type: 'UPDATE_USER_LOCATION',
      latitude: userPosition.latitude,
      longitude: userPosition.longitude,
    });
  }, [ready, userPosition.latitude, userPosition.longitude]);

  useEffect(() => {
    if (!ready) return;
    sendToWeb({ type: 'SET_SELECTED_DEVICE', deviceId: selectedDeviceId });
  }, [ready, selectedDeviceId]);

  const handleMessage = (event: WebViewMessageEvent) => {
    let message: WebMessage;
    try {
      message = JSON.parse(event.nativeEvent.data) as WebMessage;
    } catch {
      if (__DEV__) console.log('[OSM MESSAGE ERROR] Invalid WebView message');
      return;
    }

    switch (message.type) {
      case 'MAP_READY':
        setReady(true);
        setError(null);
        onReady?.();
        break;
      case 'DEVICE_SELECTED':
        if (typeof message.deviceId === 'string') onSelectDevice(message.deviceId);
        break;
      case 'MAP_PRESSED':
        onMapPress();
        break;
      case 'TILE_ERROR':
        if (__DEV__) console.log('[OSM TILE ERROR]', message.url ?? 'unknown tile');
        break;
      case 'MAP_ERROR':
        setError(typeof message.message === 'string' ? message.message : 'Unable to load the map.');
        break;
      case 'RENDER_STATE':
        if (__DEV__) {
          if (typeof message.deviceCount === 'number') {
            console.log('[OSM RENDER] Device markers:', message.deviceCount);
          }
          if (typeof message.fitPointCount === 'number') {
            console.log('[OSM RENDER] Initial fit points:', message.fitPointCount);
          }
        }
        break;
    }
  };

  const retry = () => {
    setReady(false);
    setError(null);
    setRetryKey((value: number) => value + 1);
  };

  return (
    <View style={styles.container}>
      <WebViewComponent
        key={retryKey}
        ref={webViewRef}
        style={styles.webView}
        source={{ html, baseUrl: 'https://techshare.local/' }}
        originWhitelist={['https://*']}
        javaScriptEnabled={true}
        domStorageEnabled={false}
        mixedContentMode="never"
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        androidLayerType="hardware"
        nestedScrollEnabled={true}
        onMessage={handleMessage}
        onError={() => setError('Unable to load the map.')}
        onHttpError={() => setError('Unable to load the map.')}
        onRenderProcessGone={() => setError('The map renderer stopped unexpectedly.')}
      />

      {!ready && !error && (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.light.primary} />
          <Text style={styles.loadingText}>Loading OpenStreetMap...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={retry}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Backward-compatible export
export const OpenStreetMapFallback = OpenStreetMap;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EDF2' },
  webView: { flex: 1, backgroundColor: '#E8EDF2' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(248, 250, 252, 0.88)',
  },
  loadingText: { color: colors.light.textSecondary, fontSize: 13 },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    backgroundColor: '#F8FAFC',
  },
  errorText: { color: colors.light.textPrimary, fontSize: 14, textAlign: 'center' },
  retryButton: {
    borderRadius: 10,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
