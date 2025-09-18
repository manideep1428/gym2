import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Camera, Plus, X } from 'lucide-react-native';

interface ProgressEntry {
  id: string;
  client_notes: string;
  trainer_feedback: string;
  measurements: any;
  recorded_date: string;
  trainer: { name: string };
}

export default function ClientProgress() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    notes: '',
    weight: '',
    bodyFat: '',
  });
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('progress_tracking')
        .select(`
          *,
          trainer:profiles!trainer_id(name)
        `)
        .eq('client_id', userProfile.id)
        .order('recorded_date', { ascending: false });

      if (error) throw error;
      setProgressEntries(data || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProgressEntry = async () => {
    if (!userProfile) return;

    if (!newEntry.notes.trim()) {
      Alert.alert('Error', 'Please add some notes');
      return;
    }

    try {
      const measurements: any = {};
      if (newEntry.weight) measurements.weight = parseFloat(newEntry.weight);
      if (newEntry.bodyFat) measurements.bodyFat = parseFloat(newEntry.bodyFat);

      const { error } = await supabase
        .from('progress_tracking')
        .insert({
          client_id: userProfile.id,
          trainer_id: userProfile.id, // Self-entry
          client_notes: newEntry.notes,
          measurements,
        });

      if (error) throw error;

      setNewEntry({ notes: '', weight: '', bodyFat: '' });
      setShowAddEntry(false);
      fetchProgress();
      Alert.alert('Success', 'Progress entry added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add progress entry');
      console.error('Add progress error:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading progress...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>My Progress</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track your fitness journey
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddEntry(true)}
        >
          <Plus color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>

      {progressEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <TrendingUp color={colors.textSecondary} size={48} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No progress entries yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Start tracking your fitness journey
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.progressList}>
          {progressEntries.map((entry) => (
            <View key={entry.id} style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressDate, { color: colors.text }]}>
                  {formatDate(entry.recorded_date)}
                </Text>
                {entry.trainer?.name && (
                  <Text style={[styles.trainerName, { color: colors.primary }]}>
                    by {entry.trainer.name}
                  </Text>
                )}
              </View>

              {entry.client_notes && (
                <View style={styles.notesSection}>
                  <Text style={[styles.notesLabel, { color: colors.text }]}>Notes:</Text>
                  <Text style={[styles.notesText, { color: colors.textSecondary }]}>{entry.client_notes}</Text>
                </View>
              )}

              {entry.measurements && Object.keys(entry.measurements).length > 0 && (
                <View style={styles.measurementsSection}>
                  <Text style={[styles.notesLabel, { color: colors.text }]}>Measurements:</Text>
                  <View style={styles.measurementRow}>
                    {entry.measurements.weight && (
                      <Text style={[styles.measurementText, { color: colors.textSecondary }]}>
                        Weight: {entry.measurements.weight} lbs
                      </Text>
                    )}
                    {entry.measurements.bodyFat && (
                      <Text style={[styles.measurementText, { color: colors.textSecondary }]}>
                        Body Fat: {entry.measurements.bodyFat}%
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {entry.trainer_feedback && (
                <View style={styles.feedbackSection}>
                  <Text style={[styles.notesLabel, { color: colors.text }]}>Trainer Feedback:</Text>
                  <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>{entry.trainer_feedback}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Progress Modal */}
      <Modal
        visible={showAddEntry}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddEntry(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddEntry(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Progress</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.addEntryForm}>
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Notes</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="How did your workout go? Any achievements or challenges?"
                placeholderTextColor={colors.textSecondary}
                value={newEntry.notes}
                onChangeText={(text) => setNewEntry({ ...newEntry, notes: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Measurements (Optional)</Text>
              
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Weight (lbs)"
                placeholderTextColor={colors.textSecondary}
                value={newEntry.weight}
                onChangeText={(text) => setNewEntry({ ...newEntry, weight: text })}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Body Fat (%)"
                placeholderTextColor={colors.textSecondary}
                value={newEntry.bodyFat}
                onChangeText={(text) => setNewEntry({ ...newEntry, bodyFat: text })}
                keyboardType="decimal-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={addProgressEntry}
            >
              <Text style={styles.submitButtonText}>Add Progress Entry</Text>
            </TouchableOpacity>
          </ScrollView>
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
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  progressList: {
    paddingHorizontal: 20,
  },
  progressCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  trainerName: {
    fontSize: 12,
    fontWeight: '500',
  },
  notesSection: {
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  measurementsSection: {
    marginBottom: 12,
  },
  measurementRow: {
    flexDirection: 'row',
    gap: 16,
  },
  measurementText: {
    fontSize: 14,
  },
  feedbackSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
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
  addEntryForm: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});