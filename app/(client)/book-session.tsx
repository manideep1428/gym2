import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase, Profile, TrainerAvailability } from '@/lib/supabase';
import NotificationService from '@/lib/notificationService';
import { Search, Filter, Star, Calendar, ArrowRight, ArrowLeft, X, ChevronLeft, User, ChevronRight, Clock, MessageSquare, CalendarPlus, Sunrise, Sun, Sunset } from 'lucide-react-native';
import { googleCalendarService } from '@/lib/googleCalendar';

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
  const [step, setStep] = useState(1);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    if (trainerId) {
      fetchTrainerData();
      fetchAvailability();
      checkCalendarConnection();
    }
  }, [trainerId]);

  const checkCalendarConnection = async () => {
    try {
      const connected = await googleCalendarService.isConnected();
      const signedIn = await googleCalendarService.isSignedIn();
      setIsCalendarConnected(connected && signedIn);
      setAddToCalendar(connected && signedIn);
    } catch (error) {
      console.error('Error checking calendar connection:', error);
      setIsCalendarConnected(false);
      setAddToCalendar(false);
    }
  };

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

    const availableSlots = new Set<string>();

    // For each availability window
    for (const avail of dayAvailability) {
      if (!avail.start_time || !avail.end_time) continue;

      // Parse time strings properly
      const [startHour, startMin] = avail.start_time.split(':').map(Number);
      const [endHour, endMin] = avail.end_time.split(':').map(Number);
      
      const availStart = new Date();
      availStart.setHours(startHour, startMin, 0, 0);
      
      const availEnd = new Date();
      availEnd.setHours(endHour, endMin, 0, 0);

      // Check if the selected duration is available for this time slot
      const allowedDurations = avail.session_durations || [30, 60, 90, 120];
      if (!allowedDurations.includes(sessionDuration)) continue;

      // Generate time slots within this availability window
      let currentTime = new Date(availStart);

      while (currentTime < availEnd) {
        const sessionStart = new Date(currentTime);
        const sessionEnd = new Date(sessionStart.getTime() + sessionDuration * 60000);

        // Check if session fits within availability window
        if (sessionEnd <= availEnd) {
          // Check for conflicts with existing bookings
          const hasConflict = existingBookings.some(booking => {
            if (!booking.start_time || !booking.end_time) return false;
            
            const [bookStartHour, bookStartMin] = booking.start_time.split(':').map(Number);
            const [bookEndHour, bookEndMin] = booking.end_time.split(':').map(Number);
            
            const bookingStart = new Date();
            bookingStart.setHours(bookStartHour, bookStartMin, 0, 0);
            
            const bookingEnd = new Date();
            bookingEnd.setHours(bookEndHour, bookEndMin, 0, 0);

            // Check if sessions overlap
            return (sessionStart < bookingEnd && sessionEnd > bookingStart);
          });

          if (!hasConflict) {
            const timeString = currentTime.toTimeString().slice(0, 5);
            availableSlots.add(timeString);
          }
        }

        // Move to next time slot (15-minute intervals)
        currentTime.setMinutes(currentTime.getMinutes() + 15);
      }
    }

    // Convert Set to Array and sort
    return Array.from(availableSlots).sort();
  };

  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Start from tomorrow to avoid booking same day
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 1);

    // Generate dates for the next 21 days
    for (let i = 0; i < 21; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      dates.push({
        date: date,
        value: date.toISOString().split('T')[0],
        day: date.getDate(),
        dayOfWeek: date.getDay(),
        isCurrentMonth: date.getMonth() === currentMonth,
      });
    }

    return dates;
  };

  const getAvailableDurations = (): number[] => {
    if (!selectedDate || !trainerId) return [30, 60, 90, 120];

    const dayOfWeek = new Date(selectedDate).getDay();

    // Get trainer's availability for this day
    const dayAvailability = availability.filter(avail =>
      (avail.day_of_week === dayOfWeek && avail.is_recurring && !avail.is_blocked) ||
      (avail.specific_date === selectedDate && !avail.is_blocked)
    );

    if (dayAvailability.length === 0) return [30, 60, 90, 120];

    // Collect all unique allowed durations from the availability slots
    const allowedDurations = new Set<number>();
    dayAvailability.forEach(avail => {
      const durations = avail.session_durations || [30, 60];
      durations.forEach(duration => allowedDurations.add(duration));
    });

    return Array.from(allowedDurations).sort((a, b) => a - b);
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

    // Validate that the selected duration is allowed for this trainer/time
    const sessionDuration = getCurrentDuration();
    const availableDurations = getAvailableDurations();
    if (!availableDurations.includes(sessionDuration)) {
      Alert.alert('Error', `This trainer doesn't offer ${sessionDuration}-minute sessions on the selected date. Please choose a different duration.`);
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

      // Send push notification to trainer about new booking request
      const notificationService = NotificationService.getInstance();
      const sessionTime = `${new Date(selectedDate).toLocaleDateString()} at ${new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      
      await notificationService.notifyBookingRequest(
        trainer.id,
        userProfile.name,
        sessionTime
      );

      // Add to Google Calendar if enabled
      let calendarEventId = null;
      if (addToCalendar && isCalendarConnected) {
        try {
          const { data: bookingData } = await supabase
            .from('bookings')
            .select('*')
            .eq('client_id', userProfile.id)
            .eq('trainer_id', trainer.id)
            .eq('date', selectedDate)
            .eq('start_time', selectedTime)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (bookingData) {
            calendarEventId = await googleCalendarService.addBookingToCalendar(bookingData, 'client');
          }
        } catch (calendarError) {
          console.error('Error adding to calendar:', calendarError);
          // Don't fail the booking if calendar sync fails
        }
      }

      Alert.alert(
        'Booking Requested!',
        `Your session request has been sent to the trainer. Multiple clients can request the same time slot - the trainer will choose who to confirm.${calendarEventId ? '\n\n✅ Added to your Google Calendar!' : ''}`,
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
              {getAvailableDurations().map((mins) => (
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

              {/* Custom Duration - only show if trainer allows custom */}
              {getAvailableDurations().length === 0 && (
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
              )}
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
                <Clock color={colors.textSecondary} size={48} />
                <Text style={[styles.noSlotsText, { color: colors.text }]}>No available time slots</Text>
                <Text style={[styles.noSlotsSubtext, { color: colors.textSecondary }]}>
                  Try selecting a different duration or date
                </Text>
              </View>
            ) : (
              <View style={styles.timeSlotsContainer}>
                {/* Time slots organized by morning/afternoon/evening */}
                {(() => {
                  const morningSlots = availableTimeSlots.filter(time => {
                    const hour = parseInt(time.split(':')[0]);
                    return hour >= 6 && hour < 12;
                  });
                  const afternoonSlots = availableTimeSlots.filter(time => {
                    const hour = parseInt(time.split(':')[0]);
                    return hour >= 12 && hour < 17;
                  });
                  const eveningSlots = availableTimeSlots.filter(time => {
                    const hour = parseInt(time.split(':')[0]);
                    return hour >= 17 && hour <= 23;
                  });

                  return (
                    <>
                      {morningSlots.length > 0 && (
                        <View style={styles.timeSection}>
                          <View style={styles.timeSectionHeader}>
                            <Sunrise color={colors.primary} size={20} />
                            <Text style={[styles.timeSectionTitle, { color: colors.text }]}>
                              Morning ({morningSlots.length} slots)
                            </Text>
                          </View>
                          <View style={styles.timeGrid}>
                            {morningSlots.map((time) => {
                              const isSelected = selectedTime === time;
                              const hasPendingRequests = existingBookings.some(booking =>
                                booking.start_time === time && booking.status === 'pending'
                              );

                              return (
                                <TouchableOpacity
                                  key={time}
                                  style={[
                                    styles.timeSlotCard,
                                    {
                                      backgroundColor: isSelected ? colors.primary :
                                                     hasPendingRequests ? colors.warning + '15' : colors.surface,
                                      borderColor: isSelected ? colors.primary :
                                                 hasPendingRequests ? colors.warning : colors.border,
                                      borderWidth: isSelected || hasPendingRequests ? 2 : 1
                                    }
                                  ]}
                                  onPress={() => setSelectedTime(time)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.timeSlotContent}>
                                    <Text style={[
                                      styles.timeSlotTime,
                                      { color: isSelected ? '#FFFFFF' : colors.text }
                                    ]}>
                                      {(() => {
                                        try {
                                          const [hours, minutes] = time.split(':').map(Number);
                                          const date = new Date();
                                          date.setHours(hours, minutes, 0, 0);
                                          return date.toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true,
                                          });
                                        } catch (error) {
                                          return time;
                                        }
                                      })()} 
                                    </Text>
                                    <Text style={[
                                      styles.timeSlotPeriod,
                                      { color: isSelected ? '#FFFFFF' + 'CC' : colors.textSecondary }
                                    ]}>
                                      {getCurrentDuration()} min
                                    </Text>
                                  </View>
                                  {hasPendingRequests && (
                                    <View style={styles.pendingBadge}>
                                      <Text style={[styles.pendingBadgeText, { color: colors.warning }]}>
                                        ⚠️
                                      </Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {afternoonSlots.length > 0 && (
                        <View style={styles.timeSection}>
                          <View style={styles.timeSectionHeader}>
                            <Sun color={colors.primary} size={20} />
                            <Text style={[styles.timeSectionTitle, { color: colors.text }]}>
                              Afternoon ({afternoonSlots.length} slots)
                            </Text>
                          </View>
                          <View style={styles.timeGrid}>
                            {afternoonSlots.map((time) => {
                              const isSelected = selectedTime === time;
                              const hasPendingRequests = existingBookings.some(booking =>
                                booking.start_time === time && booking.status === 'pending'
                              );

                              return (
                                <TouchableOpacity
                                  key={time}
                                  style={[
                                    styles.timeSlotCard,
                                    {
                                      backgroundColor: isSelected ? colors.primary :
                                                     hasPendingRequests ? colors.warning + '15' : colors.surface,
                                      borderColor: isSelected ? colors.primary :
                                                 hasPendingRequests ? colors.warning : colors.border,
                                      borderWidth: isSelected || hasPendingRequests ? 2 : 1
                                    }
                                  ]}
                                  onPress={() => setSelectedTime(time)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.timeSlotContent}>
                                    <Text style={[
                                      styles.timeSlotTime,
                                      { color: isSelected ? '#FFFFFF' : colors.text }
                                    ]}>
                                      {(() => {
                                        try {
                                          const [hours, minutes] = time.split(':').map(Number);
                                          const date = new Date();
                                          date.setHours(hours, minutes, 0, 0);
                                          return date.toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true,
                                          });
                                        } catch (error) {
                                          return time;
                                        }
                                      })()} 
                                    </Text>
                                    <Text style={[
                                      styles.timeSlotPeriod,
                                      { color: isSelected ? '#FFFFFF' + 'CC' : colors.textSecondary }
                                    ]}>
                                      {getCurrentDuration()} min
                                    </Text>
                                  </View>
                                  {hasPendingRequests && (
                                    <View style={styles.pendingBadge}>
                                      <Text style={[styles.pendingBadgeText, { color: colors.warning }]}>
                                        ⚠️
                                      </Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {eveningSlots.length > 0 && (
                        <View style={styles.timeSection}>
                          <View style={styles.timeSectionHeader}>
                            <Sunset color={colors.primary} size={20} />
                            <Text style={[styles.timeSectionTitle, { color: colors.text }]}>
                              Evening ({eveningSlots.length} slots)
                            </Text>
                          </View>
                          <View style={styles.timeGrid}>
                            {eveningSlots.map((time) => {
                              const isSelected = selectedTime === time;
                              const hasPendingRequests = existingBookings.some(booking =>
                                booking.start_time === time && booking.status === 'pending'
                              );

                              return (
                                <TouchableOpacity
                                  key={time}
                                  style={[
                                    styles.timeSlotCard,
                                    {
                                      backgroundColor: isSelected ? colors.primary :
                                                     hasPendingRequests ? colors.warning + '15' : colors.surface,
                                      borderColor: isSelected ? colors.primary :
                                                 hasPendingRequests ? colors.warning : colors.border,
                                      borderWidth: isSelected || hasPendingRequests ? 2 : 1
                                    }
                                  ]}
                                  onPress={() => setSelectedTime(time)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.timeSlotContent}>
                                    <Text style={[
                                      styles.timeSlotTime,
                                      { color: isSelected ? '#FFFFFF' : colors.text }
                                    ]}>
                                      {(() => {
                                        try {
                                          const [hours, minutes] = time.split(':').map(Number);
                                          const date = new Date();
                                          date.setHours(hours, minutes, 0, 0);
                                          return date.toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true,
                                          });
                                        } catch (error) {
                                          return time;
                                        }
                                      })()} 
                                    </Text>
                                    <Text style={[
                                      styles.timeSlotPeriod,
                                      { color: isSelected ? '#FFFFFF' + 'CC' : colors.textSecondary }
                                    ]}>
                                      {getCurrentDuration()} min
                                    </Text>
                                  </View>
                                  {hasPendingRequests && (
                                    <View style={styles.pendingBadge}>
                                      <Text style={[styles.pendingBadgeText, { color: colors.warning }]}>
                                        ⚠️
                                      </Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </>
                  );
                })()}
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

            {/* Google Calendar Integration Option */}
            {isCalendarConnected && (
              <View style={[styles.calendarOption, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.calendarOptionHeader}>
                  <CalendarPlus color={colors.primary} size={20} />
                  <Text style={[styles.calendarOptionTitle, { color: colors.text }]}>
                    Add to Google Calendar
                  </Text>
                </View>
                <Text style={[styles.calendarOptionDescription, { color: colors.textSecondary }]}>
                  Automatically sync this session to your Google Calendar with reminders
                </Text>
                <TouchableOpacity
                  style={styles.calendarToggle}
                  onPress={() => setAddToCalendar(!addToCalendar)}
                >
                  <View style={[
                    styles.toggleSwitch,
                    { backgroundColor: addToCalendar ? colors.primary : colors.border }
                  ]}>
                    <View style={[
                      styles.toggleThumb,
                      { backgroundColor: '#FFFFFF' },
                      addToCalendar && styles.toggleThumbActive
                    ]} />
                  </View>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    {addToCalendar ? 'Enabled' : 'Disabled'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  trainerCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
    justifyContent: 'flex-start',
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
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 20,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    marginBottom: 20,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 16,
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
    width: 36,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDate: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  calendarDateText: {
    fontSize: 14,
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
    padding: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  durationCardText: {
    fontSize: 12,
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
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  noSlotsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noSlotsSubtext: {
    fontSize: 12,
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
  calendarOption: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  calendarOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  calendarOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarOptionDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  calendarToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    left: 2,
  },
  toggleThumbActive: {
    left: 24,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSlotsContainer: {
    gap: 24,
  },
  timeSection: {
    marginBottom: 24,
  },
  timeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timeSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  timeSlotCard: {
    minWidth: '30%',
    maxWidth: '32%',
    borderRadius: 8,
    padding: 12,
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    position: 'relative',
  },
  timeSlotContent: {
    alignItems: 'center',
    gap: 2,
  },
  timeSlotTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeSlotPeriod: {
    fontSize: 10,
    fontWeight: '500',
  },
  pendingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
});