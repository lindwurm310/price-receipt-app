import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { listProductSummaries } from '../../db/queries';
import type { ProductSummary } from '../../db/types';
import { Badge, Button, Card, Empty, Field, PriceTag, ProductImage } from '../../components/ui';
import { colors, font, spacing } from '../../theme/colors';

export default function ProductsScreen() {
  const db = useSQLiteContext();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ProductSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      listProductSummaries(db, search).then(setProducts);
    }, [db, search]),
  );

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={products}
      keyExtractor={(p) => String(p.id)}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
          <Field label="商品をさがす" value={search} onChangeText={setSearch} placeholder="例: 牛乳" />
          <Button title="バーコードで商品を追加" icon="barcode-outline" color={colors.sky} onPress={() => router.push('/barcode')} />
        </View>
      }
      ListEmptyComponent={<Empty icon="pricetags-outline">商品はまだありません。</Empty>}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/product/${item.id}`)}>
          <Card style={styles.row}>
            <ProductImage uri={item.image_url} size={64} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={font.body} numberOfLines={2}>{item.name}</Text>
              {item.min_store_name ? (
                <Badge color={colors.cheap} icon="storefront">{`最安 ${item.min_store_name}`}</Badge>
              ) : (
                <Text style={font.caption}>価格の記録なし</Text>
              )}
            </View>
            <PriceTag price={item.min_unit_price} size="md" />
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
