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


import { Calendar as CalendarIcon } from 'lucide-react-native';
import { EventRowCard } from '@/src/components/events/event-row-card';
import { EventCardSkeleton } from '@/src/components/events/event-card-skeleton';
import { useEvents } from '@/src/hooks/useEvents';

import { IconSymbol } from '@/components/ui/icon-symbol';

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
        contentContainerClassName="pb-8"
        ListHeaderComponent={
          <View>
            <View className="bg-white px-4 pb-3 pt-4 border-b border-slate-200">
              <View className="mb-4 flex-row items-center justify-between">
                <Pressable
                  className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
                  onPress={() => {
                    const prevMonth = subMonths(currentMonth, 1);
                    setCurrentMonth(prevMonth);
                    setSelectedDate(startOfMonth(prevMonth));
                  }}>
                  <IconSymbol name="chevron.left" size={20} color="#64748b" />
                </Pressable>

                <Text className="text-[17px] font-bold text-slate-900">
                  {format(currentMonth, 'LLLL yyyy', { locale: tr })}
                </Text>

                <Pressable
                  className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
                  onPress={() => {
                    const nextMonth = addMonths(currentMonth, 1);
                    setCurrentMonth(nextMonth);
                    setSelectedDate(startOfMonth(nextMonth));
                  }}>
                  <IconSymbol name="chevron.right" size={20} color="#64748b" />
                </Pressable>
              </View>

              <View className="mb-1.5 flex-row">
                {WEEKDAY_LABELS.map((label, index) => {
                  const isWeekend = index === 5 || index === 6;
                  return (
                    <View key={label} className="w-[14.285%] items-center">
                      <Text 
                        className={`text-[11px] font-semibold tracking-wide uppercase ${isWeekend ? 'text-red-500/80' : 'text-slate-500'}`}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View className="flex-row flex-wrap gap-y-1">
                {monthDays.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  const hasEvent = eventDateSet.has(format(day, 'yyyy-MM-dd'));

                  let dayCircleClass = 'h-[34px] w-[34px] items-center justify-center rounded-[10px]';
                  let textClass = 'text-[14px] font-medium';

                  if (isSelected && isToday) {
                    dayCircleClass += ' bg-[#f0fce8] border-[1.5px] border-[#77e349]';
                    textClass += ' text-[#357c1c] font-bold';
                  } else if (isToday) {
                    dayCircleClass += ' bg-[#77e349]';
                    textClass += ' text-[#1a4a05] font-bold';
                  } else if (isSelected) {
                    dayCircleClass += ' bg-[#f0fce8] border-[1.5px] border-[#77e349]';
                    textClass += ' text-[#357c1c] font-semibold';
                  } else if (isCurrentMonth) {
                    textClass += ' text-slate-800';
                  } else {
                    textClass += ' text-slate-300';
                  }

                  return (
                    <Pressable
                      key={day.toISOString()}
                      className="h-12 w-[14.285%] items-center justify-center relative"
                      onPress={() => setSelectedDate(day)}>
                      <View className={dayCircleClass}>
                        <Text className={textClass}>
                          {format(day, 'd')}
                        </Text>
                      </View>
                      <View className={`mt-0.5 h-[5px] w-[5px] rounded-full ${hasEvent ? 'bg-[#77e349]' : 'bg-transparent'}`} />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="flex-row items-center justify-between px-4 py-3.5 bg-white mt-2">
              <Text className="text-[15px] font-semibold text-slate-900">
                {format(selectedDate, 'd MMMM', { locale: tr })}
              </Text>
              <View className={`px-2.5 py-1 rounded-full border ${selectedDayCount > 0 ? 'bg-[#f0fce8] border-[#bbf09e]' : 'bg-slate-50 border-slate-200'}`}>
                <Text className={`text-xs font-semibold ${selectedDayCount > 0 ? 'text-[#357c1c]' : 'text-slate-500'}`}>
                  {selectedDayCount} etkinlik
                </Text>
              </View>
            </View>

            {isPending ? (
              <View className="px-4 gap-3 bg-white pb-3">
                <EventCardSkeleton />
                <EventCardSkeleton />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View className="px-4 mb-2 bg-white pb-1">
            <EventRowCard event={item} onPress={(eventId) => router.push(`/event/${eventId}`)} />
          </View>
        )}
        ListEmptyComponent={
          isPending ? null : (
            <View className="mt-2 items-center justify-center bg-white py-10 px-4">
              <View className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 items-center justify-center mb-3">
                <CalendarIcon size={26} color="#94a3b8" />
              </View>
              <Text className="text-[14px] font-semibold text-slate-800 mb-1">Etkinlik Yok</Text>
              <Text className="text-xs text-slate-500 text-center">Bu gün için planlanmış herhangi bir etkinlik bulunamadı.</Text>
            </View>
          )
        }
      />
    </View>
  );
}
