# Animations

## Overview

All animations use `react-native-reanimated` (v4) for 60fps UI-thread animations. No `Animated` from React Native core is used.

## Animation Inventory

| Element | Animation | Technique | Duration |
|---------|-----------|-----------|----------|
| Welcome logo | Fade in + scale 0.8→1 | `withTiming` | 800ms |
| Welcome buttons | Staggered fade + translateY | `withDelay` + `withTiming` | 400-600ms delay |
| Button press | Scale 1→0.97→1 | `withSpring` | ~200ms |
| Page transitions | Slide from right | `react-native-screens` native | System default |
| Auth→Tabs transition | Fade | Stack screen `animation: 'fade'` | System default |
| Toast enter | translateY -100→0 + opacity | `withSpring` | ~300ms |
| Toast dismiss | translateY→-100 or swipe | `withTiming` / gesture | 250ms |
| Input focus | Border color interpolation | `interpolateColor` | 200ms |
| Validation error | Shake X ±10px | `withSequence` + `withTiming` | 250ms |
| Password strength | Width + color animated | `withTiming` + `interpolateColor` | 300ms |
| Guest banner | Slide down from top | `withSpring` | ~400ms |
| Loading spinner | Continuous rotation | `withRepeat` + `withTiming` | 800ms/loop |

## Patterns

### Spring Press Feedback
Used on all buttons for tactile feel:
```tsx
const scale = useSharedValue(1);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

onPressIn={() => {
  scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
}}
onPressOut={() => {
  scale.value = withSpring(1, { damping: 15, stiffness: 300 });
}}
```

### Staggered Entrance
Used on the welcome screen for sequential reveal:
```tsx
const opacity = useSharedValue(0);
const translateY = useSharedValue(20);

useEffect(() => {
  opacity.value = withDelay(400, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  translateY.value = withDelay(400, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
}, []);
```

### Shake Animation (Validation Errors)
```tsx
const shakeX = useSharedValue(0);

const triggerShake = () => {
  shakeX.value = withSequence(
    withTiming(10, { duration: 50 }),
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 50 }),
    withTiming(-10, { duration: 50 }),
    withTiming(0, { duration: 50 }),
  );
};
```

### Color Interpolation
Used for focus borders and password strength:
```tsx
const focusProgress = useSharedValue(0);

const style = useAnimatedStyle(() => ({
  borderColor: interpolateColor(
    focusProgress.value,
    [0, 1],
    [borderColor, primaryColor],
  ),
}));

// On focus
focusProgress.value = withTiming(1, { duration: 200 });
```

### Continuous Spinner
Used in button loading states:
```tsx
const rotation = useSharedValue(0);
rotation.value = withRepeat(withTiming(360, { duration: 800 }), -1, false);

const spinnerStyle = useAnimatedStyle(() => ({
  transform: [{ rotate: `${rotation.value}deg` }],
}));
```

### Swipe-to-Dismiss (Toast)
Combines `react-native-gesture-handler` pan gesture with reanimated:
```tsx
const swipeGesture = Gesture.Pan()
  .onUpdate((event) => {
    translateX.value = event.translationX;
  })
  .onEnd((event) => {
    if (event.translationX > threshold) {
      translateX.value = withTiming(SCREEN_WIDTH, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(onDismiss)(id);
      });
    } else {
      translateX.value = withSpring(0);
    }
  });
```

## Spring Configs

| Use Case | Config |
|----------|--------|
| Button press | `{ damping: 15, stiffness: 300 }` |
| Toast enter | `{ damping: 20, stiffness: 300 }` |
| Banner enter | `{ damping: 20, stiffness: 200 }` |
| Bounce back | `withSpring(0)` (defaults) |
