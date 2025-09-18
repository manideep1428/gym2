import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, PanGestureHandler, State } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { TrainerAvailability } from '@/lib/supabase';

interface WeeklyCalendarGridProps {
  availability: TrainerAvailability[];
  onCreateBlock: (dayOfWeek: number, startTime: string, endTime: string) => void;
  onEditBlock: (block: TrainerAvailability) => void;
  onDeleteBlock: (blockId: string) => void;
  editable?: boolean;
  showBookings?: boolean;
  bookings?: any[];
}

export default function WeeklyCalendarGrid({
  availability,
  onCreateBlock,
  onEditBlock,
  onDeleteBlock,
  editable = true,
  showBookings = false,
  bookings = []
}: WeeklyCalendarGridProps) {
  const { colors } = useTheme();
  const [dragStart, setDragStart] = useState<{ day: number; time: string } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; time: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Generate time slots from 6 AM to 10 PM in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 22) { // Don't add 30-min slot for 10 PM
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatTimeSlot = (timeSlot: string) => {
    const [hours, minutes] = timeSlot.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return minutes === '00' ? `${displayHour}${ampm}` : `${displayHour}:${minutes}${ampm}`;
  };

  const isSlotAvailable = (dayOfWeek: number, timeSlot: string) => {
    const slotTime = timeSlot + ':00';
    return availability.some(slot =>
      slot.day_of_week === dayOfWeek &&
      slot.start_time <= slotTime &&
      slot.end_time > slotTime &&
      slot.is_recurring &&
      !slot.is_blocked
    );
  };

  const isSlotBooked = (dayOfWeek: number, timeSlot: string) => {
    if (!showBookings) return false;
    const slotTime = timeSlot + ':00';
    return bookings.some(booking => {
      const bookingDay = new Date(booking.date).getDay();
      return bookingDay === dayOfWeek &&
        booking.start_time <= slotTime &&
        booking.end_time > slotTime &&
        booking.status === 'confirmed';
    });
  };

  const getAvailabilityBlock = (dayOfWeek: number, timeSlot: string) => {
    const slotTime = timeSlot + ':00';
    return availability.find(slot =>
      slot.day_of_week === dayOfWeek &&
      slot.start_time <= slotTime &&
      slot.end_time > slotTime &&
      slot.is_recurring &&
      !slot.is_blocked
    );
  };

  const handleSlotPress = (dayOfWeek: number, timeSlot: string) => {
    if (!editable) return;

    const block = getAvailabilityBlock(dayOfWeek, timeSlot);
    if (block) {
      onEditBlock(block);
    } else {
      // Start creating a new block
      setDragStart({ day: dayOfWeek, time: timeSlot });
      setDragEnd({ day: dayOfWeek, time: timeSlot });
    }
  };

  const handleDragStart = (dayOfWeek: number, timeSlot: string) => {
    if (!editable) return;
    setIsDragging(true);
    setDragStart({ day: dayOfWeek, time: timeSlot });
    setDragEnd({ day: dayOfWeek, time: timeSlot });
  };

  const handleDragMove = (dayOfWeek: number, timeSlot: string) => {
    if (!isDragging || !dragStart) return;
    setDragEnd({ day: dayOfWeek, time: timeSlot });
  };

  const handleDragEnd = () => {
    if (!isDragging || !dragStart || !dragEnd) return;
    
    setIsDragging(false);
    
    // Only create block if dragging on the same day
    if (dragStart.day === dragEnd.day) {
      const startIndex = timeSlots.indexOf(dragStart.time);
      const endIndex = timeSlots.indexOf(dragEnd.time);
      
      const actualStart = Math.min(startIndex, endIndex);
      const actualEnd = Math.max(startIndex, endIndex) + 1; // +1 to include the end slot
      
      if (actualStart !== -1 && actualEnd !== -1 && actualEnd <= timeSlots.length) {
        const startTime = timeSlots[actualStart];
        const endTime = actualEnd < timeSlots.length ? timeSlots[actualEnd] : '23:00';
        
        onCreateBlock(dragStart.day, startTime + ':00', endTime + ':00');
      }
    }
    
    setDragStart(null);
    setDragEnd(null);
  };

  const isInDragSelection = (dayOfWeek: number, timeSlot: string) => {
    if (!isDragging || !dragStart || !dragEnd || dragStart.day !== dayOfWeek) return false;
    
    const currentIndex = timeSlots.indexOf(timeSlot);
    const startIndex = timeSlots.indexOf(dragStart.time);
    const endIndex = timeSlots.indexOf(dragEnd.time);
    
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    return currentIndex >= minIndex && currentIndex <= maxIndex;
  };

  const isPastTime = (timeSlot: string) => {
    const now = new Date();
    const today = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotTime = hours * 60 + minutes;
    
    // Only gray out if it's today and the time has passed
    return today === new Date().getDay() && slotTime < currentTime;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 12,
    },
    timeColumn: {
      width: 80,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    dayColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    headerText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    timeHeaderText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      minHeight: 40,
    },
    timeCell: {
      width: 80,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      backgroundColor: colors.surface,
    },
    timeText: {
      fontSize: 10,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    slotCell: {
      flex: 1,
      minHeight: 40,
      borderWidth: 0.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: colors.surface,
    },
    slotCellAvailable: {
      backgroundColor: '#10B981', // Green for available
      borderColor: '#059669',
    },
    slotCellBooked: {
      backgroundColor: '#EF4444', // Red for booked
      borderColor: '#DC2626',
    },
    slotCellPast: {
      backgroundColor: colors.border,
      opacity: 0.5,
    },
    slotCellDragging: {
      backgroundColor: colors.primary + '60',
      borderColor: colors.primary,
    },
    slotIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      position: 'absolute',
    },
    availableIndicator: {
      backgroundColor: '#FFFFFF',
    },
    bookedIndicator: {
      backgroundColor: '#FFFFFF',
    },
    blockInfo: {
      position: 'absolute',
      top: 2,
      left: 2,
      right: 2,
      bottom: 2,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    blockText: {
      fontSize: 8,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 16,
      gap: 24,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    legendText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.timeColumn}>
          <Text style={styles.timeHeaderText}>Time</Text>
        </View>
        {dayNames.map((day, index) => (
          <View key={index} style={styles.dayColumn}>
            <Text style={styles.headerText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Time slots grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {timeSlots.map((timeSlot, timeIndex) => (
          <View key={timeIndex} style={styles.row}>
            <View style={styles.timeCell}>
              <Text style={styles.timeText}>
                {formatTimeSlot(timeSlot)}
              </Text>
            </View>
            {dayNames.map((_, dayIndex) => {
              const isAvailable = isSlotAvailable(dayIndex, timeSlot);
              const isBooked = isSlotBooked(dayIndex, timeSlot);
              const isPast = isPastTime(timeSlot);
              const inDragSelection = isInDragSelection(dayIndex, timeSlot);
              const block = getAvailabilityBlock(dayIndex, timeSlot);

              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={[
                    styles.slotCell,
                    isAvailable && styles.slotCellAvailable,
                    isBooked && styles.slotCellBooked,
                    isPast && styles.slotCellPast,
                    inDragSelection && styles.slotCellDragging,
                  ]}
                  onPress={() => handleSlotPress(dayIndex, timeSlot)}
                  onPressIn={() => handleDragStart(dayIndex, timeSlot)}
                  onPressOut={handleDragEnd}
                  disabled={isPast}
                >
                  {isAvailable && !isBooked && (
                    <View style={[styles.slotIndicator, styles.availableIndicator]} />
                  )}
                  {isBooked && (
                    <View style={[styles.slotIndicator, styles.bookedIndicator]} />
                  )}
                  {block && (
                    <View style={styles.blockInfo}>
                      <Text style={styles.blockText}>Available</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Booked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
          <Text style={styles.legendText}>Unavailable</Text>
        </View>
      </View>
    </View>
  );
}
