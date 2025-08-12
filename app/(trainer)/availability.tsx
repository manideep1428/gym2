import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, TextInput } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase, TrainerAvailability } from '@/lib/supabase';
import { ChevronLeft, Clock, Plus, X, Trash2, ChevronRight, ChevronDown } from 'lucide-react-native';

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
      fetchAvailability();
    } catch (error) {
      Alert.alert('Error', 'Failed to add availability');
      console.error('Add availability error:', error);
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
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Plus color="#FFFFFF" size={20} />
        </TouchableOpacity>
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
                    <View key={slot.id} style={styles.timeSlot}>
                      <View style={styles.timeInfo}>
                        <Clock color={colors.textSecondary} size={16} />
                        <Text style={[styles.timeText, { color: colors.text }]}>
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </Text>
                      </View>
                      
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteAvailability(slot.id)}
                      >
                        <Trash2 color={colors.error} size={16} />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.noAvailability, { color: colors.textSecondary }]}>
                    No availability set
                  </Text>
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
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
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

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Time Range</Text>
              <View style={styles.timeInputs}>
                <View style={styles.timeInput}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Start</Text>
                  <TouchableOpacity style={[styles.timeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.timeButtonText, { color: colors.text }]}>{startTime}</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.timeInput}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>End</Text>
                  <TouchableOpacity style={[styles.timeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.timeButtonText, { color: colors.text }]}>{endTime}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={addAvailability}
            >
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
    paddingVertical: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 4,
  },
  noAvailability: {
    fontSize: 14,
    fontStyle: 'italic',
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
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});