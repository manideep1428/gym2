import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Check } from 'lucide-react-native';

interface ColorPickerProps {
  selectedColor?: string;
  onColorSelect: (color: string) => void;
  title?: string;
}

export default function ColorPicker({ selectedColor, onColorSelect, title = "Choose Profile Color" }: ColorPickerProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Same 5 colors used in trainer cards
  const profileColors = [
    { color: '#FF6B6B', name: 'Coral Red' },
    { color: '#4ECDC4', name: 'Turquoise' },
    { color: '#45B7D1', name: 'Sky Blue' },
    { color: '#96CEB4', name: 'Mint Green' },
    { color: '#FECA57', name: 'Sunny Yellow' },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        This color will be shown to clients when they view your profile
      </Text>
      
      <View style={styles.colorGrid}>
        {profileColors.map((colorOption) => (
          <TouchableOpacity
            key={colorOption.color}
            style={[
              styles.colorOption,
              { backgroundColor: colorOption.color },
              selectedColor === colorOption.color && styles.selectedColorOption
            ]}
            onPress={() => onColorSelect(colorOption.color)}
            activeOpacity={0.8}
          >
            {selectedColor === colorOption.color && (
              <Check color="#FFFFFF" size={24} strokeWidth={3} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.colorNames}>
        {profileColors.map((colorOption) => (
          <Text
            key={`${colorOption.color}-name`}
            style={[
              styles.colorName,
              { color: selectedColor === colorOption.color ? colors.text : colors.textSecondary }
            ]}
          >
            {colorOption.name}
          </Text>
        ))}
      </View>
      
      {selectedColor && (
        <View style={styles.preview}>
          <Text style={[styles.previewTitle, { color: colors.text }]}>Preview:</Text>
          <View style={styles.previewContainer}>
            <View style={[styles.previewAvatar, { backgroundColor: selectedColor }]}>
              <Text style={styles.previewInitial}>A</Text>
            </View>
            <Text style={[styles.previewText, { color: colors.textSecondary }]}>
              This is how your profile will appear to clients
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  colorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedColorOption: {
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  colorNames: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  colorName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    width: 60,
  },
  preview: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  previewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewText: {
    fontSize: 14,
    flex: 1,
  },
});
