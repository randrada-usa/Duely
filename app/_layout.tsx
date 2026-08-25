import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { CompletionUndoProvider } from '../src/components/CompletionUndoProvider';
import { AuthStoreProvider } from '../src/store/AuthStore';
import { TaskStoreProvider } from '../src/store/TaskStore';
import { ReminderStoreProvider } from '../src/store/ReminderStore';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <AuthStoreProvider>
      <TaskStoreProvider>
        <CompletionUndoProvider>
          <ReminderStoreProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: colors.background },
                headerStyle: { backgroundColor: colors.background },
                headerShadowVisible: false,
                headerTintColor: colors.text,
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="task/new"
                options={{ title: 'Add task', presentation: 'modal' }}
              />
              <Stack.Screen name="task/[id]" options={{ title: 'Task details' }} />
              <Stack.Screen
                name="ocr-evaluation"
                options={{ title: 'OCR evaluation' }}
              />
            </Stack>
          </ReminderStoreProvider>
        </CompletionUndoProvider>
      </TaskStoreProvider>
    </AuthStoreProvider>
  );
}
