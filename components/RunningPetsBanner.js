import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { COLORS } from '../styles/theme';

function PetRunner({ color, accentColor, size, top, duration, delay }) {
  const { width } = useWindowDimensions();
  const travel = useRef(new Animated.Value(-size * 1.8)).current;
  const gait = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const runAcross = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(travel, {
          toValue: width + size * 1.8,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(travel, {
          toValue: -size * 1.8,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    const gaitLoop = Animated.loop(
      Animated.timing(gait, {
        toValue: 1,
        duration: 420,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -4,
          duration: 220,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 220,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    runAcross.start();
    gaitLoop.start();
    bobLoop.start();

    return () => {
      runAcross.stop();
      gaitLoop.stop();
      bobLoop.stop();
    };
  }, [bob, delay, duration, gait, size, travel, width]);

  const frontLegRotation = gait.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['20deg', '-20deg', '20deg'],
  });

  const backLegRotation = gait.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-20deg', '20deg', '-20deg'],
  });

  const tailRotation = gait.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['18deg', '34deg', '18deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.runnerTrack,
        {
          top,
          transform: [{ translateX: travel }],
        },
      ]}
    >
      <Animated.View style={[styles.petWrapper, { transform: [{ translateY: bob }] }]}>
        <Animated.View
          style={[
            styles.tail,
            {
              width: size * 0.26,
              height: size * 0.08,
              borderRadius: size * 0.08,
              backgroundColor: accentColor,
              right: size * 0.1,
              top: size * 0.22,
              transform: [{ rotate: tailRotation }],
            },
          ]}
        />

        <View style={[styles.body, { width: size * 0.9, height: size * 0.42, borderRadius: size * 0.24, backgroundColor: color }]} />

        <View
          style={[
            styles.head,
            {
              width: size * 0.38,
              height: size * 0.34,
              borderRadius: size * 0.2,
              backgroundColor: color,
              left: size * 0.62,
              top: size * 0.02,
            },
          ]}
        />

        <View
          style={[
            styles.snout,
            {
              width: size * 0.14,
              height: size * 0.11,
              borderRadius: size * 0.06,
              backgroundColor: '#FFF6E9',
              left: size * 0.86,
              top: size * 0.14,
            },
          ]}
        />

        <View
          style={[
            styles.ear,
            {
              borderLeftWidth: size * 0.08,
              borderRightWidth: size * 0.08,
              borderBottomWidth: size * 0.14,
              left: size * 0.68,
              top: -size * 0.02,
              borderBottomColor: accentColor,
            },
          ]}
        />
        <View
          style={[
            styles.ear,
            {
              borderLeftWidth: size * 0.08,
              borderRightWidth: size * 0.08,
              borderBottomWidth: size * 0.14,
              left: size * 0.8,
              top: -size * 0.01,
              borderBottomColor: accentColor,
            },
          ]}
        />

        <View style={[styles.spot, { width: size * 0.2, height: size * 0.14, borderRadius: size * 0.08, backgroundColor: accentColor, left: size * 0.26, top: size * 0.12 }]} />
        <View style={[styles.spot, { width: size * 0.08, height: size * 0.08, borderRadius: size * 0.04, backgroundColor: '#2F2A4A', left: size * 0.88, top: size * 0.12 }]} />

        <Animated.View
          style={[
            styles.leg,
            {
              width: size * 0.07,
              height: size * 0.32,
              left: size * 0.18,
              top: size * 0.3,
              backgroundColor: color,
              transform: [{ rotate: backLegRotation }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.leg,
            {
              width: size * 0.07,
              height: size * 0.32,
              left: size * 0.34,
              top: size * 0.32,
              backgroundColor: accentColor,
              transform: [{ rotate: frontLegRotation }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.leg,
            {
              width: size * 0.07,
              height: size * 0.32,
              left: size * 0.63,
              top: size * 0.28,
              backgroundColor: color,
              transform: [{ rotate: frontLegRotation }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.leg,
            {
              width: size * 0.07,
              height: size * 0.32,
              left: size * 0.77,
              top: size * 0.31,
              backgroundColor: accentColor,
              transform: [{ rotate: backLegRotation }],
            },
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

export default function RunningPetsBanner() {
  return (
    <View pointerEvents="none" style={styles.container}>
      <PetRunner
        color="#F4A261"
        accentColor="#E76F51"
        size={84}
        top={16}
        duration={6500}
        delay={0}
      />
      <PetRunner
        color="#BDE0FE"
        accentColor={COLORS.primary}
        size={74}
        top={74}
        duration={7200}
        delay={1500}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 138,
    marginBottom: 12,
    overflow: 'hidden',
  },
  runnerTrack: {
    position: 'absolute',
    left: 0,
  },
  petWrapper: {
    width: 118,
    height: 84,
  },
  body: {
    position: 'absolute',
  },
  head: {
    position: 'absolute',
  },
  snout: {
    position: 'absolute',
  },
  ear: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tail: {
    position: 'absolute',
  },
  spot: {
    position: 'absolute',
  },
  leg: {
    position: 'absolute',
    borderRadius: 999,
  },
});
