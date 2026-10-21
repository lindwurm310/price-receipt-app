import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import {
  addPurchase,
  findOrCreateStore,
  getProduct,
  listStores,
  priceHistory,
  storePricesForProduct,
  type HistoryRow,
} from '../../db/queries';
import type { Product, Store, StorePriceRow } from '../../db/types';
import { Badge, Button, Card, Field, ProductImage, SectionTitle, StoreDot } from '../../components/ui';
import { shortDate, today, yen } from '../../lib/format';
import { colors, font, radius, spacing } from '../../theme/colors';

export default function ProductDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const [product, setProduct] = useState<Product | null>(null);
  const [byStore, setByStore] = useState<StorePriceRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeName, setStoreName] = useState('');
  const [price, setPrice] = useState('');

  const load = useCallback(() => {
    getProduct(db, productId).then(setProduct);
    storePricesForProduct(db, productId).then(setByStore);
    priceHistory(db, productId).then(setHistory);
    listStores(db).then(setStores);
  }, [db, productId]);
  useFocusEffect(load);

  // 店頭調査: 値札を見て価格だけ記録する
  async function addPrice() {
    const value = Number(price.replace(/\D/g, ''));
    if (!storeName.trim() || !value) return;
    const store = await findOrCreateStore(db, storeName.trim());
    await addPurchase(db, { productId, storeId: store.id, price: value, recordedAt: today() });
    setPrice('');
    load();
  }

  if (!product) return null;
  const max = Math.max(...byStore.map((s) => s.min_unit_price), 1);
  const cheapest = byStore[0]?.min_unit_price;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: product.name }} />
      <Card style={styles.header}>
        <ProductImage uri={product.image_url} size={96} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={font.title} numberOfLines={3}>{product.name}</Text>
          {product.maker ? <Text style={font.caption}>{product.maker}</Text> : null}
          {product.jan ? <Text style={font.caption}>{`JAN ${product.jan}`}</Text> : null}
        </View>
      </Card>

      <SectionTitle>お店ごとの価格</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        {byStore.length === 0 ? <Text style={font.caption}>まだ記録がありません</Text> : null}
        {byStore.map((s) => {
          const isCheapest = s.min_unit_price === cheapest;
          return (
            <View key={s.store_id} style={{ gap: 4 }}>
              <View style={styles.storeHead}>
                <StoreDot color={s.store_color} />
                <Text style={[font.body, { flex: 1 }]} numberOfLines={1}>{s.store_name}</Text>
                {isCheapest ? <Badge color={colors.cheap} icon="trophy">最安</Badge> : null}
                <Text style={[font.body, { fontWeight: '800' }]}>{yen(s.min_unit_price)}</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    { width: `${(s.min_unit_price / max) * 100}%`, backgroundColor: isCheapest ? colors.cheap : colors.expensive },
                  ]}
                />
              </View>
              <Text style={font.caption}>{`最新 ${yen(s.last_unit_price)}（${shortDate(s.last_recorded_at)}）`}</Text>
            </View>
          );
        })}
      </Card>

      <SectionTitle>価格を記録（店頭調査）</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <Field label="お店" value={storeName} onChangeText={setStoreName} placeholder="お店の名前" />
        {stores.length > 0 ? (
          <View style={styles.chips}>
            {stores.map((s) => (
              <Pressable key={s.id} onPress={() => setStoreName(s.name)} style={[styles.chip, { backgroundColor: s.color }]}>
                <Text style={styles.chipText}>{s.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Field label="価格（税込・円）" value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="198" />
        <Button title="記録する" icon="add-circle" onPress={addPrice} disabled={!storeName.trim() || !price} />
      </Card>

      <SectionTitle>履歴</SectionTitle>
      {history.map((h) => (
        <Card key={h.id} style={styles.historyRow}>
          <StoreDot color={h.store_color} />
          <Text style={[font.body, { flex: 1 }]} numberOfLines={1}>{h.store_name}</Text>
          {h.is_discounted ? <Badge color={colors.lemon}>値引</Badge> : null}
          <Text style={font.caption}>{shortDate(h.recorded_at)}</Text>
          <Text style={[font.body, { fontWeight: '700', minWidth: 64, textAlign: 'right' }]}>{yen(h.unit_price)}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  storeHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { height: 12, backgroundColor: colors.background, borderRadius: radius.pill, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: radius.pill },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12 },
});
