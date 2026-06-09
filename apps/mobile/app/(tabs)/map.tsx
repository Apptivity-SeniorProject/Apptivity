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
import { IconSymbol } from '@/components/ui/icon-symbol';
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
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
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

  const visibleEvents = useMemo(() => {
    return mappableEvents.filter((event) => {
      const eventLat = event.location.lat as number;
      const eventLng = event.location.lng as number;
      
      // Calculate boundaries of the current region with a small buffer
      const latBuffer = region.latitudeDelta * 0.5;
      const lngBuffer = region.longitudeDelta * 0.5;
      
      const minLat = region.latitude - region.latitudeDelta / 2 - latBuffer;
      const maxLat = region.latitude + region.latitudeDelta / 2 + latBuffer;
      const minLng = region.longitude - region.longitudeDelta / 2 - lngBuffer;
      const maxLng = region.longitude + region.longitudeDelta / 2 + lngBuffer;
      
      return (
        eventLat >= minLat &&
        eventLat <= maxLat &&
        eventLng >= minLng &&
        eventLng <= maxLng
      );
    });
  }, [mappableEvents, region]);

  const locationClusters = useMemo<LocationCluster[]>(() => {
    const grouped = new Map<string, { city: string; count: number; latitude: number; longitude: number }>();

    visibleEvents.forEach((event) => {
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
  }, [visibleEvents, region.latitude, region.longitude]);

  const displayedEvents = useMemo(() => {
    if (!selectedEventId) {
      return visibleEvents.slice(0, 10);
    }
    
    // Make sure the selected event is always at the top of the list
    const selectedEvent = visibleEvents.find(e => e.id === selectedEventId);
    const otherEvents = visibleEvents.filter(e => e.id !== selectedEventId).slice(0, 9);
    
    if (selectedEvent) {
      return [selectedEvent, ...otherEvents];
    }
    
    return visibleEvents.slice(0, 10);
  }, [visibleEvents, selectedEventId]);

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
      <ScrollView ref={scrollViewRef} className="flex-1" contentContainerClassName="pb-6">
        <View className="px-4 pb-3 pt-5">
          <Text className="text-3xl font-extrabold text-slate-900">Keşfet</Text>
          <Text className="mt-1 text-[13px] font-medium text-slate-500">Haritada görüntülenen alandaki etkinlikler</Text>
        </View>

        <View className="mx-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <View style={{ height: 380 }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={DEFAULT_REGION}
              showsUserLocation
              onRegionChangeComplete={setRegion}>
              {visibleEvents.map((event) => {
                const isSelected = event.id === selectedEventId;
                return (
                  <Marker
                    key={event.id}
                    coordinate={{ latitude: event.location.lat as number, longitude: event.location.lng as number }}
                    zIndex={isSelected ? 100 : 1}
                    onPress={() => {
                      setSelectedEventId(event.id);
                      // Scroll down to the list smoothly
                      scrollViewRef.current?.scrollTo({ y: 440, animated: true });
                    }}
                    onCalloutPress={() => router.push(`/event/${event.id}`)}>
                    <View 
                      className={`items-center justify-center rounded-full border-2 border-white shadow-md ${
                        isSelected ? 'h-10 w-10 bg-[#357c1c]' : 'h-8 w-8 bg-[#77e349]'
                      }`}>
                      <IconSymbol name="star.fill" size={isSelected ? 18 : 14} color="white" />
                    </View>
                    <Callout tooltip>{renderCalloutContent(event)}</Callout>
                  </Marker>
                );
              })}
            </MapView>
          </View>
        </View>

        {locationDenied ? (
          <View className="mx-4 mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <Text className="text-[13px] font-medium text-orange-800">Konum izni kapali. Harita mevcut konumunuza odaklanamiyor.</Text>
            <Pressable
              className="mt-3 self-start rounded-xl bg-orange-200/50 px-3 py-1.5"
              onPress={requestLocationPermission}>
              <Text className="text-[12px] font-semibold text-orange-900">İzin Ver</Text>
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

        <View className="mt-5 px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[17px] font-bold text-slate-900">Haritadaki Etkinlikler</Text>
            <View className={`px-2.5 py-1 rounded-full border ${visibleEvents.length > 0 ? 'bg-[#f0fce8] border-[#bbf09e]' : 'bg-slate-50 border-slate-200'}`}>
              <Text className={`text-xs font-semibold ${visibleEvents.length > 0 ? 'text-[#357c1c]' : 'text-slate-500'}`}>
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
              <Text className="text-sm text-slate-500">Konumuna 30 km icinde etkinlik bulunamadi.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
