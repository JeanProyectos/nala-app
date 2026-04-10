import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimatedButton from '../components/AnimatedButton';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../styles/theme';

const { width } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    icon: '🩺',
    title: 'Veterinary help when you need it',
    description: 'Request a consultation in seconds and talk to a veterinarian from your phone.',
    primaryCta: 'Continue',
  },
  {
    icon: '💬',
    title: 'Choose how you want help',
    description: 'Pick the consultation type that fits your situation.',
    options: ['Chat', 'Voice', 'Video'],
    primaryCta: 'Continue',
  },
  {
    icon: '🚀',
    title: 'Ready to start?',
    description: 'You can request your first consultation now. Selecting a pet is optional.',
    primaryCta: 'Request Consultation',
    secondaryCta: 'Maybe later',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);

  const handleNext = async () => {
    if (currentPage < ONBOARDING_DATA.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      await finishOnboarding();
    }
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/(tabs)/inicio');
  };

  const currentData = ONBOARDING_DATA[currentPage];
  const isLastPage = currentPage === ONBOARDING_DATA.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.page}>
        <View style={styles.content}>
          <Text style={styles.emoji}>{currentData.icon}</Text>
          <Text style={styles.title}>{currentData.title}</Text>
          <Text style={styles.description}>{currentData.description}</Text>
          {currentData.options ? (
            <View style={styles.optionsContainer}>
              {currentData.options.map((option) => (
                <View key={option} style={styles.optionChip}>
                  <Text style={styles.optionChipText}>{option}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentPage && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          {isLastPage ? (
            <AnimatedButton
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>
                {currentData.secondaryCta || 'Maybe later'}
              </Text>
            </AnimatedButton>
          ) : (
            <AnimatedButton
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>Skip</Text>
            </AnimatedButton>
          )}

          <AnimatedButton
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextText}>
              {currentData.primaryCta}
            </Text>
          </AnimatedButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  emoji: {
    fontSize: 80,
    marginBottom: SPACING.xxl,
  },
  title: {
    ...TYPOGRAPHY.h2,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  description: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  optionChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  optionChipText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  footer: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
    backgroundColor: COLORS.background,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
  },
  skipButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
  nextButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  nextText: {
    ...TYPOGRAPHY.button,
  },
});
