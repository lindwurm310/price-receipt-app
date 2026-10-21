import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { monthTotal, recentPurchases, type RecentRow } from '../../db/queries';
import { Badge, Button, Card, Empty, PriceTag, ProductImage, SectionTitle, StoreDot } from '../../components/ui';
import { shortDate, today, yen } from '../../lib/format';
import { colors, font, spacing } from '../../theme/colors';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [total, setTotal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      recentPurchases(db, 20).then(setRecent);
      monthTotal(db, today().slice(0, 7)).then(setTotal);
    }, [db]),
  );

  const bargains = recent.filter((r) => r.unit_price <= r.min_unit_price).slice(0, 3);

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={recent}
      keyExtractor={(r) => String(r.id)}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <Card tint={colors.primarySoft}>
            <Text style={font.caption}>今月の記録</Text>
            <Text style={[font.price, { fontSize: 34 }]}>{yen(total)}</Text>
          </Card>
          <Button title="レシートを読み取る" icon="camera" onPress={() => router.navigate('/scan')} />
          {bargains.length > 0 ? (
            <>
              <SectionTitle>お得に買えた商品</SectionTitle>
              {bargains.map((r) => (
                <Card key={r.id} tint={colors.cheapSoft} style={styles.row}>
                  <ProductImage uri={r.image_url} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={font.body} numberOfLines={1}>{r.product_name}</Text>
                    <Text style={font.caption}>{r.store_name}</Text>
                  </View>
                  <Badge color={colors.cheap} icon="trophy">{yen(r.unit_price)}</Badge>
                </Card>
              ))}
            </>
          ) : null}
          <SectionTitle>最近の記録</SectionTitle>
        </View>
      }
      ListEmptyComponent={<Empty icon="receipt-outline">{'まだ記録がありません。\nレシートを読み取ってみましょう。'}</Empty>}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/product/${item.product_id}`)}>
          <Card style={styles.row}>
            <ProductImage uri={item.image_url} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={font.body} numberOfLines={1}>{item.product_name}</Text>
              <View style={styles.storeLine}>
                <StoreDot color={item.store_color} />
                <Text style={font.caption}>{`${item.store_name}・${shortDate(item.recorded_at)}`}</Text>
              </View>
            </View>
            <PriceTag price={item.unit_price} min={item.min_unit_price} size="md" />
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  storeLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
