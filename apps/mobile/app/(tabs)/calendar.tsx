import { router } from 'expo-router';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';


import { EventCard } from '@/src/components/events/event-card';
import { EventCardSkeleton } from '@/src/components/events/event-card-skeleton';
import { useEvents } from '@/src/hooks/useEvents';

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const monthDays = useMemo(() => {
    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    });
  }, [calendarStart, calendarEnd]);

  const { events, isPending } = useEvents({
    startDate: format(monthStart, 'yyyy-MM-dd'),
    endDate: format(monthEnd, 'yyyy-MM-dd'),
    pageSize: 100,
  });

  const eventDateSet = useMemo(() => {
    return new Set(events.map((event) => event.date));
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    return events.filter((event) => {
      try {
        return isSameDay(parseISO(event.date), selectedDate);
      } catch {
        return false;
      }
    });
  }, [events, selectedDate]);

  const selectedDayCount = selectedDayEvents.length;

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={selectedDayEvents}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pb-8 pt-6"
        ListHeaderComponent={
          <View>
            <View className="mb-5 flex-row items-center justify-between">
              <Pressable
                className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                onPress={() => {
                  const prevMonth = subMonths(currentMonth, 1);
                  setCurrentMonth(prevMonth);
                  setSelectedDate(startOfMonth(prevMonth));
                }}>
                <Text className="text-sm font-semibold text-slate-700">{'<'}</Text>
              </Pressable>

              <Text className="text-lg font-semibold text-slate-900">
                {format(currentMonth, 'LLLL yyyy', { locale: tr })}
              </Text>

              <Pressable
                className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                onPress={() => {
                  const nextMonth = addMonths(currentMonth, 1);
                  setCurrentMonth(nextMonth);
                  setSelectedDate(startOfMonth(nextMonth));
                }}>
                <Text className="text-sm font-semibold text-slate-700">{'>'}</Text>
              </Pressable>
            </View>

            <View className="rounded-2xl border border-slate-200 bg-white px-3 pb-3 pt-4">
              <View className="mb-2 flex-row">
                {WEEKDAY_LABELS.map((label) => (
                  <View key={label} className="w-[14.285%] items-center">
                    <Text className="text-xs font-medium text-slate-500">{label}</Text>
                  </View>
                ))}
              </View>

              <View className="flex-row flex-wrap">
                {monthDays.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = isSameDay(day, selectedDate);
                  const hasEvent = eventDateSet.has(format(day, 'yyyy-MM-dd'));

                  return (
                    <Pressable
                      key={day.toISOString()}
                      className="mb-2 h-11 w-[14.285%] items-center justify-center"
                      onPress={() => setSelectedDate(day)}>
                      <View
                        className={
                          isSelected
                            ? 'h-8 w-8 items-center justify-center rounded-full bg-emerald-600'
                            : 'h-8 w-8 items-center justify-center rounded-full'
                        }>
                        <Text
                          className={
                            isSelected
                              ? 'text-sm font-semibold text-white'
                              : isCurrentMonth
                                ? 'text-sm text-slate-800'
                                : 'text-sm text-slate-300'
                          }>
                          {format(day, 'd')}
                        </Text>
                      </View>
                      {hasEvent ? <View className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="mb-4 mt-6 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">
                {format(selectedDate, 'd MMMM', { locale: tr })}
              </Text>
              <Text className="text-sm font-medium text-slate-500">{selectedDayCount} etkinlik</Text>
            </View>

            {isPending ? (
              <View className="mb-4 gap-4">
                <EventCardSkeleton />
                <EventCardSkeleton />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-4">
            <EventCard event={item} onPress={(eventId) => router.push(`/event/${eventId}`)} />
          </View>
        )}
        ListEmptyComponent={
          isPending ? null : (
            <View className="mt-8 items-center">
              <Text className="text-base text-slate-500">Bu gun icin etkinlik bulunamadi.</Text>
            </View>
          )
        }
      />
    </View>
  );
}
