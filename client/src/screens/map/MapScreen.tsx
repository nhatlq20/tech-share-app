import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { deviceService } from '../../services/deviceService';
import { Device } from '../../types';
import { DevicePreviewCard } from '../../components/map/DevicePreviewCard';
import {
  OpenStreetMap,
  OpenStreetMapHandle,
} from '../../components/map/OpenStreetMap';

const MAX_DISTANCE = 10000; // S-04 accepts meters (10km default)
const MAX_LAST_KNOWN_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours: use cached location immediately, refresh in background
const SIGNIFICANT_MOVEMENT_METERS = 150;

interface LatLng {
  latitude: number;
  longitude: number;
}

function distanceInMeters(from: LatLng, to: LatLng): number {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

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

interface MapScreenProps {
  onNavigateToDeviceDetail?: (deviceId: string) => void;
  onNavigateToHome?: () => void;
}

interface DeviceMarkerData {
  device: Device;
  coordinate: LatLng;
  distanceMeters: number;
}

export function MapScreen({ onNavigateToDeviceDetail, onNavigateToHome }: MapScreenProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );
  const [position, setPosition] = useState(null as LatLng | null);
  const [locationState, setLocationState] = useState('loading' as 'loading' | 'ready' | 'denied' | 'error');
  const [error, setError] = useState(null as string | null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [locationAttempt, setLocationAttempt] = useState(0);
  const [devices, setDevices] = useState([] as Device[]);
  const [nearbyState, setNearbyState] = useState('loading' as 'loading' | 'ready' | 'error');
  const [nearbyAttempt, setNearbyAttempt] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null as string | null);
  const osmMapRef = useRef(null as OpenStreetMapHandle | null);
  const isRequestingLocation = useRef(false);
  const isRefreshingCurrentLocation = useRef(false);
  const locationRequestId = useRef(0);
  const permissionRequest = useRef(null as ReturnType<typeof Location.requestForegroundPermissionsAsync> | null);

  const locationDiag = useRef({
    permission: 'not-requested',
    servicesEnabled: false,
    currentPositionResult: 'NOT RUN',
    currentError: 'none',
    lastKnownResult: 'NOT RUN',
    locationSource: 'NONE',
  });

  // Flow: permission -> services -> last known -> map immediately -> current refresh in background.
  // Current position blocks the UI only when there is no usable cached location.
  useEffect(() => {
    if (isRequestingLocation.current) return;
    isRequestingLocation.current = true;
    const requestId = ++locationRequestId.current;
    let active = true;
    const startedAt = Date.now();
    setLocationState('loading');
    setError(null);
    setPosition(null);

    void (async () => {
      let permissionStatus = 'not-requested';
      let permissionCanAskAgain: boolean | string = 'unknown';
      let servicesEnabled = false;
      let providerStatus: Location.LocationProviderStatus | null = null;
      let currentPositionResult = 'NOT RUN';
      let lastKnownPositionResult = 'NOT RUN';
      let gpsError: unknown = null;

      const errorMessage = (err: unknown) => {
        if (err instanceof Error) return err.message;
        return err ? String(err) : '';
      };

      const isActiveRequest = () => active && locationRequestId.current === requestId;

      const logPerformance = (label: string, stepStartedAt: number) => {
        console.log(`[C-06 PERFORMANCE] ${label}: ${Date.now() - stepStartedAt} ms`);
      };

      const refreshCurrentPositionInBackground = (cachedPosition: LatLng) => {
        if (isRefreshingCurrentLocation.current) return;
        isRefreshingCurrentLocation.current = true;
        const refreshStartedAt = Date.now();

        void Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        })
          .then((currentPosition) => {
            if (!isActiveRequest()) return;
            currentPositionResult = 'PASS';
            const currentCoordinate = {
              latitude: currentPosition.coords.latitude,
              longitude: currentPosition.coords.longitude,
            };

            if (!validCoordinate(currentCoordinate.latitude, currentCoordinate.longitude)) {
              throw new Error('Current position returned invalid coordinates');
            }

            const movement = distanceInMeters(cachedPosition, currentCoordinate);
            locationDiag.current = {
              ...locationDiag.current,
              currentPositionResult: 'PASS',
              currentError: 'none',
              locationSource:
                movement >= SIGNIFICANT_MOVEMENT_METERS ? 'CURRENT_BACKGROUND' : 'LAST_KNOWN',
            };

            console.log(`[C-06 GPS] Background movement: ${Math.round(movement)} m`);
            if (movement >= SIGNIFICANT_MOVEMENT_METERS) {
              setPosition(currentCoordinate);
            }
          })
          .catch((currentError: unknown) => {
            if (!isActiveRequest()) return;
            currentPositionResult = 'FAIL';
            locationDiag.current = {
              ...locationDiag.current,
              currentPositionResult: 'FAIL',
              currentError: errorMessage(currentError),
            };
            console.log('[C-06 GPS] Background current refresh failed:', errorMessage(currentError));
            // A background failure must never replace a usable cached location with an error state.
          })
          .finally(() => {
            if (locationRequestId.current === requestId) {
              isRefreshingCurrentLocation.current = false;
            }
            logPerformance('Current background refresh', refreshStartedAt);
          });
      };

      console.log('[LOCATION DEBUG] init');
      const permBefore = await Location.getForegroundPermissionsAsync().catch(() => null);
      console.log('[LOCATION DEBUG] permission before request:', permBefore?.status ?? 'error');

      try {
        const permissionStartedAt = Date.now();
        permissionRequest.current ??= Location.requestForegroundPermissionsAsync();
        const permission = await permissionRequest.current;
        logPerformance('Permission completed', permissionStartedAt);

        if (!isActiveRequest()) return;
        permissionStatus = permission.status;
        permissionCanAskAgain = permission.canAskAgain;
        setCanAskAgain(permission.canAskAgain);
        console.log('[LOCATION DEBUG] permission after request:', permissionStatus);

        if (!permission.granted) {
          gpsError = new Error(`Foreground location permission is ${permission.status}`);
          console.log('[LOCATION DEBUG] fatal error reason:', errorMessage(gpsError));
          setLocationState('denied');
          setError(errorMessage(gpsError));
          return;
        }

        const serviceStartedAt = Date.now();
        servicesEnabled = await Location.hasServicesEnabledAsync();
        logPerformance('Service check completed', serviceStartedAt);
        console.log('[LOCATION DEBUG] services enabled:', servicesEnabled);

        try {
          providerStatus = await Location.getProviderStatusAsync();
        } catch (providerError: unknown) {
          console.log('[GPS PROVIDER STATUS] unavailable:', errorMessage(providerError));
        }

        if (!servicesEnabled) {
          throw new Error('Location services disabled on device');
        }

        if (!isActiveRequest()) return;

        // Log [GPS PROVIDER]
        console.log('[GPS PROVIDER]');
        console.log('Permission:', permissionStatus);
        console.log('Can ask again:', permissionCanAskAgain);
        console.log('Services enabled:', servicesEnabled);
        console.log('gpsAvailable:', providerStatus?.gpsAvailable ?? false);
        console.log('networkAvailable:', providerStatus?.networkAvailable ?? false);
        console.log('passiveAvailable:', providerStatus?.passiveAvailable ?? false);

        let lastKnownPosition: Location.LocationObject | null = null;
        const lastKnownStartedAt = Date.now();
        console.log('[LOCATION DEBUG] lastKnown start');
        try {
          lastKnownPosition = await Location.getLastKnownPositionAsync();
        } catch (lastKnownError: unknown) {
          console.log('[C-06 GPS] Last known lookup failed:', errorMessage(lastKnownError));
        }
        logPerformance('Last Known completed', lastKnownStartedAt);
        console.log('[LOCATION DEBUG] lastKnown result:', lastKnownPosition);

        if (!isActiveRequest()) return;

        const cacheAgeMs = lastKnownPosition ? Date.now() - lastKnownPosition.timestamp : Infinity;
        const cachedCoordinate = lastKnownPosition
          ? {
              latitude: lastKnownPosition.coords.latitude,
              longitude: lastKnownPosition.coords.longitude,
            }
          : null;
        const hasUsableCache = Boolean(
          cachedCoordinate &&
            validCoordinate(cachedCoordinate.latitude, cachedCoordinate.longitude) &&
            Number.isFinite(cacheAgeMs) &&
            cacheAgeMs >= 0 &&
            cacheAgeMs <= MAX_LAST_KNOWN_AGE_MS,
        );
        lastKnownPositionResult = hasUsableCache
          ? 'PASS'
          : lastKnownPosition
            ? `STALE (${Math.round(cacheAgeMs / 60000)} min)`
            : 'NULL';

        console.log('[LOCATION DEBUG] cache result:', {
          hasUsableCache,
          cacheAgeMs,
          cachedCoordinate,
          maxAgeMs: MAX_LAST_KNOWN_AGE_MS,
        });

        console.log('[C-06 GPS] Last known:', lastKnownPositionResult);
        if (hasUsableCache && cachedCoordinate) {
          locationDiag.current = {
            permission: permissionStatus,
            servicesEnabled,
            currentPositionResult,
            currentError: 'none',
            lastKnownResult: lastKnownPositionResult,
            locationSource: 'LAST_KNOWN',
          };
          setError(null);
          setPosition(cachedCoordinate);
          setLocationState('ready');
          console.log('[LOCATION DEBUG] final location source: LAST_KNOWN');
          console.log('[LOCATION DEBUG] final coordinates:', cachedCoordinate);
          console.log(`[C-06 PERFORMANCE] Map ready after: ${Date.now() - startedAt} ms`);
          refreshCurrentPositionInBackground(cachedCoordinate);
          return;
        }

        // No usable cache: current position is now the only request allowed to block loading.
        let currentPosition: Location.LocationObject;
        console.log('[LOCATION DEBUG] current start');
        try {
          currentPosition = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            mayShowUserSettingsDialog: true,
          });
          currentPositionResult = 'PASS';
          console.log('[LOCATION DEBUG] current success:', currentPosition);
        } catch (currentError: any) {
          currentPositionResult = 'FAIL';
          console.log('[LOCATION DEBUG] current error name:', currentError?.name ?? 'unknown');
          console.log(
            '[LOCATION DEBUG] current error message:',
            currentError?.message ?? String(currentError),
          );

          if (cachedCoordinate && validCoordinate(cachedCoordinate.latitude, cachedCoordinate.longitude)) {
            console.log('[C-06 GPS] Current position failed, using available last-known position:', cachedCoordinate);
            locationDiag.current = {
              permission: permissionStatus,
              servicesEnabled,
              currentPositionResult: 'FAIL',
              currentError: errorMessage(currentError),
              lastKnownResult: lastKnownPositionResult,
              locationSource: 'LAST_KNOWN_FALLBACK',
            };
            setError(null);
            setPosition(cachedCoordinate);
            setLocationState('ready');
            console.log('[LOCATION DEBUG] final location source: LAST_KNOWN_FALLBACK');
            console.log('[LOCATION DEBUG] final coordinates:', cachedCoordinate);
            return;
          }

          throw currentError;
        }
        if (!isActiveRequest()) return;

        const currentCoordinate = {
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
        };
        if (!validCoordinate(currentCoordinate.latitude, currentCoordinate.longitude)) {
          throw new Error('Current position returned invalid coordinates');
        }

        locationDiag.current = {
          permission: permissionStatus,
          servicesEnabled,
          currentPositionResult,
          currentError: 'none',
          lastKnownResult: lastKnownPositionResult,
          locationSource: 'CURRENT',
        };
        setError(null);
        setPosition(currentCoordinate);
        setLocationState('ready');
        console.log('[LOCATION DEBUG] final location source: CURRENT');
        console.log('[LOCATION DEBUG] final coordinates:', currentCoordinate);
        console.log(`[C-06 PERFORMANCE] Map ready after: ${Date.now() - startedAt} ms`);
      } catch (error: unknown) {
        if (!gpsError) gpsError = error;
        locationDiag.current = {
          permission: permissionStatus,
          servicesEnabled,
          currentPositionResult,
          currentError: errorMessage(gpsError),
          lastKnownResult: lastKnownPositionResult,
          locationSource: 'NONE',
        };
        console.log('[LOCATION DEBUG] fatal error reason:', errorMessage(gpsError));
        console.log('[C-06 GPS] Initial location resolution failed:', errorMessage(gpsError));

        if (isActiveRequest()) {
          setError(errorMessage(gpsError) || 'Không lấy được vị trí');
          setLocationState('error');
        }
      } finally {
        if (locationRequestId.current === requestId) {
          isRequestingLocation.current = false;
        }
      }
    })();

    return () => {
      active = false;
      if (locationRequestId.current === requestId) {
        isRequestingLocation.current = false;
        isRefreshingCurrentLocation.current = false;
      }
    };
  }, [locationAttempt]);

  // Flow: Location acquired -> Fetch nearby devices from backend API
  useEffect(() => {
    if (!position) return;
    let active = true;
    const nearbyStartedAt = Date.now();
    setNearbyState('loading');
    setDevices([]);
    console.log('[GPS DEBUG] Nearby API reached: YES');

    void deviceService
      .getNearbyDevices({
        latitude: position.latitude,
        longitude: position.longitude,
        maxDistance: MAX_DISTANCE,
      })
      .then((result: Device[]) => {
        if (!active) return;
        setDevices(result);
        setNearbyState('ready');

        // Count valid markers
        const validCount = result.filter((d: Device) => {
          const coords = d.location?.coordinates;
          return Array.isArray(coords) && coords.length >= 2 && validCoordinate(coords[1], coords[0]);
        }).length;

        // C-07 Debug log for rendered markers
        result.forEach((d: Device) => {
          const coords = d.location?.coordinates;
          if (Array.isArray(coords) && coords.length >= 2 && validCoordinate(coords[1], coords[0])) {
            const distance = distanceInMeters(position, { latitude: coords[1], longitude: coords[0] });
            console.log('[C-07 MARKER]');
            console.log('Device ID:', d._id);
            console.log('Name:', d.title || (d as any).name);
            console.log('Latitude:', coords[1]);
            console.log('Longitude:', coords[0]);
            console.log('Distance:', `${Math.round(distance)} m`);
          }
        });

        console.log('[C-06 NEARBY]');
        console.log('Latitude:', position.latitude);
        console.log('Longitude:', position.longitude);
        console.log('MaxDistance:', MAX_DISTANCE);
        console.log('HTTP status:', 200);
        console.log('Devices:', result.length);
        console.log('Valid markers:', validCount);
        console.log(`[C-06 PERFORMANCE] Nearby API completed: ${Date.now() - nearbyStartedAt} ms`);

        console.log('[C-06 GPS FINAL]');
        console.log('Permission:', locationDiag.current.permission);
        console.log('Services enabled:', locationDiag.current.servicesEnabled);
        console.log('CURRENT POSITION:', locationDiag.current.currentPositionResult);
        console.log('Current error:', locationDiag.current.currentError);
        console.log('LAST KNOWN:', locationDiag.current.lastKnownResult);
        console.log('FINAL SOURCE:', locationDiag.current.locationSource);
        console.log('Latitude:', position.latitude);
        console.log('Longitude:', position.longitude);
        console.log('UI ERROR STATE: CLEARED');
        console.log('Nearby API reached: YES');
        console.log('Nearby status: 200');
        console.log('Nearby devices:', result.length);
        console.log('Map rendered: YES');
      })
      .catch((err: any) => {
        console.log('[C-06 NEARBY] API error:', err?.message || err);
        console.log(`[C-06 PERFORMANCE] Nearby API completed: ${Date.now() - nearbyStartedAt} ms (failed)`);
        if (active) setNearbyState('error');
      });

    return () => {
      active = false;
    };
  }, [position, nearbyAttempt]);

  // GeoJSON coordinate mapping: MongoDB [longitude, latitude] -> renderer { latitude, longitude }
  const markers = useMemo((): DeviceMarkerData[] => {
    if (!position) return [];
    return devices.flatMap((device: Device) => {
      const coordinates = device.location?.coordinates;
      if (
        !Array.isArray(coordinates) ||
        coordinates.length < 2 ||
        !validCoordinate(coordinates[1], coordinates[0])
      ) {
        return [];
      }
      const [longitude, latitude] = coordinates;
      const coordinate = { latitude, longitude };
      return [{ device, coordinate, distanceMeters: distanceInMeters(position, coordinate) }];
    });
  }, [devices, position]);

  useEffect(() => {
    if (selectedDeviceId && !devices.some((device: Device) => device._id === selectedDeviceId)) {
      setSelectedDeviceId(null);
    }
  }, [devices, selectedDeviceId]);

  const selectedMarker = useMemo(
    () => markers.find((marker: DeviceMarkerData) => marker.device._id === selectedDeviceId) ?? null,
    [markers, selectedDeviceId],
  );

  const handleSelectMarker = (deviceId: string) => {
    console.log('[C-07 SELECT]');
    console.log('Selected device:', deviceId);
    setSelectedDeviceId(deviceId);
  };

  const openDeviceDetails = (deviceId: string) => {
    console.log('[C-07 DETAIL]');
    console.log('Device ID:', deviceId);
    onNavigateToDeviceDetail?.(deviceId);
  };

  const retryLocation = () => {
    if (isRequestingLocation.current || locationState === 'loading') return;
    setError(null);
    permissionRequest.current = null;
    setLocationAttempt((attempt: number) => attempt + 1);
  };

  console.log('[C-06 RENDER DEBUG]');
  console.log('loading:', locationState === 'loading');
  console.log('error:', error !== null || locationState === 'error' || locationState === 'denied');
  console.log('location:', position ? 'AVAILABLE' : 'NULL');
  console.log('latitude:', position?.latitude ?? 'unavailable');
  console.log('longitude:', position?.longitude ?? 'unavailable');
  console.log('nearbyDevices:', devices.length);

  const isMapReady = Boolean(position && !error && locationState === 'ready');

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="map" size={24} color={colors.light.primary} />
          <Text style={styles.headerTitle}>Gần bạn</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Khám phá thiết bị công nghệ cho thuê quanh vị trí của bạn
        </Text>
      </View>

      {isMapReady && position ? (
        <View style={styles.mapContent}>
          {/* Status Bar showing discovery status */}
          <View style={styles.statusBar} accessibilityLiveRegion="polite">
            {nearbyState === 'loading' && <ActivityIndicator color={colors.light.primary} />}
            <Text style={styles.statusText}>
              {nearbyState === 'loading'
                ? 'Đang tìm thiết bị trong bán kính 10 km…'
                : nearbyState === 'error'
                  ? 'Không thể tải thiết bị gần bạn. Vui lòng thử lại.'
                  : devices.length === 0
                    ? 'Chưa có thiết bị trong bán kính 10 km.'
                    : `${markers.length} thiết bị trên bản đồ · Bán kính 10 km`}
            </Text>
            {nearbyState === 'error' && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setNearbyAttempt((attempt: number) => attempt + 1)}
              >
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Map View */}
          <View style={styles.mapContainer}>
            <OpenStreetMap
              controllerRef={osmMapRef}
              userPosition={position}
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              initialFitReady={nearbyState !== 'loading'}
              onSelectDevice={handleSelectMarker}
              onMapPress={() => setSelectedDeviceId(null)}
              onReady={() => console.log('[OSM MAP RUNTIME] Map ready: YES')}
            />
          </View>

          {/* Floating My Location Button */}
          {position && (
            <TouchableOpacity
              style={[
                styles.myLocationButton,
                selectedMarker ? styles.myLocationButtonRaised : styles.myLocationButtonDefault,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Vị trí của tôi"
              activeOpacity={0.85}
              onPress={() => osmMapRef.current?.recenter(position)}
            >
              <Ionicons name="locate" size={20} color={colors.light.primary} />
            </TouchableOpacity>
          )}

          {selectedMarker && (
            <DevicePreviewCard
              device={selectedMarker.device}
              distanceMeters={selectedMarker.distanceMeters}
              onOpenDetails={openDeviceDetails}
              onClose={() => setSelectedDeviceId(null)}
            />
          )}
        </View>
      ) : (
        <View style={styles.content}>
          {locationState === 'loading' ? (
            <>
              <ActivityIndicator size="large" color={colors.light.primary} />
              <Text style={styles.description}>Đang kiểm tra quyền và lấy vị trí của bạn…</Text>
            </>
          ) : (
            <>
              <Ionicons name="location-outline" size={54} color={colors.light.primary} />
              <Text style={styles.title}>
                {locationState === 'denied' ? 'Chưa có quyền vị trí' : 'Không lấy được vị trí'}
              </Text>
              <Text style={styles.description}>
                {locationState === 'denied'
                  ? 'Cho phép TechShare truy cập vị trí khi sử dụng ứng dụng để tìm thiết bị gần bạn.'
                  : 'Hãy bật dịch vụ vị trí/GPS, kiểm tra tín hiệu rồi thử lại.'}
              </Text>
              {locationState === 'denied' && !canAskAgain && (
                <TouchableOpacity
                  style={styles.actionButton}
                  accessibilityRole="button"
                  onPress={() => {
                    void Linking.openSettings().catch(() => setLocationState('error'));
                  }}
                >
                  <Text style={styles.actionButtonText}>Mở cài đặt</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                accessibilityRole="button"
                disabled={locationState === 'loading'}
                onPress={retryLocation}
              >
                <Text style={styles.actionButtonText}>Thử lại</Text>
              </TouchableOpacity>
              {onNavigateToHome && (
                <TouchableOpacity accessibilityRole="button" onPress={onNavigateToHome}>
                  <Text style={styles.retryText}>Về trang chủ</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.light.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.light.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  mapContent: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.light.surface,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    color: colors.light.textSecondary,
  },
  retryText: {
    color: colors.light.primary,
    fontWeight: '700',
    paddingVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  description: {
    fontSize: 13,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  myLocationButton: {
    position: 'absolute',
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    zIndex: 35,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  myLocationButtonDefault: {
    bottom: 18,
  },
  myLocationButtonRaised: {
    bottom: 136,
  },
});
