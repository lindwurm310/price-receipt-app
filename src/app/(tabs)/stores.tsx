import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Location from 'expo-location';

import { listStoreSummaries, setStoreLocation, type StoreSummary } from '../../db/queries';
import { Badge, Button, Card, Empty } from '../../components/ui';
import { distanceKm } from '../../lib/format';
import { settings } from '../../lib/settings';
import { colors, font, radius, spacing } from '../../theme/colors';

type Here = { latitude: number; longitude: number };

export default function StoresScreen() {
  const db = useSQLiteContext();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [here, setHere] = useState<Here | null>(null);
  const radiusKm = settings.getNearbyRadiusKm();

  const load = useCallback(() => {
    listStoreSummaries(db).then(setStores);
  }, [db]);
  useFocusEffect(load);

  async function locate(): Promise<Here | null> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({});
    const point = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    setHere(point);
    return point;
  }

  async function pinHere(store: StoreSummary) {
    const point = here ?? (await locate());
    if (!point) return;
    await setStoreLocation(db, store.id, point.latitude, point.longitude);
    load();
  }

  const withDistance = stores
    .map((s) => ({
      ...s,
      km: here && s.latitude != null && s.longitude != null ? distanceKm(here, { latitude: s.latitude, longitude: s.longitude }) : null,
    }))
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={withDistance}
      keyExtractor={(s) => String(s.id)}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <Button title={here ? '現在地を更新' : '近い順に並べる'} icon="navigate" color={colors.sky} onPress={locate} />
        </View>
      }
      ListEmptyComponent={<Empty icon="storefront-outline">レシートを保存するとお店が追加されます。</Empty>}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      renderItem={({ item }) => {
        const nearby = item.km != null && item.km <= radiusKm;
        return (
          <Card style={styles.row}>
            <View style={[styles.swatch, { backgroundColor: item.color }]} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[font.body, { fontWeight: '700' }]}>{item.name}</Text>
              <View style={styles.badges}>
                {nearby ? <Badge color={colors.primary} icon="location">近所</Badge> : null}
                {item.km != null ? <Text style={font.caption}>{`${item.km.toFixed(1)} km`}</Text> : null}
                <Text style={font.caption}>{`記録 ${item.record_count} 件`}</Text>
              </View>
              {item.latitude == null ? (
                <Pressable onPress={() => pinHere(item)}>
                  <Text style={[font.caption, { textDecorationLine: 'underline' }]}>今いる場所をこのお店の位置にする</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.cheapest}>
              <Text style={[font.price, { fontSize: 22 }]}>{item.cheapest_count}</Text>
              <Text style={font.caption}>品が最安</Text>
            </View>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  swatch: { width: 12, alignSelf: 'stretch', borderRadius: radius.pill },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  cheapest: { alignItems: 'center', backgroundColor: colors.cheapSoft, borderRadius: radius.md, padding: spacing.sm, minWidth: 72 },
});
