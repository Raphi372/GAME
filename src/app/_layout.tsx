import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { Unbounded_600SemiBold } from '@expo-google-fonts/unbounded/600SemiBold';
import { Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded/800ExtraBold';
import { Unbounded_900Black } from '@expo-google-fonts/unbounded/900Black';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { useMotion } from '@/hooks/useMotion';
import { translate } from '@/i18n';
import { useSettingsStore, useStoresHydrated } from '@/store';
import { colors, spacing } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Unbounded_600SemiBold,
    Unbounded_800ExtraBold,
    Unbounded_900Black,
  });
  const hydrated = useStoresHydrated();
  const ageConfirmed = useSettingsStore((state) => state.ageConfirmedAt !== null);
  const { enabled: motion } = useMotion();
  // Fall back to system fonts instead of blocking the app if fonts fail to load.
  const ready = (fontsLoaded || fontError !== null) && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return <View style={styles.placeholder} />;

  const slide = motion ? 'slide_from_right' : 'none';
  const fade = motion ? 'fade' : 'none';

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: slide,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={ageConfirmed}>
          <Stack.Screen name="index" options={{ animation: fade }} />
          <Stack.Screen name="players" />
          <Stack.Screen name="level" />
          <Stack.Screen name="game" options={{ animation: fade, gestureEnabled: false }} />
          <Stack.Screen name="summary" options={{ animation: fade, gestureEnabled: false }} />
          <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings/index" />
        </Stack.Protected>
        <Stack.Protected guard={!ageConfirmed}>
          <Stack.Screen name="age-gate" options={{ animation: fade }} />
        </Stack.Protected>
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/fair-play" />
        <Stack.Screen name="settings/about" />
      </Stack>
    </>
  );
}

/** Last-resort error screen – keeps the app usable instead of crashing. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const locale = useSettingsStore.getState().locale;
  if (__DEV__) console.error(error);
  return (
    <Screen scroll={false} contentStyle={styles.error}>
      <AppText variant="hero" align="center" aria-hidden>
        🥵
      </AppText>
      <AppText variant="h2" align="center" role="heading">
        {translate(locale, 'error.title')}
      </AppText>
      <AppText variant="body" align="center" color={colors.textSecondary}>
        {translate(locale, 'error.body')}
      </AppText>
      <Button label={translate(locale, 'error.retry')} onPress={() => void retry()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1, backgroundColor: colors.background },
  error: { justifyContent: 'center', gap: spacing.lg },
});
