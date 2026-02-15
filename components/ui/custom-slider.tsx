import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';

interface CustomSliderProps {
  minimumValue: number;
  maximumValue: number;
  value: number;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  trackColor?: string;
  activeTrackColor?: string;
  thumbColor?: string;
}

export function CustomSlider({
  minimumValue,
  maximumValue,
  value,
  onValueChange,
  onSlidingComplete,
  trackColor = '#ccc',
  activeTrackColor = '#007AFF',
  thumbColor = '#007AFF',
}: CustomSliderProps) {
  const trackWidth = useSharedValue(0);
  const range = maximumValue - minimumValue;
  const fraction = Math.max(0, Math.min(1, (value - minimumValue) / range));

  const clampAndEmit = (x: number) => {
    'worklet';
    const clamped = Math.max(0, Math.min(x, trackWidth.value));
    const val = minimumValue + (clamped / trackWidth.value) * range;
    runOnJS(onValueChange)(val);
  };

  const emitComplete = (x: number) => {
    'worklet';
    if (!onSlidingComplete) return;
    const clamped = Math.max(0, Math.min(x, trackWidth.value));
    const val = minimumValue + (clamped / trackWidth.value) * range;
    runOnJS(onSlidingComplete)(val);
  };

  const startX = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = fraction * trackWidth.value;
    })
    .onUpdate((e) => {
      clampAndEmit(startX.value + e.translationX);
    })
    .onEnd((e) => {
      emitComplete(startX.value + e.translationX);
    })
    .hitSlop({ top: 16, bottom: 16 });

  const tap = Gesture.Tap()
    .onEnd((e) => {
      clampAndEmit(e.x);
      emitComplete(e.x);
    });

  const gesture = Gesture.Race(pan, tap);

  const thumbStyle = useAnimatedStyle(() => ({
    left: fraction * trackWidth.value - 12,
  }));

  const activeStyle = useAnimatedStyle(() => ({
    width: fraction * trackWidth.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={{ height: 40, justifyContent: 'center' }}
        onLayout={(e) => {
          trackWidth.value = e.nativeEvent.layout.width;
        }}
      >
        {/* Track background */}
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: trackColor,
          }}
        />
        {/* Active track */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              height: 4,
              borderRadius: 2,
              backgroundColor: activeTrackColor,
            },
            activeStyle,
          ]}
        />
        {/* Thumb */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: thumbColor,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 3,
            },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}
