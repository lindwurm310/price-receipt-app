import { Tabs } from 'expo-router/js-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, type ColorValue } from 'react-native';

import { colors } from '../../theme/colors';

type IconName = keyof typeof Ionicons.glyphMap;

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={typeof color === 'string' ? color : undefined} />;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.ink, fontWeight: '700' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 88, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'ホーム', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="products" options={{ title: '商品', tabBarIcon: icon('pricetags') }} />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'レシート',
          tabBarIcon: () => (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                marginTop: -20,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 4,
                borderColor: colors.background,
              }}
            >
              <Ionicons name="receipt" size={26} color={colors.ink} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="stores" options={{ title: 'お店', tabBarIcon: icon('storefront') }} />
      <Tabs.Screen name="settings" options={{ title: '設定', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
