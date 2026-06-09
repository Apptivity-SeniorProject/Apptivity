import { format, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

import type { EventLocation } from '@/src/types/event';

export function formatEventDate(date: string): string {
  try {
    const parsed = parse(date, 'yyyy-MM-dd', new Date());
    return format(parsed, 'd MMMM yyyy', { locale: tr });
  } catch {
    return date;
  }
}

export function formatEventPrice(price: number, isPaid: boolean): string {
  if (!isPaid || price <= 0) {
    return 'Ücretsiz';
  }

  return `${price.toLocaleString('tr-TR')} TL`;
}

function normalizeLocationValue(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getAreaSegment(fullAddress?: string, city?: string): string | undefined {
  const segments = fullAddress
    ?.split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!segments?.length) {
    return undefined;
  }

  const normalizedCity = city?.toLocaleLowerCase('tr-TR');
  const nonCitySegments = normalizedCity
    ? segments.filter((segment) => segment.toLocaleLowerCase('tr-TR') !== normalizedCity)
    : segments;

  const neighborhoodSegment = nonCitySegments.find((segment) =>
    /\b(mah|mahallesi|mh\.?|mahalle)\b/i.test(segment)
  );

  if (neighborhoodSegment) {
    return neighborhoodSegment;
  }

  return nonCitySegments[nonCitySegments.length - 1] ?? segments[0];
}

export function formatLocationShort(location?: EventLocation): string {
  if (!location) {
    return 'Konum belirtilmedi';
  }

  const city = normalizeLocationValue(location.city);
  const fullAddress = normalizeLocationValue(location.fullAddress);
  const label = normalizeLocationValue(location.locationLabel);
  const areaSegment = getAreaSegment(fullAddress, city);

  if (areaSegment && city) {
    if (areaSegment.toLocaleLowerCase('tr-TR') !== city.toLocaleLowerCase('tr-TR')) {
      return `${areaSegment}, ${city}`;
    }

    return city;
  }

  if (label && city) {
    if (label.toLocaleLowerCase('tr-TR') !== city.toLocaleLowerCase('tr-TR')) {
      return `${label}, ${city}`;
    }

    return city;
  }

  if (city) {
    return city;
  }

  if (areaSegment) {
    return areaSegment;
  }

  return label ?? fullAddress ?? 'Konum belirtilmedi';
}
