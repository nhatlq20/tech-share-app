import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
const LOCATION_ACCURACY = Location.Accuracy.High;

interface LatLng {
  latitude: number;
  longitude: number;
}

type LocationRefreshReason = 'initial' | 'focus' | 'foreground';

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
  const [locationState, setLocationState] = useState(
    'loading' as 'loading' | 'ready' | 'denied' | 'disabled' | 'error'
  );
  const [error, setError] = useState(null as string | null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [locationAttempt, setLocationAttempt] = useState(0);
  const [nearbyPosition, setNearbyPosition] = useState(null as LatLng | null);
  const [devices, setDevices] = useState([] as Device[]);
  const [nearbyState, setNearbyState] = useState('loading' as 'loading' | 'ready' | 'error');
  const [nearbyAttempt, setNearbyAttempt] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null as string | null);
  const osmMapRef = useRef(null as OpenStreetMapHandle | null);
  const isRequestingLocation = useRef(false);
  const isRefreshingCurrentLocation = useRef(false);
  const locationRequestId = useRef(0);
  const latestPositionRef = useRef(null as LatLng | null);
  const nearbyAnchorRef = useRef(null as LatLng | null);
  const nearbyRequestSequenceRef = useRef(0);
  const latestNearbyRequestRef = useRef(0);
  const refreshCurrentLocationRef = useRef(
    null as ((reason: LocationRefreshReason) => void) | null,
  );
  const mapRendererReadyRef = useRef(false);
  const pendingCameraPositionRef = useRef(null as LatLng | null);
  const cameraAnchorRef = useRef(null as LatLng | null);
  const appStateRef = useRef(AppState.currentState);
  const permissionRequest = useRef(null as ReturnType<typeof Location.requestForegroundPermissionsAsync> | null);

  const locationDiag = useRef({
    permission: 'not-requested',
    servicesEnabled: false,
    currentPositionResult: 'NOT RUN',
    currentError: 'none',
    lastKnownResult: 'NOT RUN',
    locationSource: 'NONE',
  });

  const applyDetectedLocation = (
    coordinate: LatLng,
    source: 'CACHE' | 'LAST_KNOWN' | 'CURRENT',
    timestamp: number,
    forceNearby = false,
    moveCamera = false,
  ) => {
    const previous = latestPositionRef.current;
    const nearbyAnchor = nearbyAnchorRef.current;
    const movement = nearbyAnchor ? distanceInMeters(nearbyAnchor, coordinate) : Infinity;
    const positionMovement = previous ? distanceInMeters(previous, coordinate) : Infinity;
    const positionChanged = !previous || positionMovement >= SIGNIFICANT_MOVEMENT_METERS;
    const cameraAnchor = cameraAnchorRef.current;
    const cameraChanged = !cameraAnchor ||
      distanceInMeters(cameraAnchor, coordinate) >= SIGNIFICANT_MOVEMENT_METERS;
    const shouldRefetchNearby = forceNearby || !nearbyAnchor || movement >= SIGNIFICANT_MOVEMENT_METERS;

    if (__DEV__ && (positionChanged || source !== 'CURRENT')) {
      console.log(
        `[LOCATION] New position: ${coordinate.latitude}, ${coordinate.longitude} ` +
          `(source=${source}, timestamp=${timestamp})`,
      );
      console.log(
        `[LOCATION] Previous position: ${previous ? `${previous.latitude}, ${previous.longitude}` : 'NONE'}`,
      );
      console.log(`[LOCATION] Position changed: ${positionChanged}`);
    }

    latestPositionRef.current = coordinate;
    setPosition(coordinate);
    setError(null);
    setLocationState('ready');

    if (shouldRefetchNearby) {
      nearbyAnchorRef.current = coordinate;
      // Invalidate the in-flight request immediately; do not wait for the next effect commit.
      latestNearbyRequestRef.current = nearbyRequestSequenceRef.current + 1;
      setNearbyPosition(coordinate);
    }

    if (!cameraAnchor) cameraAnchorRef.current = coordinate;

    if (moveCamera && cameraAnchor && cameraChanged) {
      cameraAnchorRef.current = coordinate;
      pendingCameraPositionRef.current = coordinate;
      if (mapRendererReadyRef.current && osmMapRef.current) {
        osmMapRef.current.recenter(coordinate);
        pendingCameraPositionRef.current = null;
        if (__DEV__) {
          console.log(
            `[MAP] Moving camera to lat=${coordinate.latitude}, lng=${coordinate.longitude}`,
          );
        }
      }
    }
  };

  // Flow: permission -> services -> last known -> map immediately -> current refresh in background.
  // Current position blocks the UI only when there is no usable cached location.
  useEffect(() => {
    if (isRequestingLocation.current) return;
    isRequestingLocation.current = true;
    const requestId = ++locationRequestId.current;
    let active = true;
    let locationSubscription: Location.LocationSubscription | null = null;
    let refreshFromLifecycle: ((reason: LocationRefreshReason) => void) | null = null;
    setLocationState('loading');
    setError(null);
    setPosition(null);
    setNearbyPosition(null);
    mapRendererReadyRef.current = false;
    pendingCameraPositionRef.current = null;
    cameraAnchorRef.current = null;
    latestPositionRef.current = null;
    nearbyAnchorRef.current = null;

    void (async () => {
      let permissionStatus = 'not-requested';
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

      const startLocationWatch = async () => {
        try {
          const subscription = await Location.watchPositionAsync(
            {
              accuracy: LOCATION_ACCURACY,
              timeInterval: 1000,
              distanceInterval: 1,
            },
            (location) => {
              if (!isActiveRequest()) return;
              const coordinate = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              };
              if (!validCoordinate(coordinate.latitude, coordinate.longitude)) return;

              locationDiag.current = {
                ...locationDiag.current,
                currentPositionResult: 'PASS',
                currentError: 'none',
                locationSource: 'CURRENT',
              };
              applyDetectedLocation(coordinate, 'CURRENT', location.timestamp);
            },
          );

          if (!isActiveRequest()) {
            subscription.remove();
            return;
          }
          locationSubscription = subscription;
          if (__DEV__) console.log('[LOCATION] Watch started');
        } catch (watchError: unknown) {
          if (__DEV__) console.log(`[LOCATION] Watch failed: ${errorMessage(watchError)}`);
          // Keep the last usable position and current markers when a refresh fails.
        }
      };

      const requestFreshCurrentPosition = async (
        reason: LocationRefreshReason,
        moveCamera: boolean,
      ) => {
        if (isRefreshingCurrentLocation.current || !isActiveRequest()) return;
        isRefreshingCurrentLocation.current = true;
        const refreshStartedAt = Date.now();

        if (__DEV__) console.log(`[LOCATION] Requesting fresh position (reason=${reason})`);

        try {
          const currentPosition = await Location.getCurrentPositionAsync({
            accuracy: LOCATION_ACCURACY,
            mayShowUserSettingsDialog: true,
          });
          if (!isActiveRequest()) return;

          currentPositionResult = 'PASS';
          const currentCoordinate = {
            latitude: currentPosition.coords.latitude,
            longitude: currentPosition.coords.longitude,
          };
          if (!validCoordinate(currentCoordinate.latitude, currentCoordinate.longitude)) {
            throw new Error('Current position returned invalid coordinates');
          }

          const previous = latestPositionRef.current;
          const changed = !previous ||
            distanceInMeters(previous, currentCoordinate) >= SIGNIFICANT_MOVEMENT_METERS;
          if (__DEV__) {
            console.log(
              `[LOCATION] Fresh position: ${currentCoordinate.latitude}, ${currentCoordinate.longitude}`,
            );
            console.log(
              `[LOCATION] Previous position: ${previous ? `${previous.latitude}, ${previous.longitude}` : 'NONE'}`,
            );
            console.log(`[LOCATION] Position changed: ${changed}`);
          }

          locationDiag.current = {
            ...locationDiag.current,
            currentPositionResult: 'PASS',
            currentError: 'none',
            locationSource: 'CURRENT',
          };
          applyDetectedLocation(
            currentCoordinate,
            'CURRENT',
            currentPosition.timestamp,
            false,
            moveCamera,
          );
        } catch (currentError: unknown) {
          if (!isActiveRequest()) return;
          currentPositionResult = 'FAIL';
          locationDiag.current = {
            ...locationDiag.current,
            currentPositionResult: 'FAIL',
            currentError: errorMessage(currentError),
          };
          if (__DEV__) {
            console.log(`[LOCATION] Fresh position failed: ${errorMessage(currentError)}`);
          }
          // A refresh failure must never replace a usable position with a fatal error.
        } finally {
          if (locationRequestId.current === requestId) {
            isRefreshingCurrentLocation.current = false;
          }
          if (__DEV__) {
            console.log(`[LOCATION] Fresh position completed in ${Date.now() - refreshStartedAt} ms`);
          }
        }
      };

      const permBefore = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (__DEV__) console.log(`[LOCATION] Permission before request: ${permBefore?.status ?? 'error'}`);

      try {
        permissionRequest.current ??= Location.requestForegroundPermissionsAsync();
        const permission = await permissionRequest.current;

        if (!isActiveRequest()) return;
        permissionStatus = permission.status;
        setCanAskAgain(permission.canAskAgain);
        if (__DEV__) console.log(`[LOCATION] Permission: ${permissionStatus}`);

        if (!permission.granted) {
          gpsError = new Error(`Foreground location permission is ${permission.status}`);
          if (__DEV__) console.log(`[LOCATION] Permission unavailable: ${errorMessage(gpsError)}`);
          setLocationState('denied');
          setError('Location permission is required.');
          return;
        }

        servicesEnabled = await Location.hasServicesEnabledAsync();
        if (__DEV__) console.log(`[LOCATION] Services enabled: ${servicesEnabled}`);

        try {
          providerStatus = await Location.getProviderStatusAsync();
        } catch (providerError: unknown) {
          if (__DEV__) console.log(`[LOCATION] Provider status unavailable: ${errorMessage(providerError)}`);
        }

        if (__DEV__) {
          console.log(
            `[LOCATION] Providers: gps=${providerStatus?.gpsAvailable ?? false}, ` +
              `network=${providerStatus?.networkAvailable ?? false}, ` +
              `passive=${providerStatus?.passiveAvailable ?? false}`,
          );
        }

        if (!servicesEnabled) {
          gpsError = new Error('Location services disabled on device');
          setError('Location services are disabled.');
          setLocationState('disabled');
          return;
        }

        refreshFromLifecycle = (reason: LocationRefreshReason) => {
          void requestFreshCurrentPosition(reason, reason !== 'initial');
        };
        refreshCurrentLocationRef.current = refreshFromLifecycle;

        if (!isActiveRequest()) return;

        let lastKnownPosition: Location.LocationObject | null = null;
        try {
          lastKnownPosition = await Location.getLastKnownPositionAsync();
        } catch (lastKnownError: unknown) {
          if (__DEV__) console.log(`[LOCATION] Last-known failed: ${errorMessage(lastKnownError)}`);
        }

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

        if (__DEV__) {
          console.log(
            cachedCoordinate
              ? `[LOCATION] Last-known: ${cachedCoordinate.latitude}, ${cachedCoordinate.longitude}; ` +
                  `ageMs=${Math.round(cacheAgeMs)}; usable=${hasUsableCache}`
              : '[LOCATION] Last-known: NONE',
          );
        }
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
          applyDetectedLocation(
            cachedCoordinate,
            'LAST_KNOWN',
            lastKnownPosition?.timestamp ?? Date.now(),
            true,
          );
          if (__DEV__) console.log('[LOCATION] Initial source: LAST_KNOWN');
          refreshFromLifecycle?.('initial');
          void startLocationWatch();
          return;
        }

        // No usable cache: current position is now the only request allowed to block loading.
        let currentPosition: Location.LocationObject;
        if (__DEV__) console.log('[LOCATION] Requesting current position (no usable last-known)');
        try {
          currentPosition = await Location.getCurrentPositionAsync({
            accuracy: LOCATION_ACCURACY,
            mayShowUserSettingsDialog: true,
          });
          currentPositionResult = 'PASS';
        } catch (currentError: any) {
          currentPositionResult = 'FAIL';
          if (__DEV__) console.log(`[LOCATION] Current position failed: ${errorMessage(currentError)}`);

          if (cachedCoordinate && validCoordinate(cachedCoordinate.latitude, cachedCoordinate.longitude)) {
            locationDiag.current = {
              permission: permissionStatus,
              servicesEnabled,
              currentPositionResult: 'FAIL',
              currentError: errorMessage(currentError),
              lastKnownResult: lastKnownPositionResult,
              locationSource: 'LAST_KNOWN_FALLBACK',
            };
            setError(null);
            applyDetectedLocation(
              cachedCoordinate,
              'CACHE',
              lastKnownPosition?.timestamp ?? Date.now(),
              true,
            );
            void startLocationWatch();
            if (__DEV__) console.log('[LOCATION] Initial source: LAST_KNOWN_FALLBACK');
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
        applyDetectedLocation(currentCoordinate, 'CURRENT', currentPosition.timestamp, true);
        void startLocationWatch();
        if (__DEV__) console.log('[LOCATION] Initial source: CURRENT');
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
        if (__DEV__) console.log(`[LOCATION] Initial resolution failed: ${errorMessage(gpsError)}`);

        if (isActiveRequest()) {
          setError('Unable to determine your location.');
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
      locationSubscription?.remove();
      if (__DEV__ && locationSubscription) console.log('[LOCATION] Watch removed');
      if (refreshCurrentLocationRef.current === refreshFromLifecycle) {
        refreshCurrentLocationRef.current = null;
      }
      if (locationRequestId.current === requestId) {
        isRequestingLocation.current = false;
        isRefreshingCurrentLocation.current = false;
      }
    };
  }, [locationAttempt]);

  useFocusEffect(
    useCallback(() => {
      if (__DEV__) console.log('[LOCATION] Screen focused');
      refreshCurrentLocationRef.current?.('focus');
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: typeof AppState.currentState) => {
        const previousState = appStateRef.current;
        appStateRef.current = nextState;
        if (__DEV__ && previousState !== nextState) {
          console.log(`[LIFECYCLE] AppState ${previousState} -> ${nextState}`);
        }
        if (
          nextState === 'active' &&
          (previousState === 'background' || previousState === 'inactive')
        ) {
          refreshCurrentLocationRef.current?.('foreground');
        }
      },
    );

    return () => subscription.remove();
  }, []);

  // Flow: Location acquired -> Fetch nearby devices from backend API
  useEffect(() => {
    if (!nearbyPosition) return;
    let active = true;
    const nearbyRequestId = ++nearbyRequestSequenceRef.current;
    latestNearbyRequestRef.current = nearbyRequestId;
    const nearbyStartedAt = Date.now();
    setNearbyState('loading');
    setDevices([]);
    if (__DEV__) {
      console.log(
        `[NEARBY] Request started: id=${nearbyRequestId}, lat=${nearbyPosition.latitude}, ` +
          `lng=${nearbyPosition.longitude}, radius=${MAX_DISTANCE}`,
      );
    }

    void deviceService
      .getNearbyDevices({
        latitude: nearbyPosition.latitude,
        longitude: nearbyPosition.longitude,
        maxDistance: MAX_DISTANCE,
      })
      .then((result: Device[]) => {
        if (!active || latestNearbyRequestRef.current !== nearbyRequestId) {
          if (__DEV__) console.log(`[NEARBY] Ignored stale response: id=${nearbyRequestId}`);
          return;
        }
        setDevices(result);
        setNearbyState('ready');
        if (__DEV__) {
          console.log(
            `[NEARBY] Received devices: ${result.length} ` +
              `(id=${nearbyRequestId}, ${Date.now() - nearbyStartedAt} ms)`,
          );
          console.log(`[MAP] Marker data updated: ${result.length} devices`);
        }
      })
      .catch((err: any) => {
        if (!active || latestNearbyRequestRef.current !== nearbyRequestId) {
          if (__DEV__) console.log(`[NEARBY] Ignored stale error: id=${nearbyRequestId}`);
          return;
        }
        if (__DEV__) {
          console.log(`[NEARBY] Request failed: id=${nearbyRequestId}, error=${err?.message || err}`);
        }
        if (active) setNearbyState('error');
      });

    return () => {
      active = false;
    };
  }, [nearbyPosition, nearbyAttempt]);

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
    setSelectedDeviceId(deviceId);
  };

  const openDeviceDetails = (deviceId: string) => {
    onNavigateToDeviceDetail?.(deviceId);
  };

  const retryLocation = () => {
    if (isRequestingLocation.current || locationState === 'loading') return;
    setError(null);
    permissionRequest.current = null;
    setLocationAttempt((attempt: number) => attempt + 1);
  };

  const isMapReady = Boolean(position && !error && locationState === 'ready');

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="map" size={24} color={colors.light.primary} />
          <Text style={styles.headerTitle}>Nearby Devices</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Discover rental tech devices near your location
        </Text>
      </View>

      {isMapReady && position ? (
        <View style={styles.mapContent}>
          {/* Status Bar showing discovery status */}
          <View style={styles.statusBar} accessibilityLiveRegion="polite">
            {nearbyState === 'loading' && <ActivityIndicator color={colors.light.primary} />}
            <Text style={styles.statusText}>
              {nearbyState === 'loading'
                ? 'Searching for devices within 10 km…'
                : nearbyState === 'error'
                  ? 'Unable to load nearby devices.'
                  : devices.length === 0
                    ? 'No nearby devices'
                    : `${markers.length} devices on the map · 10 km radius`}
            </Text>
            {nearbyState === 'error' && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setNearbyAttempt((attempt: number) => attempt + 1)}
              >
                <Text style={styles.retryText}>Try Again</Text>
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
              onReady={() => {
                mapRendererReadyRef.current = true;
                if (__DEV__) console.log('[MAP] Renderer ready');
                const pendingPosition = pendingCameraPositionRef.current;
                if (pendingPosition && osmMapRef.current) {
                  osmMapRef.current.recenter(pendingPosition);
                  pendingCameraPositionRef.current = null;
                  if (__DEV__) {
                    console.log(
                      `[MAP] Moving camera to lat=${pendingPosition.latitude}, lng=${pendingPosition.longitude}`,
                    );
                  }
                }
              }}
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
              accessibilityLabel="My Location"
              activeOpacity={0.85}
              onPress={() => {
                cameraAnchorRef.current = position;
                osmMapRef.current?.recenter(position);
              }}
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
              <Text style={styles.description}>Getting your location...</Text>
            </>
          ) : (
            <>
              <Ionicons name="location-outline" size={54} color={colors.light.primary} />
              <Text style={styles.title}>
                {locationState === 'denied'
                  ? 'Location Permission Required'
                  : locationState === 'disabled'
                    ? 'Location Services Disabled'
                    : 'Location Unavailable'}
              </Text>
              <Text style={styles.description}>
                {error || 'Unable to determine your location.'}
              </Text>
              {locationState === 'denied' && !canAskAgain && (
                <TouchableOpacity
                  style={styles.actionButton}
                  accessibilityRole="button"
                  onPress={() => {
                    void Linking.openSettings().catch(() => setLocationState('error'));
                  }}
                >
                  <Text style={styles.actionButtonText}>Open Settings</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                accessibilityRole="button"
                disabled={locationState === 'loading'}
                onPress={retryLocation}
              >
                <Text style={styles.actionButtonText}>Try Again</Text>
              </TouchableOpacity>
              {onNavigateToHome && (
                <TouchableOpacity accessibilityRole="button" onPress={onNavigateToHome}>
                  <Text style={styles.retryText}>Back to Home</Text>
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
