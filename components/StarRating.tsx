import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

interface StarRatingProps {
  rating: number;
  size?: number;
  maxStars?: number;
}

export default function StarRating({ rating, size = 16, maxStars = 5 }: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <View style={styles.container}>
      {[...Array(maxStars)].map((_, index) => {
        const isFilled = index < fullStars;
        const isHalf = index === fullStars && hasHalfStar;
        
        return (
          <Star
            key={index}
            size={size}
            color="#FFD700"
            fill={isFilled || isHalf ? "#FFD700" : "transparent"}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});