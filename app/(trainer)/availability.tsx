import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Platform, ToastAndroid } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase, TrainerAvailability } from '@/lib/supabase';
import { ChevronLeft, Clock, Plus, X, Trash2, ChevronRight, Sunrise, Sun, Sunset } from 'lucide-react-native';
import { SkeletonLoader } from '@/components/SkeletonLoader';

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
  const [viewMode, setViewMode] = useState<'calendar' | 'weekly' | 'grid'>('grid');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      setToastMsg(message);
      setTimeout(() => setToastMsg(null), 2000);
    }
  };

  // Time presets for easy selection
  const timePresets = [
    { name: 'Morning', icon: Sunrise, start: '06:00', end: '12:00', color: '#FF9500' },
    { name: 'Afternoon', icon: Sun, start: '12:00', end: '18:00', color: '#FFD60A' },
    { name: 'Evening', icon: Sunset, start: '18:00', end: '22:00', color: '#FF6B35' },
    { name: 'Full Day', icon: Clock, start: '08:00', end: '20:00', color: '#007AFF' },
  ];

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    if (userProfile) {
      fetchAvailability();
    }
  }, [userProfile]);

  const fetchAvailability = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
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
      showToast('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSlot = async (dayOfWeek: number, timeSlot: string) => {
    if (!userProfile) return;

    const [hours, minutes] = timeSlot.split(':');
    const slotTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
    const nextHour = new Date(`2000-01-01T${slotTime}`);
    nextHour.setHours(nextHour.getHours() + 1);
    const endTimeFormatted = nextHour.toTimeString().slice(0, 8);

    // Check if this slot already exists
    const existingSlot = availability.find(slot =>
      slot.day_of_week === dayOfWeek &&
      slot.start_time === slotTime &&
      slot.is_recurring
    );

    try {
      if (existingSlot) {
        // Remove the slot
        const { error } = await supabase
          .from('trainer_availability')
          .delete()
          .eq('id', existingSlot.id);

        if (error) throw error;
        showToast('Availability removed');
      } else {
        // Add the slot
        const { error } = await supabase
          .from('trainer_availability')
          .insert({
            trainer_id: userProfile.id,
            day_of_week: dayOfWeek,
            start_time: slotTime,
            end_time: endTimeFormatted,
            is_recurring: true,
          });

        if (error) throw error;
        showToast('Availability added');
      }
      await fetchAvailability();
    } catch (error) {
      console.error('Toggle slot error:', error);
      showToast('Failed to update availability');
    }
  };

  const groupedAvailability = availability.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, TrainerAvailability[]>);

  const addAvailability = async () => {
    if (!userProfile) return;

    // Validate time range
    if (startTime >= endTime) {
      showToast('End time must be after start time');
      return;
    }

    try {
      const { error } = await supabase
        .from('trainer_availability')
        .insert({
          trainer_id: userProfile.id,
          day_of_week: selectedDay,
          start_time: startTime + ':00',
          end_time: endTime + ':00',
          is_recurring: true,
        });

      if (error) throw error;

      showToast('Availability added');
      setShowAddModal(false);
      resetModalState();
      await fetchAvailability();
    } catch (error) {
      showToast('Failed to add availability');
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
          start_time: start + ':00',
          end_time: end + ':00',
          is_recurring: true,
        })
      );

      const results = await Promise.allSettled(promises);
      const failedCount = results.filter(r => r.status === 'rejected').length;
      
      if (failedCount === 0) {
        showToast('Weekday schedule added');
      } else if (failedCount < weekdays.length) {
        showToast('Partial weekday schedule added');
      } else {
        showToast('Failed to setup schedule');
      }
      
      await fetchAvailability();
    } catch (error) {
      showToast('Failed to setup schedule');
      console.error('Setup weekday error:', error);
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
          start_time: start + ':00',
          end_time: end + ':00',
          is_recurring: true,
        })
      );

      const results = await Promise.allSettled(promises);
      const failedCount = results.filter(r => r.status === 'rejected').length;
      
      if (failedCount === 0) {
        showToast('Weekend schedule added');
      } else {
        showToast('Failed to setup schedule');
      }
      
      await fetchAvailability();
    } catch (error) {
      showToast('Failed to setup schedule');
      console.error('Setup weekend error:', error);
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
              showToast('Availability deleted');
              await fetchAvailability();
            } catch (error) {
              console.error('Delete error:', error);
              showToast('Failed to delete availability');
            }
          },
        },
      ]
    );
  };

  const formatTime = (time: string) => {
    try {
      const timeStr = time.length === 5 ? time + ':00' : time;
      return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return time; // fallback to original time if formatting fails
    }
  };

  const generateCalendarDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
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

  // Create styles here to access colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 50,
      backgroundColor: colors.background,
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
      color: colors.text,
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
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    quickSetupText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.primary,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
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
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    toggleButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    toggleTextActive: {
      color: '#FFFFFF',
    },
    helperSection: {
      marginHorizontal: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    helperTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
      color: colors.text,
    },
    helperText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    // Calendar styles
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
      color: colors.text,
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
      color: colors.textSecondary,
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
      backgroundColor: colors.surface,
    },
    calendarDateText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    availabilityDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      position: 'absolute',
      bottom: 4,
      backgroundColor: colors.primary,
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
      color: colors.textSecondary,
    },
    // Weekly view styles
    weeklyView: {
      flex: 1,
    },
    daySection: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      backgroundColor: colors.card,
      borderColor: colors.border,
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
      color: colors.text,
    },
    addDayButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
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
      backgroundColor: colors.primary + '10',
      borderColor: colors.primary + '30',
    },
    timeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    timeText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    deleteButton: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: colors.error + '10',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 20,
      gap: 8,
    },
    noAvailability: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    emptyStateHint: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.text,
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
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    selectedDateText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    formSection: {
      marginBottom: 24,
    },
    formLabel: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 12,
      color: colors.text,
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
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    dayOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20',
    },
    dayOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    dayOptionTextActive: {
      color: colors.primary,
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
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    presetName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    presetTime: {
      fontSize: 12,
      color: colors.textSecondary,
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
      color: colors.textSecondary,
    },
    timeButton: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    timeButtonText: {
      fontSize: 16,
      color: colors.text,
    },
    timeHint: {
      fontSize: 12,
      marginTop: 8,
      textAlign: 'center',
      fontStyle: 'italic',
      color: colors.textSecondary,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: 12,
      marginTop: 20,
      backgroundColor: colors.primary,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
    },
    toast: {
      position: 'absolute',
      bottom: 24,
      left: 20,
      right: 20,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    toastText: {
      color: colors.text,
    },
    // Grid styles
    gridView: {
      flex: 1,
    },
    gridContainer: {
      flex: 1,
    },
    gridHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 12,
    },
    timeHeaderCell: {
      width: 80,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    dayHeaderCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    headerText: {
      fontSize: 12,
      fontWeight: '600',
    },
    gridRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      minHeight: 50,
    },
    timeCell: {
      width: 80,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    gridTimeText: {
      fontSize: 10,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    slotCell: {
      flex: 1,
      minHeight: 50,
      borderWidth: 1,
      borderLeftWidth: 0.5,
      borderRightWidth: 0.5,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    slotCellAvailable: {
      backgroundColor: colors.primary + '40',
      borderColor: colors.primary,
    },
    availableIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      position: 'absolute',
      backgroundColor: colors.primary,
    },
  });

  if (loading) {
    return (
      <View style={styles.container}> 
        <View style={styles.header}> 
          <SkeletonLoader width={160} height={20} borderRadius={6} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SkeletonLoader width={100} height={32} borderRadius={16} />
            <SkeletonLoader width={40} height={40} borderRadius={20} />
          </View>
        </View>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={{ marginBottom: 16 }}>
            <SkeletonLoader width={220} height={18} borderRadius={6} style={{ marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {[...Array(7)].map((_, i) => (
                <SkeletonLoader key={i} width={40} height={40} borderRadius={20} />
              ))}
            </View>
          </View>
          {[...Array(3)].map((_, idx) => (
            <View key={idx} style={{ marginBottom: 16 }}>
              <SkeletonLoader width={'100%'} height={60} borderRadius={12} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Availability</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.quickSetupButton}
            onPress={showQuickSetupOptions}
          >
            <Text style={styles.quickSetupText}>Quick Setup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
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
            viewMode === 'grid' && styles.toggleButtonActive
          ]}
          onPress={() => setViewMode('grid')}
        >
          <Text style={[
            styles.toggleText,
            viewMode === 'grid' && styles.toggleTextActive
          ]}>
            Grid
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'calendar' && styles.toggleButtonActive
          ]}
          onPress={() => setViewMode('calendar')}
        >
          <Text style={[
            styles.toggleText,
            viewMode === 'calendar' && styles.toggleTextActive
          ]}>
            Calendar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'weekly' && styles.toggleButtonActive
          ]}
          onPress={() => setViewMode('weekly')}
        >
          <Text style={[
            styles.toggleText,
            viewMode === 'weekly' && styles.toggleTextActive
          ]}>
            Weekly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Helper Section */}
      <View style={styles.helperSection}>
        <Text style={styles.helperTitle}>Set Your Available Hours</Text>
        <Text style={styles.helperText}>
          {viewMode === 'grid'
            ? 'Click time slots to toggle availability. Blue slots are available, gray are unavailable.'
            : viewMode === 'calendar'
            ? 'Tap any date to add availability. Blue dots show days you\'re available.'
            : 'Use the + button to add time slots for each day of the week.'
          }
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {viewMode === 'grid' ? (
          <WeeklyAvailabilityGrid
            availability={availability}
            onToggleSlot={handleToggleSlot}
            colors={colors}
            styles={styles}
          />
        ) : viewMode === 'calendar' ? (
          <View style={styles.calendarView}>
            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => navigateMonth('prev')}>
                <ChevronLeft color={colors.text} size={20} />
              </TouchableOpacity>
              <Text style={styles.monthYear}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => navigateMonth('next')}>
                <ChevronRight color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            {/* Calendar Days Header */}
            <View style={styles.calendarDaysHeader}>
              {shortDayNames.map((day) => (
                <Text key={day} style={styles.dayHeader}>
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
                      !isCurrentMonth && { opacity: 0.3 },
                      hasAvailability && { 
                        backgroundColor: colors.primary + '20', 
                        borderColor: colors.primary 
                      },
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
                      !isCurrentMonth && { color: colors.textSecondary },
                      hasAvailability && { color: colors.primary, fontWeight: '600' }
                    ]}>
                      {date.getDate()}
                    </Text>
                    {hasAvailability && (
                      <View style={styles.availabilityDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
                <Text style={styles.legendText}>Not set</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.weeklyView}>
            {dayNames.map((dayName, index) => (
              <View key={index} style={styles.daySection}>
                <View style={styles.daySectionHeader}>
                  <Text style={styles.dayName}>{dayName}</Text>
                  <TouchableOpacity
                    style={styles.addDayButton}
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
                        <Clock color={colors.primary} size={16} />
                        <Text style={styles.timeText}>
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
                  <View style={styles.emptyState}>
                    <Clock color={colors.textSecondary} size={24} />
                    <Text style={styles.noAvailability}>
                      No availability set
                    </Text>
                    <Text style={styles.emptyStateHint}>
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
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowAddModal(false);
              resetModalState();
            }}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Availability</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedDate && (
              <View style={styles.selectedDateCard}>
                <Text style={styles.selectedDateText}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Day of Week</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                {dayNames.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayOption,
                      selectedDay === index && styles.dayOptionActive
                    ]}
                    onPress={() => setSelectedDay(index)}
                  >
                    <Text style={[
                      styles.dayOptionText,
                      selectedDay === index && styles.dayOptionTextActive
                    ]}>
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Quick Presets */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Quick Presets</Text>
              <View style={styles.presetsGrid}>
                {timePresets.map((preset, index) => {
                  const IconComponent = preset.icon;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.presetButton}
                      onPress={() => applyTimePreset(preset)}
                    >
                      <IconComponent color={preset.color} size={20} />
                      <Text style={styles.presetName}>{preset.name}</Text>
                      <Text style={styles.presetTime}>
                        {formatTime(preset.start)} - {formatTime(preset.end)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Custom Time Range</Text>
              <View style={styles.timeInputs}>
                <View style={styles.timeInput}>
                  <Text style={styles.timeLabel}>Start</Text>
                  <TouchableOpacity style={styles.timeButton}>
                    <Text style={styles.timeButtonText}>{formatTime(startTime)}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.timeInput}>
                  <Text style={styles.timeLabel}>End</Text>
                  <TouchableOpacity style={styles.timeButton}>
                    <Text style={styles.timeButtonText}>{formatTime(endTime)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.timeHint}>
                Tap preset buttons above for quick setup, or customize times here
              </Text>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={addAvailability}
            >
              <Plus color="#FFFFFF" size={20} />
              <Text style={styles.submitButtonText}>Add Availability</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Toast for iOS */}
      {toastMsg && (
        <View style={styles.toast}> 
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}
    </View>
  );
}

const WeeklyAvailabilityGrid = ({ availability, onToggleSlot, colors, styles }: {
  availability: TrainerAvailability[];
  onToggleSlot: (dayOfWeek: number, timeSlot: string) => void;
  colors: any;
  styles: any;
}) => {
  const timeSlots = [];
  for (let hour = 6; hour <= 22; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  return (
    <View style={styles.gridContainer}>
      {/* Time column header */}
      <View style={styles.gridHeader}>
        <View style={styles.timeHeaderCell}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Time</Text>
        </View>
        {dayNames.map((day, index) => (
          <View key={index} style={styles.dayHeaderCell}>
            <Text style={[styles.headerText, { color: colors.text }]}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Time slots grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {timeSlots.map((timeSlot, timeIndex) => (
          <View key={timeIndex} style={styles.gridRow}>
            <View style={styles.timeCell}>
              <Text style={styles.gridTimeText}>
                {new Date(`2000-01-01T${timeSlot}:00`).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </Text>
            </View>
            {dayNames.map((_, dayIndex) => (
              <TouchableOpacity
                key={dayIndex}
                style={[
                  styles.slotCell,
                  isSlotAvailable(dayIndex, timeSlot) && styles.slotCellAvailable
                ]}
                onPress={() => onToggleSlot(dayIndex, timeSlot)}
              >
                {isSlotAvailable(dayIndex, timeSlot) && (
                  <View style={styles.availableIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};