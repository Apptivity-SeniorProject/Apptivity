import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import MapView, { Callout, Marker, type Region } from 'react-native-maps';


import { EventRowCard } from '@/src/components/events/event-row-card';
import { useEvents } from '@/src/hooks/useEvents';
import { useToast } from '@/src/hooks/useToast';
import type { EventListItem } from '@/src/types/event';
import { formatEventDate, formatEventPrice } from '@/src/utils/event-format';

type LocationCluster = {
  key: string;
  city: string;
  count: number;
  latitude: number;
  longitude: number;
};

const DEFAULT_REGION: Region = {
  latitude: 41.015137,
  longitude: 28.97953,
  latitudeDelta: 0.28,
  longitudeDelta: 0.28,
};

const NEARBY_RADIUS_KM = 30;

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

export default function MapScreen() {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [isLocating, setIsLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);
  const toast = useToast();

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
        accuracy: Location.Accuracy.Balanced,
      });

      const nextLocation = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      };

      setUserLocation(nextLocation);

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

  const mappableEvents = useMemo(() => {
    return events.filter((event) => {
      return typeof event.location.lat === 'number' && typeof event.location.lng === 'number';
    });
  }, [events]);

  const nearbyEvents = useMemo(() => {
    if (!userLocation) {
      return [];
    }

    return mappableEvents.filter((event) => {
      const eventLat = event.location.lat as number;
      const eventLng = event.location.lng as number;
      const distance = haversineDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        eventLat,
        eventLng
      );
      return distance <= NEARBY_RADIUS_KM;
    });
  }, [mappableEvents, userLocation]);

  const locationClusters = useMemo<LocationCluster[]>(() => {
    const grouped = new Map<string, { city: string; count: number; latitude: number; longitude: number }>();

    nearbyEvents.forEach((event) => {
      const city = event.location.city ?? event.location.locationLabel ?? 'Bilinmeyen';
      const key = city.toLowerCase();
      const current = grouped.get(key);

      if (!current) {
        grouped.set(key, {
          city,
          count: 1,
          latitude: event.location.lat as number,
          longitude: event.location.lng as number,
        });
        return;
      }

      const nextCount = current.count + 1;
      grouped.set(key, {
        city: current.city,
        count: nextCount,
        latitude: (current.latitude * current.count + (event.location.lat as number)) / nextCount,
        longitude: (current.longitude * current.count + (event.location.lng as number)) / nextCount,
      });
    });

    return Array.from(grouped.entries())
      .map(([key, value]) => ({
        key,
        city: value.city,
        count: value.count,
        latitude: value.latitude,
        longitude: value.longitude,
      }))
      .sort((a, b) => {
        const distanceA = haversineDistanceKm(region.latitude, region.longitude, a.latitude, a.longitude);
        const distanceB = haversineDistanceKm(region.latitude, region.longitude, b.latitude, b.longitude);
        return distanceA - distanceB;
      });
  }, [nearbyEvents, region.latitude, region.longitude]);

  const focusLocation = (cluster: LocationCluster) => {
    const nextRegion: Region = {
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };

    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 450);
  };

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
      <ScrollView className="flex-1" contentContainerClassName="pb-6">
        <View className="px-4 pb-3 pt-5">
          <Text className="text-2xl font-bold text-slate-900">Kesfet</Text>
          <Text className="mt-1 text-sm text-slate-500">Yalnizca 30 km yakinindaki etkinlikler</Text>
        </View>

        <View className="mx-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <View style={{ height: 360 }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={DEFAULT_REGION}
              showsUserLocation
              onRegionChangeComplete={setRegion}>
              {userLocation ? (
                <Marker
                  coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
                  pinColor="#16a34a"
                  title="Konumum"
                />
              ) : null}

              {nearbyEvents.map((event) => (
                <Marker
                  key={event.id}
                  coordinate={{ latitude: event.location.lat as number, longitude: event.location.lng as number }}
                  pinColor={event.isPaid ? '#f97316' : '#0ea5e9'}
                  onCalloutPress={() => router.push(`/event/${event.id}`)}>
                  <Callout tooltip>{renderCalloutContent(event)}</Callout>
                </Marker>
              ))}
            </MapView>
          </View>
        </View>

        {locationDenied ? (
          <View className="mx-4 mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <Text className="text-sm text-amber-800">Konum izni kapali. Yakin etkinlikler gosterilemiyor.</Text>
            <Pressable
              className="mt-2 self-start rounded-full bg-amber-200 px-3 py-1"
              onPress={requestLocationPermission}>
              <Text className="text-xs font-semibold text-amber-900">Izni Tekrar Iste</Text>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pb-2">
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
                    onPress={() => focusLocation(cluster)}>
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
              <Text className="text-sm text-slate-500">Yakinda konum bilgisi olan etkinlik bulunamadi.</Text>
            </View>
          )}
        </View>

        <View className="mt-4 px-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-slate-900">Yakin Etkinlikler</Text>
            <Text className="text-xs text-slate-500">{nearbyEvents.length} etkinlik</Text>
          </View>

          {nearbyEvents.length ? (
            <View className="gap-3">
              {nearbyEvents.slice(0, 10).map((event) => (
                <EventRowCard key={event.id} event={event} onPress={(eventId) => router.push(`/event/${eventId}`)} />
              ))}
            </View>
          ) : (
            <View className="rounded-xl border border-slate-200 bg-white p-4">
              <Text className="text-sm text-slate-500">Konumuna 30 km icinde etkinlik bulunamadi.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
