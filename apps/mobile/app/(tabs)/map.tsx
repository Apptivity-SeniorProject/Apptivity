import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import MapView, { Callout, Marker, type Region } from 'react-native-maps';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { EventRowCard } from '@/src/components/events/event-row-card';
import { useEvents } from '@/src/hooks/useEvents';
import { useToast } from '@/src/hooks/useToast';
import type { EventListItem } from '@/src/types/event';
import { formatEventDate, formatEventPrice } from '@/src/utils/event-format';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type LocationCluster = {
  key: string;
  city: string;
  count: number;
  latitude: number;
  longitude: number;
  events: EventListItem[];
};

type MapMarkerItem = {
  key: string;
  latitude: number;
  longitude: number;
  count: number;
  events: EventListItem[];
  primaryEvent: EventListItem;
  isCluster: boolean;
};

const DEFAULT_REGION: Region = {
  latitude: 41.015137,
  longitude: 28.97953,
  latitudeDelta: 0.28,
  longitudeDelta: 0.28,
};

const CLUSTER_ZOOM_THRESHOLD = 0.12;
const CITY_CLUSTER_ZOOM_THRESHOLD = 0.28;
const HIDE_MARKERS_ZOOM_THRESHOLD = 6;
const SINGLE_EVENT_FOCUS_DELTA = 0.04;
const CLUSTER_MARKER_WIDTH = 44;
const CLUSTER_MARKER_HEIGHT = 44;
const DEFAULT_EVENT_MARKER_WIDTH = 32;
const DEFAULT_EVENT_MARKER_HEIGHT = 32;
const SELECTED_EVENT_MARKER_WIDTH = 40;
const SELECTED_EVENT_MARKER_HEIGHT = 40;
const CLUSTER_EDGE_PADDING = {
  top: 72,
  right: 72,
  bottom: 72,
  left: 72,
};

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function getEventCoordinate(event: EventListItem): Coordinate {
  return {
    latitude: event.location.lat as number,
    longitude: event.location.lng as number,
  };
}

function getCentroidCoordinate(events: EventListItem[]): Coordinate {
  const totals = events.reduce(
    (accumulator, event) => {
      const coordinate = getEventCoordinate(event);
      accumulator.latitude += coordinate.latitude;
      accumulator.longitude += coordinate.longitude;
      return accumulator;
    },
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: totals.latitude / events.length,
    longitude: totals.longitude / events.length,
  };
}

function buildRegionForCoordinate(coordinate: Coordinate): Region {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta: SINGLE_EVENT_FOCUS_DELTA,
    longitudeDelta: SINGLE_EVENT_FOCUS_DELTA,
  };
}

