// Modern theme constants - keeping all existing colors
export const COLORS = {
  // Brand colors (DO NOT CHANGE)
  primary: '#8B7FA8',
  primaryLight: '#F0E6FF',
  primaryBorder: '#E0D0FF',
  
  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  backgroundTertiary: '#F8F8F8',
  
  // Text colors
  textPrimary: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textWhite: '#FFFFFF',
  
  // Borders
  border: '#E0E0E0',
  borderLight: '#E8E8E8',
  
  // Accent colors
  accentOrange: '#FF9800',
  accentGreen: '#4CAF50',
  accentRed: '#FF5252',
  accentBlue: '#2196F3',
  accentYellow: '#FFC107',
  
  // Status colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#FF5252',
  info: '#2196F3',
};

// Modern spacing scale
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

// Modern border radius
export const BORDER_RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  round: 9999,
};

// Modern shadows
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Modern typography
export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    color: COLORS.textPrimary,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    color: COLORS.textPrimary,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: COLORS.textPrimary,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: COLORS.textPrimary,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: COLORS.textPrimary,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: COLORS.textTertiary,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: COLORS.textWhite,
  },
};

// Card styles
export const CARD_STYLES = {
  default: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  elevated: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.lg,
  },
  flat: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
  },
};

// Button styles
export const BUTTON_STYLES = {
  primary: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    minHeight: 52,
    ...SHADOWS.sm,
  },
  secondary: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
};

// Input styles
export const INPUT_STYLES = {
  default: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
    minHeight: 52,
  },
  focused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
};
