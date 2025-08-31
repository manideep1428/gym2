import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, TextInput } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase, TrainerAvailability } from '@/lib/supabase';
import { ChevronLeft, Clock, Plus, X, Trash2, ChevronRight, ChevronDown, Sunrise, Sun, Sunset, Moon } from 'lucide-react-native';

export default function TrainerAvailabilityScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();

  const [availability, setAvailability] = useState<TrainerAvailability[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'weekly'>('calendar');

  // Time presets for easy selection
  const timePresets = [
    { name: 'Morning', icon: Sunrise, start: '06:00', end: '12:00', color: '#FF9500' },
    { name: 'Afternoon', icon: Sun, start: '12:00', end: '18:00', color: '#FFD60A' },
    { name: 'Evening', icon: Sunset, start: '18:00', end: '22:00', color: '#FF6B35' },
    { name: 'Full Day', icon: Clock, start: '08:00', end: '20:00', color: '#007AFF' },
  ];

  const styles = createStyles(colors);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('trainer_availability')
        .select('*')
        .eq('trainer_id', userProfile.id)
        .eq('is_recurring', true)
        .order('day_of_week');

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAvailability = async () => {
    if (!userProfile) return;

    // Validate time range
    if (startTime >= endTime) {
      Alert.alert('Invalid Time Range', 'End time must be after start time');
      return;
    }

    try {
      const { error } = await supabase
        .from('trainer_availability')
        .insert({
          trainer_id: userProfile.id,
          day_of_week: selectedDay,
          start_time: startTime,
          end_time: endTime,
          is_recurring: true,
        });

      if (error) throw error;

      Alert.alert('Success', 'Availability added successfully!');
      setShowAddModal(false);
      resetModalState();
      fetchAvailability();
    } catch (error) {
      Alert.alert('Error', 'Failed to add availability');
      console.error('Add availability error:', error);
    }
  };

  const resetModalState = () => {
    setSelectedDate(null);
    setSelectedDay(1);
    setStartTime('09:00');
    setEndTime('17:00');
  };

  const applyTimePreset = (preset: typeof timePresets[0]) => {
    setStartTime(preset.start);
    setEndTime(preset.end);
  };

  const showQuickSetupOptions = () => {
    Alert.alert(
      'Quick Setup',
      'Choose a common schedule to get started quickly:',
      [
        {
          text: 'Weekdays 9-5',
          onPress: () => setupWeekdaySchedule('09:00', '17:00')
        },
        {
          text: 'Morning Person',
          onPress: () => setupWeekdaySchedule('06:00', '14:00')
        },
        {
          text: 'Evening Trainer',
          onPress: () => setupWeekdaySchedule('14:00', '22:00')
        },
        {
          text: 'Weekend Warrior',
          onPress: () => setupWeekendSchedule('08:00', '18:00')
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const setupWeekdaySchedule = async (start: string, end: string) => {
    if (!userProfile) return;

    try {
      // Add Monday through Friday
      const weekdays = [1, 2, 3, 4, 5]; // Mon-Fri
      const promises = weekdays.map(day =>
        supabase.from('trainer_availability').insert({
          trainer_id: userProfile.id,
          day_of_week: day,
          start_time: start,
          end_time: end,
          is_recurring: true,
        })
      );

      await Promise.all(promises);
      Alert.alert('Success', 'Weekday schedule added successfully!');
      fetchAvailability();
    } catch (error) {
      Alert.alert('Error', 'Failed to setup schedule');
    }
  };

  const setupWeekendSchedule = async (start: string, end: string) => {
    if (!userProfile) return;

    try {
      // Add Saturday and Sunday
      const weekends = [0, 6]; // Sun, Sat
      const promises = weekends.map(day =>
        supabase.from('trainer_availability').insert({
          trainer_id: userProfile.id,
          day_of_week: day,
          start_time: start,
          end_time: end,
          is_recurring: true,
        })
      );

      await Promise.all(promises);
      Alert.alert('Success', 'Weekend schedule added successfully!');
      fetchAvailability();
    } catch (error) {
      Alert.alert('Error', 'Failed to setup schedule');
    }
  };

  const deleteAvailability = async (id: string) => {
    Alert.alert(
      'Delete Availability',
      'Are you sure you want to remove this availability slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('trainer_availability')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchAvailability();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete availability');
            }
          },
        },
      ]
    );
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const generateCalendarDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const dates = [];
    const currentDateObj = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      dates.push(new Date(currentDateObj));
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }

    return dates;
  };

  const getDayAvailability = (dayOfWeek: number) => {
    return availability.filter(slot =>
      slot.day_of_week === dayOfWeek &&
      slot.is_recurring &&
      !slot.is_blocked
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const groupedAvailability = availability.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, TrainerAvailability[]>);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading availability...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Availability</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.quickSetupButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => showQuickSetupOptions()}
          >
            <Text style={[styles.quickSetupText, { color: colors.primary }]}>Quick Setup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <Plus color="#FFFFFF" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            viewMode === 'calendar' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
          onPress={() => setViewMode('calendar')}
        >
          <Text style={[
            styles.toggleText,
            { color: viewMode === 'calendar' ? '#FFFFFF' : colors.text }
          ]}>
            Calendar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            viewMode === 'weekly' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
          onPress={() => setViewMode('weekly')}
        >
          <Text style={[
            styles.toggleText,
            { color: viewMode === 'weekly' ? '#FFFFFF' : colors.text }
          ]}>
            Weekly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Helper Section */}
      <View style={[styles.helperSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.helperTitle, { color: colors.text }]}>Set Your Available Hours</Text>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          {viewMode === 'calendar'
            ? 'Tap any date to add availability. Blue dots show days you\'re available.'
            : 'Use the + button to add time slots for each day of the week.'
          }
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {viewMode === 'calendar' ? (
          <View style={styles.calendarView}>
            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => navigateMonth('prev')}>
                <ChevronLeft color={colors.text} size={20} />
              </TouchableOpacity>
              <Text style={[styles.monthYear, { color: colors.text }]}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => navigateMonth('next')}>
                <ChevronRight color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            {/* Calendar Days Header */}
            <View style={styles.calendarDaysHeader}>
              {shortDayNames.map((day) => (
                <Text key={day} style={[styles.dayHeader, { color: colors.textSecondary }]}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {generateCalendarDates().map((date, index) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const dayAvailability = getDayAvailability(date.getDay());
                const hasAvailability = dayAvailability.length > 0;
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDate,
                      { backgroundColor: colors.surface },
                      !isCurrentMonth && { opacity: 0.3 },
                      hasAvailability && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                      isToday && { borderColor: colors.primary, borderWidth: 2 }
                    ]}
                    onPress={() => {
                      setSelectedDate(date);
                      setSelectedDay(date.getDay());
                      setShowAddModal(true);
                    }}
                  >
                    <Text style={[
                      styles.calendarDateText,
                      { color: isCurrentMonth ? colors.text : colors.textSecondary },
                      hasAvailability && { color: colors.primary, fontWeight: '600' }
                    ]}>
                      {date.getDate()}
                    </Text>
                    {hasAvailability && (
                      <View style={[styles.availabilityDot, { backgroundColor: colors.primary }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Not set</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.weeklyView}>
            {dayNames.map((dayName, index) => (
              <View key={index} style={[styles.daySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.daySectionHeader}>
                  <Text style={[styles.dayName, { color: colors.text }]}>{dayName}</Text>
                  <TouchableOpacity
                    style={[styles.addDayButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setSelectedDay(index);
                      setShowAddModal(true);
                    }}
                  >
                    <Plus color="#FFFFFF" size={16} />
                  </TouchableOpacity>
                </View>

                {groupedAvailability[index] ? (
                  groupedAvailability[index].map((slot) => (
                    <View key={slot.id} style={[styles.timeSlot, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                      <View style={styles.timeInfo}>
                        <Clock color={colors.primary} size={16} />
                        <Text style={[styles.timeText, { color: colors.text }]}>
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.deleteButton, { backgroundColor: colors.error + '10' }]}
                        onPress={() => deleteAvailability(slot.id)}
                      >
                        <Trash2 color={colors.error} size={16} />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Clock color={colors.textSecondary} size={24} />
                    <Text style={[styles.noAvailability, { color: colors.textSecondary }]}>
                      No availability set
                    </Text>
                    <Text style={[styles.emptyStateHint, { color: colors.textSecondary }]}>
                      Tap + to add your available hours
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Availability Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowAddModal(false);
          resetModalState();
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowAddModal(false);
              resetModalState();
            }}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Availability</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalContent}>
            {selectedDate && (
              <View style={[styles.selectedDateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.selectedDateText, { color: colors.text }]}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Day of Week</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                {dayNames.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayOption,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      selectedDay === index && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => setSelectedDay(index)}
                  >
                    <Text style={[
                      styles.dayOptionText,
                      { color: selectedDay === index ? colors.primary : colors.text }
                    ]}>
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Quick Presets */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Quick Presets</Text>
              <View style={styles.presetsGrid}>
                {timePresets.map((preset, index) => {
                  const IconComponent = preset.icon;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.presetButton,
                        { backgroundColor: colors.surface, borderColor: colors.border }
                      ]}
                      onPress={() => applyTimePreset(preset)}
                    >
                      <IconComponent color={preset.color} size={20} />
                      <Text style={[styles.presetName, { color: colors.text }]}>{preset.name}</Text>
                      <Text style={[styles.presetTime, { color: colors.textSecondary }]}>
                        {formatTime(preset.start)} - {formatTime(preset.end)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Custom Time Range</Text>
              <View style={styles.timeInputs}>
                <View style={styles.timeInput}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Start</Text>
                  <TouchableOpacity style={[styles.timeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.timeButtonText, { color: colors.text }]}>{formatTime(startTime)}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.timeInput}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>End</Text>
                  <TouchableOpacity style={[styles.timeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.timeButtonText, { color: colors.text }]}>{formatTime(endTime)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.timeHint, { color: colors.textSecondary }]}>
                Tap preset buttons above for quick setup, or customize times here
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={addAvailability}
            >
              <Plus color="#FFFFFF" size={20} />
              <Text style={styles.submitButtonText}>Add Availability</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickSetupButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickSetupText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  helperSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  helperTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  calendarView: {
    flex: 1,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: '500',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDate: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  calendarDateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
  },
  weeklyView: {
    flex: 1,
  },
  daySection: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  daySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '600',
  },
  addDayButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  noAvailability: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyStateHint: {
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  selectedDateCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  daySelector: {
    flexDirection: 'row',
  },
  dayOption: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  dayOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeInputs: {
    flexDirection: 'row',
    gap: 16,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  timeButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 16,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetButton: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetTime: {
    fontSize: 12,
  },
  timeHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});