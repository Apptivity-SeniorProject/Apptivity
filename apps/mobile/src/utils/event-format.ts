import { format, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

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
