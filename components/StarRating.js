import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';

export default function StarRating({ rating, onRatingChange, editable = false, size = 24 }) {
  const [hoverRating, setHoverRating] = useState(0);

  const handlePress = (value) => {
    if (editable && onRatingChange) {
      onRatingChange(value);
    }
  };

  const renderStars = () => {
    const stars = [];
    const displayRating = hoverRating || rating || 0;

    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= displayRating;
      const isHalf = i - 0.5 === displayRating;

      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handlePress(i)}
          disabled={!editable}
          activeOpacity={editable ? 0.7 : 1}
        >
          <Ionicons
            name={isFilled ? 'star' : isHalf ? 'star-half' : 'star-outline'}
            size={size}
            color={isFilled || isHalf ? '#FFD700' : '#CCCCCC'}
            style={styles.star}
          />
        </TouchableOpacity>
      );
    }

    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      {rating > 0 && (
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginHorizontal: 2,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
