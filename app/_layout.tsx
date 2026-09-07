import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { CompletionUndoProvider } from '../src/components/CompletionUndoProvider';
import { AiPrivacyStoreProvider } from '../src/store/AiPrivacyStore';
import { AuthStoreProvider } from '../src/store/AuthStore';
import { CloudBackupStoreProvider } from '../src/store/CloudBackupStore';
import { ReminderStoreProvider } from '../src/store/ReminderStore';
import { TaskStoreProvider } from '../src/store/TaskStore';
import { colors, typography } from '../src/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthStoreProvider>
      <AiPrivacyStoreProvider>
        <TaskStoreProvider>
          <CloudBackupStoreProvider>
            <CompletionUndoProvider>
              <ReminderStoreProvider>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    contentStyle: { backgroundColor: colors.background },
                    headerStyle: { backgroundColor: colors.background },
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                    headerTitleStyle: { fontFamily: typography.heading },
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="auth/callback"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="task/new"
                    options={{ title: 'Add task', presentation: 'modal' }}
                  />
                  <Stack.Screen
                    name="task/[id]"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="ocr-evaluation"
                    options={{ title: 'OCR evaluation' }}
                  />
                </Stack>
              </ReminderStoreProvider>
            </CompletionUndoProvider>
          </CloudBackupStoreProvider>
        </TaskStoreProvider>
      </AiPrivacyStoreProvider>
    </AuthStoreProvider>
  );
}