export default function MapScreen() {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [isLocating, setIsLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const { events, isPending } = useEvents({ pageSize: 100 });

  const requestLocationPermission = useCallback(async () => {
    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationDenied(true);
        toast.error('Yakin etkinlikler icin konum izni vermelisiniz.');
        return;
      }

      setLocationDenied(false);

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const nextLocation = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      };

      const nextRegion: Region = {
        ...nextLocation,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      };

      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 450);
    } catch {
      toast.error('Konum bilgisi alinamadi.');
    } finally {
      setIsLocating(false);
    }
  }, [toast]);

  useEffect(() => {
    void requestLocationPermission();
  }, [requestLocationPermission]);

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    }, [queryClient])
  );

  const mappableEvents = useMemo(() => {
    return events.filter((event) => {
      return typeof event.location.lat === 'number' && typeof event.location.lng === 'number';
    });
  }, [events]);

  const visibleEvents = useMemo(() => {
    return mappableEvents.filter((event) => {
      const eventLat = event.location.lat as number;
      const eventLng = event.location.lng as number;

      const latBuffer = region.latitudeDelta * 0.5;
      const lngBuffer = region.longitudeDelta * 0.5;

      const minLat = region.latitude - region.latitudeDelta / 2 - latBuffer;
      const maxLat = region.latitude + region.latitudeDelta / 2 + latBuffer;
      const minLng = region.longitude - region.longitudeDelta / 2 - lngBuffer;
      const maxLng = region.longitude + region.longitudeDelta / 2 + lngBuffer;

      return eventLat >= minLat && eventLat <= maxLat && eventLng >= minLng && eventLng <= maxLng;
    });
  }, [mappableEvents, region]);

  const focusEvents = useCallback((eventsToFocus: EventListItem[]) => {
    if (!eventsToFocus.length) {
      return;
    }

    if (eventsToFocus.length === 1) {
      const coordinate = getEventCoordinate(eventsToFocus[0]);
      const nextRegion = buildRegionForCoordinate(coordinate);
      setSelectedEventId(eventsToFocus[0].id);
      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 450);
      return;
    }

    setSelectedEventId(null);
    mapRef.current?.fitToCoordinates(
      eventsToFocus.map((event) => getEventCoordinate(event)),
      {
        edgePadding: CLUSTER_EDGE_PADDING,
        animated: true,
      }
    );
  }, []);

  const locationClusters = useMemo<LocationCluster[]>(() => {
    const grouped = new Map<string, { city: string; events: EventListItem[] }>();

    visibleEvents.forEach((event) => {
      const city = event.location.city ?? event.location.locationLabel ?? 'Bilinmeyen';
      const key = city.toLocaleLowerCase('tr-TR');
      const current = grouped.get(key);

      if (!current) {
        grouped.set(key, {
          city,
          events: [event],
        });
        return;
      }

      current.events.push(event);
    });

    return Array.from(grouped.entries())
      .map(([key, value]) => {
        const coordinate = getCentroidCoordinate(value.events);

        return {
          key,
          city: value.city,
          count: value.events.length,
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          events: value.events,
        };
      })
      .sort((a, b) => {
        const distanceA = haversineDistanceKm(
          region.latitude,
          region.longitude,
          a.latitude,
          a.longitude
        );
        const distanceB = haversineDistanceKm(
          region.latitude,
          region.longitude,
          b.latitude,
          b.longitude
        );
        return distanceA - distanceB;
      });
  }, [visibleEvents, region.latitude, region.longitude]);

  const mapMarkers = useMemo<MapMarkerItem[]>(() => {
    const shouldHideMarkers =
      region.latitudeDelta >= HIDE_MARKERS_ZOOM_THRESHOLD ||
      region.longitudeDelta >= HIDE_MARKERS_ZOOM_THRESHOLD;
    const shouldCluster =
      region.latitudeDelta >= CLUSTER_ZOOM_THRESHOLD ||
      region.longitudeDelta >= CLUSTER_ZOOM_THRESHOLD;
    const shouldCityCluster =
      region.latitudeDelta >= CITY_CLUSTER_ZOOM_THRESHOLD ||
      region.longitudeDelta >= CITY_CLUSTER_ZOOM_THRESHOLD;

    if (shouldHideMarkers) {
      return [];
    }

    if (!shouldCluster) {
      return visibleEvents.map((event) => {
        const coordinate = getEventCoordinate(event);

        return {
          key: event.id,
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          count: 1,
          events: [event],
          primaryEvent: event,
          isCluster: false,
        };
      });
    }

    if (shouldCityCluster) {
      return locationClusters.map((cluster) => ({
        key: `city-${cluster.key}`,
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        count: cluster.count,
        events: cluster.events,
        primaryEvent: cluster.events[0],
        isCluster: true,
      }));
    }

    const latStep = Math.max(region.latitudeDelta / 8, 0.015);
    const lngStep = Math.max(region.longitudeDelta / 8, 0.015);
    const grouped = new Map<string, EventListItem[]>();

    visibleEvents.forEach((event) => {
      const coordinate = getEventCoordinate(event);
      const latBucket = Math.floor(coordinate.latitude / latStep);
      const lngBucket = Math.floor(coordinate.longitude / lngStep);
      const key = `${latBucket}:${lngBucket}`;
      const current = grouped.get(key);

      if (!current) {
        grouped.set(key, [event]);
        return;
      }

      current.push(event);
    });

    return Array.from(grouped.entries()).map(([key, groupedEvents]) => {
      const coordinate = getCentroidCoordinate(groupedEvents);

      return {
        key,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        count: groupedEvents.length,
        events: groupedEvents,
        primaryEvent: groupedEvents[0],
        isCluster: groupedEvents.length > 1,
      };
    });
  }, [locationClusters, region.latitudeDelta, region.longitudeDelta, visibleEvents]);

  const displayedEvents = useMemo(() => {
    if (!selectedEventId) {
      return visibleEvents.slice(0, 10);
    }

    const selectedEvent = visibleEvents.find((event) => event.id === selectedEventId);
    const otherEvents = visibleEvents.filter((event) => event.id !== selectedEventId).slice(0, 9);

    if (selectedEvent) {
      return [selectedEvent, ...otherEvents];
    }

    return visibleEvents.slice(0, 10);
  }, [visibleEvents, selectedEventId]);

  const handleMarkerPress = useCallback(
    (marker: MapMarkerItem) => {
      if (marker.isCluster) {
        focusEvents(marker.events);
        return;
      }

      setSelectedEventId(marker.primaryEvent.id);
      scrollViewRef.current?.scrollTo({ y: 440, animated: true });
    },
    [focusEvents]
  );

  const renderCalloutContent = (event: EventListItem) => {
    const locationText = event.location.locationLabel ?? event.location.city ?? 'Lokasyon belirtilmedi';

    return (
      <View className="min-w-56 max-w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Image
          source={{
            uri:
              event.bannerImageUrl ??
              'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
          }}
          style={{ width: '100%', height: 90 }}
          contentFit="cover"
        />
        <View className="p-3">
          <Text className="text-sm font-semibold text-slate-900">{event.title}</Text>
          <Text className="mt-1 text-xs text-slate-600">
            {formatEventDate(event.date)} - {event.time.slice(0, 5)}
          </Text>
          <Text className="mt-1 text-xs text-slate-500" numberOfLines={1}>
            {locationText}
          </Text>
          <Text className="mt-1 text-xs font-semibold text-blue-700">
            {formatEventPrice(event.price, event.isPaid)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView ref={scrollViewRef} className="flex-1" contentContainerClassName="pb-6">
        <View className="px-4 pb-3 pt-5">
          <Text className="text-3xl font-extrabold text-slate-900">Kesfet</Text>
          <Text className="mt-1 text-[13px] font-medium text-slate-500">
            Haritada goruntulenen alandaki etkinlikler
          </Text>
        </View>

        <View className="mx-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <View style={{ height: 380 }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={DEFAULT_REGION}
              showsUserLocation
              onRegionChangeComplete={setRegion}>
              {mapMarkers.map((marker) => {
                if (marker.isCluster) {
                  return (
                    <Marker
                      key={marker.key}
                      coordinate={{
                        latitude: marker.latitude,
                        longitude: marker.longitude,
                      }}
                      anchor={Platform.OS === 'ios' ? undefined : { x: 0.5, y: 1 }}
                      centerOffset={
                        Platform.OS === 'ios'
                          ? { x: 0, y: -(CLUSTER_MARKER_HEIGHT / 2) }
                          : undefined
                      }
                      tracksViewChanges={true}
                      onPress={() => handleMarkerPress(marker)}>
                      <View
                        collapsable={false}
                        style={{
                          width: CLUSTER_MARKER_WIDTH,
                          height: CLUSTER_MARKER_HEIGHT,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <View className="h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#357c1c] shadow-md">
                          <Text className="font-sans-bold text-sm text-white">{marker.count}</Text>
                        </View>
                      </View>
                    </Marker>
                  );
                }

                const isSelected = marker.primaryEvent.id === selectedEventId;
                const markerWidth = isSelected
                  ? SELECTED_EVENT_MARKER_WIDTH
                  : DEFAULT_EVENT_MARKER_WIDTH;
                const markerHeight = isSelected
                  ? SELECTED_EVENT_MARKER_HEIGHT
                  : DEFAULT_EVENT_MARKER_HEIGHT;

                return (
                  <Marker
                    key={marker.key}
                    coordinate={{
                      latitude: marker.latitude,
                      longitude: marker.longitude,
                    }}
                    anchor={Platform.OS === 'ios' ? undefined : { x: 0.5, y: 1 }}
                    centerOffset={
                      Platform.OS === 'ios' ? { x: 0, y: -(markerHeight / 2) } : undefined
                    }
                    tracksViewChanges={true}
                    zIndex={isSelected ? 100 : 1}
                    onPress={() => handleMarkerPress(marker)}
                    onCalloutPress={() => router.push(`/event/${marker.primaryEvent.id}`)}>
                    <View
                      collapsable={false}
                      style={{
                        width: markerWidth,
                        height: markerHeight,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <View
                        className={`items-center justify-center rounded-full border-2 border-white shadow-md ${
                          isSelected ? 'h-10 w-10 bg-[#357c1c]' : 'h-8 w-8 bg-[#77e349]'
                        }`}>
                        <IconSymbol name="calendar" size={isSelected ? 18 : 14} color="#ffffff" />
                      </View>
                    </View>
                    <Callout tooltip>{renderCalloutContent(marker.primaryEvent)}</Callout>
                  </Marker>
                );
              })}
            </MapView>
          </View>
        </View>

        {locationDenied ? (
          <View className="mx-4 mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <Text className="text-[13px] font-medium text-orange-800">
              Konum izni kapali. Harita mevcut konumunuza odaklanamiyor.
            </Text>
            <Pressable
              className="mt-3 self-start rounded-xl bg-orange-200/50 px-3 py-1.5"
              onPress={requestLocationPermission}>
              <Text className="text-[12px] font-semibold text-orange-900">Izin Ver</Text>
            </Pressable>
          </View>
        ) : null}

        <View className="mt-4 px-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-slate-900">Yakin Konumlar</Text>
            {isLocating ? <ActivityIndicator size="small" color="#0f172a" /> : null}
          </View>

          {isPending ? (
            <View className="h-16 items-center justify-center rounded-xl border border-slate-200 bg-white">
              <ActivityIndicator color="#0f172a" />
            </View>
          ) : locationClusters.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 pb-2">
              {locationClusters.map((cluster) => {
                const distance = haversineDistanceKm(
                  region.latitude,
                  region.longitude,
                  cluster.latitude,
                  cluster.longitude
                );

                return (
                  <Pressable
                    key={cluster.key}
                    className="w-56 rounded-2xl border border-slate-200 bg-white p-4"
                    onPress={() => focusEvents(cluster.events)}>
                    <Text className="text-base font-semibold text-slate-900">{cluster.city}</Text>
                    <Text className="mt-1 text-sm text-slate-600">
                      {distance.toFixed(1)} km - {cluster.count} etkinlik
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View className="rounded-xl border border-slate-200 bg-white p-4">
              <Text className="text-sm text-slate-500">
                Yakinda konum bilgisi olan etkinlik bulunamadi.
              </Text>
            </View>
          )}
        </View>

        <View className="mt-5 px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[17px] font-bold text-slate-900">Haritadaki Etkinlikler</Text>
            <View
              className={`rounded-full border px-2.5 py-1 ${
                visibleEvents.length > 0
                  ? 'bg-[#f0fce8] border-[#bbf09e]'
                  : 'bg-slate-50 border-slate-200'
              }`}>
              <Text
                className={`text-xs font-semibold ${
                  visibleEvents.length > 0 ? 'text-[#357c1c]' : 'text-slate-500'
                }`}>
                {visibleEvents.length} etkinlik
              </Text>
            </View>
          </View>

          {displayedEvents.length ? (
            <View className="gap-3">
              {displayedEvents.map((event) => (
                <EventRowCard
                  key={event.id}
                  event={event}
                  isHighlighted={event.id === selectedEventId}
                  onPress={(eventId) => router.push(`/event/${eventId}`)}
                />
              ))}
            </View>
          ) : (
            <View className="rounded-xl border border-slate-200 bg-white p-4">
              <Text className="text-sm text-slate-500">
                Konumuna 30 km icinde etkinlik bulunamadi.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
