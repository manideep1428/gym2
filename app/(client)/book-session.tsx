import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase, Profile, TrainerAvailability } from '@/lib/supabase';
import { ChevronLeft, Calendar, Clock, User, MessageSquare, ChevronRight, ArrowLeft } from 'lucide-react-native';

export default function BookSession() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const { trainerId } = useLocalSearchParams();

  const [trainer, setTrainer] = useState<Profile | null>(null);
  const [availability, setAvailability] = useState<TrainerAvailability[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [step, setStep] = useState(1); // 1: Date, 2: Duration, 3: Time, 4: Notes
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  const styles = createStyles(colors);

  useEffect(() => {
    if (trainerId) {
      fetchTrainerData();
      fetchAvailability();
    }
  }, [trainerId]);

  const fetchTrainerData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', trainerId)
        .single();

      if (error) throw error;
      setTrainer(data);
    } catch (error) {
      console.error('Error fetching trainer:', error);
      Alert.alert('Error', 'Failed to load trainer information');
    }
  };

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('trainer_availability')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('is_blocked', false);

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingBookings = async (date: string) => {
    if (!trainerId || !date) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('date', date)
        .in('status', ['pending', 'confirmed']);

      if (error) throw error;
      setExistingBookings(data || []);
    } catch (error) {
      console.error('Error fetching existing bookings:', error);
      setExistingBookings([]);
    }
  };

  const generateSmartTimeSlots = async () => {
    if (!selectedDate || !trainerId) return [];

    const sessionDuration = getCurrentDuration();
    const dayOfWeek = new Date(selectedDate).getDay();

    // Get trainer's availability for this day
    const dayAvailability = availability.filter(avail =>
      (avail.day_of_week === dayOfWeek && avail.is_recurring && !avail.is_blocked) ||
      (avail.specific_date === selectedDate && !avail.is_blocked)
    );

    if (dayAvailability.length === 0) return [];

    // Fetch existing bookings for this date
    await fetchExistingBookings(selectedDate);

    const availableSlots = [];

    // For each availability window
    for (const avail of dayAvailability) {
      if (!avail.start_time || !avail.end_time) continue;

      const availStart = new Date(`2000-01-01T${avail.start_time}`);
      const availEnd = new Date(`2000-01-01T${avail.end_time}`);

      // Generate 15-minute intervals within this availability window
      let currentTime = new Date(availStart);

      while (currentTime < availEnd) {
        const timeString = currentTime.toTimeString().slice(0, 5);
        const sessionStart = new Date(currentTime);
        const sessionEnd = new Date(sessionStart.getTime() + sessionDuration * 60000);

        // Check if session fits within availability window
        if (sessionEnd <= availEnd) {
          // Check for conflicts with existing bookings
          const hasConflict = existingBookings.some(booking => {
            const bookingStart = new Date(`2000-01-01T${booking.start_time}`);
            const bookingEnd = new Date(`2000-01-01T${booking.end_time}`);

            // Check if sessions overlap
            return (sessionStart < bookingEnd && sessionEnd > bookingStart);
          });

          if (!hasConflict) {
            availableSlots.push(timeString);
          }
        }

        // Move to next 15-minute interval
        currentTime.setMinutes(currentTime.getMinutes() + 15);
      }
    }

    return availableSlots;
  };

  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get first day of current month and next month
    const firstDayCurrentMonth = new Date(currentYear, currentMonth, 1);
    const firstDayNextMonth = new Date(currentYear, currentMonth + 1, 1);

    // Generate dates for current month (remaining days)
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let day = today.getDate() + 1; day <= daysInCurrentMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      dates.push({
        date: date,
        value: date.toISOString().split('T')[0],
        day: day,
        dayOfWeek: date.getDay(),
        isCurrentMonth: true,
      });
    }

    // Generate dates for next month (first 14 days)
    for (let day = 1; day <= 14; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      dates.push({
        date: date,
        value: date.toISOString().split('T')[0],
        day: day,
        dayOfWeek: date.getDay(),
        isCurrentMonth: false,
      });
    }

    return dates.slice(0, 21); // Show 3 weeks
  };

  const getCurrentDuration = () => {
    return duration === 0 ? parseInt(customDuration) || 60 : duration;
  };

  const isDateAvailable = (date: string, dayOfWeek: number) => {
    // Check if trainer has availability for this day of week
    return availability.some(avail =>
      avail.day_of_week === dayOfWeek &&
      avail.is_recurring &&
      !avail.is_blocked
    ) || availability.some(avail =>
      avail.specific_date === date &&
      !avail.is_blocked
    );
  };

  // Update available time slots when date or duration changes
  useEffect(() => {
    if (selectedDate && (duration > 0 || customDuration)) {
      generateSmartTimeSlots().then(slots => {
        setAvailableTimeSlots(slots);
      });
    }
  }, [selectedDate, duration, customDuration, availability, existingBookings]);

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const resetSelection = () => {
    setSelectedDate('');
    setSelectedTime('');
    setDuration(60);
    setCustomDuration('');
    setStep(1);
  };

  const handleBookSession = async () => {
    if (!selectedDate || !selectedTime || !userProfile || !trainer) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setBooking(true);
    try {
      // Calculate end time using current duration
      const sessionDuration = getCurrentDuration();
      const startTime = new Date(`2000-01-01T${selectedTime}`);
      const endTime = new Date(startTime.getTime() + sessionDuration * 60000);
      const endTimeString = endTime.toTimeString().slice(0, 5);

      // Allow multiple requests for same time slot - trainer will decide
      const { error } = await supabase
        .from('bookings')
        .insert({
          client_id: userProfile.id,
          trainer_id: trainer.id,
          date: selectedDate,
          start_time: selectedTime,
          end_time: endTimeString,
          duration_minutes: sessionDuration,
          status: 'pending',
          client_notes: notes,
        });

      if (error) throw error;

      // Create notification for trainer
      await supabase
        .from('notifications')
        .insert({
          user_id: trainer.id,
          title: 'New Booking Request',
          message: `${userProfile.name} has requested a ${sessionDuration}-minute session on ${new Date(selectedDate).toLocaleDateString()} at ${new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
          type: 'booking_request',
        });

      Alert.alert(
        'Booking Requested!',
        'Your session request has been sent to the trainer. Multiple clients can request the same time slot - the trainer will choose who to confirm.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error booking session:', error);
      Alert.alert('Error', 'Failed to book session. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  if (!trainer) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Trainer not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Book Session</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Trainer Info */}
        <View style={[styles.trainerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.trainerInfo}>
            <User color={colors.primary} size={24} />
            <View style={styles.trainerDetails}>
              <Text style={[styles.trainerName, { color: colors.text }]}>{trainer.name}</Text>
              <Text style={[styles.trainerSpecializations, { color: colors.textSecondary }]}>
                {trainer.specializations?.join(', ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressSteps}>
            {[1, 2, 3, 4].map((stepNum) => (
              <View key={stepNum} style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  { backgroundColor: step >= stepNum ? colors.primary : colors.border }
                ]}>
                  <Text style={[
                    styles.progressDotText,
                    { color: step >= stepNum ? '#FFFFFF' : colors.textSecondary }
                  ]}>
                    {stepNum}
                  </Text>
                </View>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                  {stepNum === 1 ? 'Date' : stepNum === 2 ? 'Duration' : stepNum === 3 ? 'Time' : 'Notes'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Step 1: Date Selection */}
        {step === 1 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Date</Text>
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <Text style={[styles.monthLabel, { color: colors.text }]}>
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
              </View>

              <View style={styles.weekDays}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Text key={day} style={[styles.weekDay, { color: colors.textSecondary }]}>{day}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {generateCalendarDates().map((dateObj) => {
                  const available = isDateAvailable(dateObj.value, dateObj.dayOfWeek);
                  const isSelected = selectedDate === dateObj.value;

                  return (
                    <TouchableOpacity
                      key={dateObj.value}
                      style={[
                        styles.calendarDate,
                        { backgroundColor: colors.surface },
                        isSelected && available && { backgroundColor: colors.primary },
                        !available && { opacity: 0.3 }
                      ]}
                      onPress={() => available && setSelectedDate(dateObj.value)}
                      disabled={!available}
                    >
                      <Text style={[
                        styles.calendarDateText,
                        { color: isSelected && available ? '#FFFFFF' : colors.text },
                        !available && { color: colors.textSecondary }
                      ]}>
                        {dateObj.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {selectedDate && (
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: colors.primary }]}
                onPress={nextStep}
              >
                <Text style={styles.nextButtonText}>Next: Select Duration</Text>
                <ChevronRight color="#FFFFFF" size={20} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step 2: Duration Selection */}
        {step === 2 && (
          <View style={styles.section}>
            <View style={styles.stepHeader}>
              <TouchableOpacity onPress={prevStep} style={styles.backButton}>
                <ArrowLeft color={colors.primary} size={20} />
                <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
              </TouchableOpacity>
              <Text style={[styles.selectedDateText, { color: colors.textSecondary }]}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Duration</Text>
            <View style={styles.durationGrid}>
              {[30, 60, 90, 120].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.durationCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    duration === mins && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => {
                    setDuration(mins);
                    setCustomDuration('');
                  }}
                >
                  <Clock
                    color={duration === mins ? '#FFFFFF' : colors.primary}
                    size={24}
                  />
                  <Text style={[
                    styles.durationCardText,
                    { color: duration === mins ? '#FFFFFF' : colors.text }
                  ]}>
                    {mins} minutes
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Custom Duration */}
              <TouchableOpacity
                style={[
                  styles.durationCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  duration === 0 && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setDuration(0)}
              >
                <Clock
                  color={duration === 0 ? '#FFFFFF' : colors.primary}
                  size={24}
                />
                <Text style={[
                  styles.durationCardText,
                  { color: duration === 0 ? '#FFFFFF' : colors.text }
                ]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {duration === 0 && (
              <View style={styles.customDurationContainer}>
                <Text style={[styles.customDurationLabel, { color: colors.text }]}>
                  Enter custom duration (minutes):
                </Text>
                <TextInput
                  style={[styles.customDurationInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., 45"
                  placeholderTextColor={colors.textSecondary}
                  value={customDuration}
                  onChangeText={setCustomDuration}
                  keyboardType="numeric"
                />
              </View>
            )}

            {(duration > 0 || (duration === 0 && customDuration)) && (
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: colors.primary }]}
                onPress={nextStep}
              >
                <Text style={styles.nextButtonText}>Next: Select Time</Text>
                <ChevronRight color="#FFFFFF" size={20} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step 3: Time Selection */}
        {step === 3 && (
          <View style={styles.section}>
            <View style={styles.stepHeader}>
              <TouchableOpacity onPress={prevStep} style={styles.backButton}>
                <ArrowLeft color={colors.primary} size={20} />
                <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
              </TouchableOpacity>
              <Text style={[styles.selectedDateText, { color: colors.textSecondary }]}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })} • {getCurrentDuration()} min
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Time Slots</Text>
            <Text style={[styles.timeSlotInfo, { color: colors.textSecondary }]}>
              Showing {getCurrentDuration()}-minute slots that fit your selected duration
            </Text>

            {availableTimeSlots.length === 0 ? (
              <View style={[styles.noSlotsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Clock color={colors.textSecondary} size={32} />
                <Text style={[styles.noSlotsText, { color: colors.text }]}>No available time slots</Text>
                <Text style={[styles.noSlotsSubtext, { color: colors.textSecondary }]}>
                  Try selecting a different duration or date
                </Text>
              </View>
            ) : (
              <View style={styles.timeGrid}>
                {availableTimeSlots.map((time) => {
                  const isSelected = selectedTime === time;

                  // Check if this slot has existing pending requests
                  const hasPendingRequests = existingBookings.some(booking =>
                    booking.start_time === time && booking.status === 'pending'
                  );

                  return (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeOption,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                        hasPendingRequests && { borderColor: colors.warning, borderWidth: 2 }
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text style={[
                        styles.timeText,
                        { color: isSelected ? '#FFFFFF' : colors.text }
                      ]}>
                        {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Text>
                      {hasPendingRequests && (
                        <Text style={[styles.pendingIndicator, { color: colors.warning }]}>
                          Requested
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {availableTimeSlots.length > 0 && (
              <Text style={[styles.multiRequestInfo, { color: colors.textSecondary }]}>
                💡 Multiple clients can request the same time slot. The trainer will choose who to confirm.
              </Text>
            )}

            {selectedTime && (
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: colors.primary }]}
                onPress={nextStep}
              >
                <Text style={styles.nextButtonText}>Next: Add Notes</Text>
                <ChevronRight color="#FFFFFF" size={20} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step 4: Notes and Confirmation */}
        {step === 4 && (
          <View style={styles.section}>
            <View style={styles.stepHeader}>
              <TouchableOpacity onPress={prevStep} style={styles.backButton}>
                <ArrowLeft color={colors.primary} size={20} />
                <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
              </TouchableOpacity>
            </View>

            {/* Booking Summary */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Booking Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Date:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Time:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Duration:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {getCurrentDuration()} minutes
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes (Optional)</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Any specific goals or requirements for this session..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.bookButton, { backgroundColor: colors.primary }]}
              onPress={handleBookSession}
              disabled={booking}
            >
              <MessageSquare color="#FFFFFF" size={20} />
              <Text style={styles.bookButtonText}>
                {booking ? 'Requesting...' : 'Request Session'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resetButton, { borderColor: colors.border }]}
              onPress={resetSelection}
            >
              <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>
                Start Over
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  trainerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  trainerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainerDetails: {
    flex: 1,
  },
  trainerName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  trainerSpecializations: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  dateScroll: {
    flexDirection: 'row',
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeOption: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  durationOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  durationOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  unavailableText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  selectDateFirst: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressDotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  calendarContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  weekDay: {
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
  },
  calendarDateText: {
    fontSize: 16,
    fontWeight: '500',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  durationCard: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  durationCardText: {
    fontSize: 14,
    fontWeight: '500',
  },
  customDurationContainer: {
    marginTop: 16,
  },
  customDurationLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  customDurationInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  resetButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeSlotInfo: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noSlotsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  noSlotsText: {
    fontSize: 16,
    fontWeight: '500',
  },
  noSlotsSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  pendingIndicator: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  multiRequestInfo: {
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
});