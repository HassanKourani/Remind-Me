# Theme System

## Color System

RemindMe Pro uses an indigo-based color palette with full light/dark mode support.

### Primary Colors
| Token | Light | Dark |
|-------|-------|------|
| `primary` | `#6366F1` | `#818CF8` |
| `primaryLight` | `#EEF2FF` | `#252145` |
| `primaryDark` | `#4F46E5` | `#6366F1` |

### Semantic Colors
| Token | Light | Dark |
|-------|-------|------|
| `success` | `#10B981` | `#34D399` |
| `error` | `#EF4444` | `#F87171` |
| `warning` | `#F59E0B` | `#FBBF24` |
| `accent` | `#F59E0B` | `#FBBF24` |

### Surface Colors
| Token | Light | Dark |
|-------|-------|------|
| `background` | `#FAFAFE` | `#0F0D1A` |
| `surface` | `#FFFFFF` | `#1C1932` |
| `border` | `#E5E7EB` | `#2D2B4A` |
| `text` | `#1E1B4B` | `#E0E7FF` |
| `textSecondary` | `#4B5563` | `#9CA3AF` |

### Usage in Code

```tsx
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const scheme = useColorScheme();
const primary = Colors[scheme ?? 'light'].primary;
```

Or use the hook:
```tsx
import { useThemeColor } from '@/hooks/use-theme-color';

const primary = useThemeColor({}, 'primary');
```

## Tailwind / NativeWind

Colors are also configured in `tailwind.config.js` for use with NativeWind className syntax:

```tsx
<View className="bg-primary-500" />
<Text className="text-error" />
```

## Fonts

System fonts are used across all platforms. The `Fonts` constant in `constants/theme.ts` provides platform-appropriate font families:

```tsx
import { Fonts } from '@/constants/theme';
// Fonts.sans, Fonts.serif, Fonts.rounded, Fonts.mono
```

## Navigation Theme

React Navigation is themed via `ThemeProvider` in `app/_layout.tsx` with custom light/dark themes that map to the app's color system.
