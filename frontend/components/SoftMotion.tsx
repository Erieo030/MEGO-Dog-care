import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, TouchableOpacityProps, ViewProps } from 'react-native';
import { Colors } from '../constants/Colors';

import { usePressFeedback, useReducedMotion } from '../hooks/usePressFeedback';

export function SoftEntrance({ children, style, ...props }: ViewProps) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const played = useRef(false);
  useEffect(() => {
    if (reduced) {
      opacity.stopAnimation();
      opacity.setValue(1);
      return;
    }
    if (played.current) return;
    played.current = true;
    opacity.setValue(0.5);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity, reduced]);
  return (
    <Animated.View {...props} style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
}

export function SoftField({
  focused,
  invalid,
  style,
  ...props
}: ViewProps & { focused: boolean; invalid: boolean }) {
  const reduced = useReducedMotion();
  const focus = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    focus.stopAnimation();
    if (reduced) {
      focus.setValue(focused ? 1 : 0);
      return;
    }
    const animation = Animated.timing(focus, {
      toValue: focused ? 1 : 0,
      duration: 140,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [focus, focused, reduced]);
  const borderColor = invalid
    ? Colors.danger
    : focus.interpolate({ inputRange: [0, 1], outputRange: [Colors.border, Colors.primary] });
  return <Animated.View {...props} style={[style, { borderColor }]} />;
}

/** Existing callers retain the same props; feedback follows the common accessibility policy. */
export function SoftButton({ style, ...props }: TouchableOpacityProps) {
  const feedback = usePressFeedback();
  return (
    <Pressable {...props} style={({ pressed }) => [style, feedback(pressed, props.disabled)]} />
  );
}
