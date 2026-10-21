import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { migrate } from '../db/schema';
import { colors } from '../theme/colors';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="prices.db" onInit={migrate}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: '商品' }} />
        <Stack.Screen name="receipt-review" options={{ title: '読み取り結果の確認' }} />
        <Stack.Screen name="barcode" options={{ title: 'バーコードを読む', presentation: 'modal' }} />
      </Stack>
    </SQLiteProvider>
  );
}
