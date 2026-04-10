import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../styles/theme';

const AppAlertContext = createContext(null);

function inferVariant(title = '') {
  const normalizedTitle = String(title).toLowerCase();

  if (
    normalizedTitle.includes('error') ||
    normalizedTitle.includes('rechaz') ||
    normalizedTitle.includes('deneg') ||
    normalizedTitle.includes('cancel')
  ) {
    return 'error';
  }

  if (
    normalizedTitle.includes('éxito') ||
    normalizedTitle.includes('exito') ||
    normalizedTitle.includes('gracias') ||
    normalizedTitle.includes('guardad') ||
    normalizedTitle.includes('actualiz')
  ) {
    return 'success';
  }

  if (
    normalizedTitle.includes('permiso') ||
    normalizedTitle.includes('alert') ||
    normalizedTitle.includes('pendiente') ||
    normalizedTitle.includes('expir')
  ) {
    return 'warning';
  }

  return 'info';
}

function normalizeButtons(buttons) {
  if (!buttons || buttons.length === 0) {
    return [{ text: 'OK' }];
  }
  return buttons.map((button) => ({
    text: button?.text || 'OK',
    style: button?.style,
    onPress: button?.onPress,
  }));
}

export function AppAlertProvider({ children }) {
  const [currentAlert, setCurrentAlert] = useState(null);
  const queueRef = useRef([]);
  const originalAlertRef = useRef(Alert.alert);

  const showAlert = useMemo(
    () => (title, message = '', buttons, options = {}) => {
      queueRef.current.push({
        title,
        message,
        buttons: normalizeButtons(buttons),
        options,
        variant: inferVariant(title),
      });

      setCurrentAlert((prev) => prev || queueRef.current.shift() || null);
    },
    [],
  );

  const closeAlert = (button) => {
    setCurrentAlert(null);

    if (button?.onPress) {
      setTimeout(() => button.onPress(), 0);
    }

    setTimeout(() => {
      if (queueRef.current.length > 0) {
        setCurrentAlert(queueRef.current.shift());
      }
    }, 0);
  };

  useEffect(() => {
    Alert.alert = showAlert;

    return () => {
      Alert.alert = originalAlertRef.current;
    };
  }, [showAlert]);

  const contextValue = useMemo(
    () => ({
      showAlert,
    }),
    [showAlert],
  );

  return (
    <AppAlertContext.Provider value={contextValue}>
      {children}

      <Modal
        visible={!!currentAlert}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (currentAlert?.options?.cancelable !== false) {
            closeAlert(currentAlert?.buttons?.[0]);
          }
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View
              style={[
                styles.iconContainer,
                currentAlert?.variant === 'success' && styles.iconSuccess,
                currentAlert?.variant === 'warning' && styles.iconWarning,
                currentAlert?.variant === 'error' && styles.iconError,
              ]}
            >
              <Ionicons
                name={
                  currentAlert?.variant === 'success'
                    ? 'checkmark'
                    : currentAlert?.variant === 'warning'
                      ? 'alert'
                      : currentAlert?.variant === 'error'
                        ? 'close'
                        : 'information'
                }
                size={28}
                color={COLORS.textWhite}
              />
            </View>

            <Text style={styles.title}>{currentAlert?.title}</Text>
            {!!currentAlert?.message && <Text style={styles.message}>{currentAlert.message}</Text>}

            <View style={styles.buttons}>
              {(currentAlert?.buttons || []).map((button, index) => (
                <TouchableOpacity
                  key={`${button.text}-${index}`}
                  style={[
                    styles.button,
                    button.style === 'cancel' ? styles.buttonSecondary : styles.buttonPrimary,
                    (currentAlert?.buttons?.length || 0) === 1 && styles.singleButton,
                    button.style === 'destructive' && styles.buttonDestructive,
                  ]}
                  onPress={() => closeAlert(button)}
                >
                  <Text
                    style={[
                      button.style === 'cancel' ? styles.buttonSecondaryText : styles.buttonPrimaryText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const context = useContext(AppAlertContext);
  if (!context) {
    throw new Error('useAppAlert debe usarse dentro de AppAlertProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modal: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxl,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accentBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconSuccess: {
    backgroundColor: COLORS.accentGreen,
  },
  iconWarning: {
    backgroundColor: COLORS.accentOrange,
  },
  iconError: {
    backgroundColor: COLORS.accentRed,
  },
  title: {
    ...TYPOGRAPHY.h4,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleButton: {
    flex: 0,
    minWidth: 140,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonDestructive: {
    backgroundColor: COLORS.accentRed,
  },
  buttonPrimaryText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textWhite,
  },
  buttonSecondaryText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
});
