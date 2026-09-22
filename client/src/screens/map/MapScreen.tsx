import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, LatLng } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { deviceService } from '../../services/deviceService';
import { Device } from '../../types';

// React 19 JSX typing compatibility wrapper
const MapViewComponent = MapView as any;
const MarkerComponent = Marker as any;

const MAX_DISTANCE = 5000; // S-04 accepts meters (5km default)

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

export function MapScreen({ onNavigateToHome }: MapScreenProps) {
  const [position, setPosition] = useState(null as LatLng | null);
  const [locationState, setLocationState] = useState('loading' as 'loading' | 'ready' | 'denied' | 'error');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [locationAttempt, setLocationAttempt] = useState(0);
  const [devices, setDevices] = useState([] as Device[]);
  const [nearbyState, setNearbyState] = useState('loading' as 'loading' | 'ready' | 'error');
  const [nearbyAttempt, setNearbyAttempt] = useState(0);

  // Persist across effect reruns (including Strict Mode), never re-prompt a denied user automatically.
  const permissionRequest = useRef(null as ReturnType<typeof Location.requestForegroundPermissionsAsync> | null);

  // Flow: Check permission -> Request if needed -> Get current GPS with fallback to last known
  useEffect(() => {
    let active = true;
    setLocationState('loading');
    setPosition(null);

    void (async () => {
      let permissionStatus = 'not-requested';
      let permissionCanAskAgain: boolean | string = 'unknown';
      let servicesEnabled: boolean | string = 'not-checked';
      let providerStatus: Location.LocationProviderStatus | null = null;
      let currentPosition: Location.LocationObject | null = null;
      let lastKnownPosition: Location.LocationObject | null = null;
      let currentPositionResult = 'NOT RUN';
      let lastKnownPositionResult = 'NOT RUN';
      let latitude: number | string = 'unavailable';
      let longitude: number | string = 'unavailable';
      let gpsError: unknown = null;
      let locationSource = 'NONE';

      const errorMessage = (error: unknown) => {
        if (error instanceof Error) return error.message;
        return error ? String(error) : '';
      };

      const logGpsDebug = () => {
        const error = gpsError as { name?: string; message?: string } | null;
        console.log('[GPS DEBUG]');
        console.log('Permission status:', permissionStatus);
        console.log('Can ask again:', permissionCanAskAgain);
        console.log('Location services enabled:', servicesEnabled);
        console.log('Current position:', currentPosition);
        console.log('getCurrentPositionAsync:', currentPositionResult);
        console.log('Latitude:', latitude);
        console.log('Longitude:', longitude);
        console.log('Error name:', error?.name ?? '');
        console.log('Error message:', error?.message ?? (gpsError ? String(gpsError) : ''));
      };

      const logFinalDebug = () => {
        console.log('[GPS FINAL DEBUG]');
        console.log('Environment:');
        console.log('LDPlayer 9 + Expo Go');
        console.log('Permission:', permissionStatus);
        console.log('Can ask again:', permissionCanAskAgain);
        console.log('Services enabled:', servicesEnabled);
        console.log('Provider status:', providerStatus);
        console.log('Accuracy:', 'Location.Accuracy.Balanced');
        console.log('CURRENT POSITION:', currentPositionResult);
        console.log('Current error:', errorMessage(gpsError));
        console.log('LAST KNOWN POSITION:', lastKnownPositionResult);
        console.log('Last known result:', lastKnownPosition);
        console.log('FINAL LOCATION:');
        console.log('latitude:', latitude);
        console.log('longitude:', longitude);
        console.log('Location source:', locationSource);
      };

      try {
        // Calling this on every attempt is safe when permission is already granted and
        // guarantees that Retry re-runs the complete permission -> services -> GPS flow.
        permissionRequest.current ??= Location.requestForegroundPermissionsAsync();
        const permission = await permissionRequest.current;

        if (!active) return;
        permissionStatus = permission.status;
        permissionCanAskAgain = permission.canAskAgain;
        setCanAskAgain(permission.canAskAgain);

        if (!permission.granted) {
          gpsError = new Error(`Foreground location permission is ${permission.status}`);
          logGpsDebug();
          logFinalDebug();
          setLocationState('denied');
          return;
        }

        servicesEnabled = await Location.hasServicesEnabledAsync();

        try {
          providerStatus = await Location.getProviderStatusAsync();
          console.log('[GPS PROVIDER STATUS]', providerStatus);
        } catch (providerError: unknown) {
          // Provider status is diagnostic only; it must not prevent a real location request.
          console.log('[GPS PROVIDER STATUS] unavailable:', errorMessage(providerError));
        }

        if (!servicesEnabled) {
          throw new Error('Location services disabled on device');
        }

        if (!active) return;

        // Try getCurrentPositionAsync with Balanced accuracy (suitable for city-level discovery)
        try {
          currentPosition = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            mayShowUserSettingsDialog: true,
          });
          currentPositionResult = 'PASS';
        } catch (error: unknown) {
          // Preserve and print the real getCurrentPositionAsync error before fallback.
          gpsError = error;
          currentPositionResult = 'FAIL';
          logGpsDebug();
          try {
            // No filters here: this is also a diagnostic for whether Android has ever
            // delivered any location fix to Expo Go on this emulator.
            lastKnownPosition = await Location.getLastKnownPositionAsync();
            lastKnownPositionResult = lastKnownPosition ? 'PASS' : 'FAIL';
          } catch (lastKnownError: unknown) {
            lastKnownPositionResult = 'FAIL';
            console.log('[GPS FALLBACK] Error:', errorMessage(lastKnownError));
          }

          console.log('[GPS FALLBACK]');
          console.log('Last known position:', lastKnownPosition);
          console.log('Latitude:', lastKnownPosition?.coords.latitude ?? 'unavailable');
          console.log('Longitude:', lastKnownPosition?.coords.longitude ?? 'unavailable');
          console.log('Timestamp:', lastKnownPosition?.timestamp ?? 'unavailable');
        }

        if (!active) return;

        const finalPosition = currentPosition ?? lastKnownPosition;
        if (!finalPosition?.coords) {
          throw gpsError || new Error('No location available from current or last known position');
        }

        ({ latitude, longitude } = finalPosition.coords);
        locationSource = currentPosition ? 'CURRENT' : 'LAST_KNOWN';
        if (!validCoordinate(latitude, longitude)) {
          throw new Error(`Invalid GPS coordinates: lat=${latitude}, lng=${longitude}`);
        }

        logGpsDebug();
        console.log('[GPS SUCCESS]');
        console.log('Latitude:', latitude);
        console.log('Longitude:', longitude);
        logFinalDebug();

        setPosition({ latitude: latitude as number, longitude: longitude as number });
        setLocationState('ready');
      } catch (error: unknown) {
        if (!gpsError) gpsError = error;
        logGpsDebug();
        logFinalDebug();
        if (active) setLocationState('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [locationAttempt]);

  // Flow: Location acquired -> Fetch nearby devices from backend API
  useEffect(() => {
    if (!position) return;
    let active = true;
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

        console.log('[C-06 NEARBY]', {
          latitude: position.latitude,
          longitude: position.longitude,
          maxDistance: MAX_DISTANCE,
          status: 200,
          devices: result.length,
          validMarkers: validCount,
        });
      })
      .catch((err: any) => {
        console.log('[C-06 NEARBY] API error:', err?.message || err);
        if (active) setNearbyState('error');
      });

    return () => {
      active = false;
    };
  }, [position, nearbyAttempt]);

  // GeoJSON coordinate mapping: MongoDB [longitude, latitude] -> MapView { latitude, longitude }
  const markers = useMemo(() => {
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
      return [{ device, coordinate: { latitude, longitude } }];
    });
  }, [devices]);

  const retryLocation = () => {
    if (locationState === 'loading') return;
    permissionRequest.current = null;
    setLocationAttempt((attempt: number) => attempt + 1);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="map" size={24} color={colors.light.primary} />
          <Text style={styles.headerTitle}>Gần bạn</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Khám phá thiết bị công nghệ cho thuê quanh vị trí của bạn
        </Text>
      </View>

      {position ? (
        <View style={styles.mapContent}>
          {/* Status Bar showing discovery status */}
          <View style={styles.statusBar} accessibilityLiveRegion="polite">
            {nearbyState === 'loading' && <ActivityIndicator color={colors.light.primary} />}
            <Text style={styles.statusText}>
              {nearbyState === 'loading'
                ? 'Đang tìm thiết bị trong bán kính 5 km…'
                : nearbyState === 'error'
                  ? 'Không thể tải thiết bị gần bạn. Vui lòng thử lại.'
                  : devices.length === 0
                    ? 'Chưa có thiết bị trong bán kính 5 km.'
                    : `${markers.length} thiết bị trên bản đồ · Bán kính 5 km`}
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
            <MapViewComponent
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: position.latitude,
                longitude: position.longitude,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }}
              showsUserLocation
              showsMyLocationButton
            >
              {markers.map(({ device, coordinate }: { device: Device; coordinate: LatLng }) => (
                <MarkerComponent
                  key={device._id}
                  coordinate={coordinate}
                  title={(device as any).name || device.title || 'Thiết bị'}
                />
              ))}
            </MapViewComponent>
          </View>
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
});
