import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';

import { addPurchase, addReceipt, findOrCreateStore, findProductByName, productForAlias, rememberAlias, upsertProduct } from '../db/queries';
import type { Store } from '../db/types';
import { Badge, Button, Card, Empty, Field, ProductImage, SectionTitle } from '../components/ui';
import { receiptDraft, useReceiptDraft } from '../lib/receiptDraft';
import { yen } from '../lib/format';
import { colors, font, radius, spacing } from '../theme/colors';

export default function ReceiptReviewScreen() {
  const db = useSQLiteContext();
  const draft = useReceiptDraft();
  const [saving, setSaving] = useState(false);

  // 既に登録済みの店なら、略称辞書から商品を自動で紐づける
  const storeName = draft?.storeName ?? '';
  useEffect(() => {
    if (!storeName) return;
    let cancelled = false;
    (async () => {
      const store = await db.getFirstAsync<Store>('SELECT * FROM stores WHERE name = ?', storeName);
      const items = receiptDraft.get()?.items ?? [];
      if (!store) return;
      for (const [i, item] of items.entries()) {
        if (item.productId) continue;
        const product = await productForAlias(db, store.id, item.receiptName);
        if (product && !cancelled) {
          receiptDraft.updateItem(i, { productId: product.id, productName: product.name, imageUrl: product.image_url });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, storeName]);

  if (!draft) return <Empty icon="receipt-outline">読み取り中のレシートはありません。</Empty>;

  const sum = draft.items.reduce((acc, i) => acc + i.price, 0);

  async function save() {
    if (!draft) return;
    if (!draft.storeName.trim()) {
      Alert.alert('店舗名を入れてください');
      return;
    }
    setSaving(true);
    try {
      let location: { latitude: number; longitude: number } | undefined;
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.granted) {
        const pos = await Location.getLastKnownPositionAsync();
        if (pos) location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }
      await db.withTransactionAsync(async () => {
        const store = await findOrCreateStore(db, draft.storeName.trim(), location);
        const receiptId = await addReceipt(db, {
          storeId: store.id,
          purchasedAt: draft.date,
          total: draft.total,
          imageUri: draft.imageUri,
          rawText: draft.rawText,
        });
        for (const item of draft.items) {
          const productId =
            item.productId ??
            (await findProductByName(db, item.receiptName))?.id ??
            (await upsertProduct(db, { jan: null, name: item.receiptName, maker: null, image_url: null })).id;
          await rememberAlias(db, store.id, item.receiptName, productId);
          await addPurchase(db, {
            productId,
            storeId: store.id,
            receiptId,
            price: item.price,
            quantity: item.quantity,
            isDiscounted: item.discount > 0,
            recordedAt: draft.date,
          });
        }
      });
      receiptDraft.clear();
      router.dismissTo('/');
    } catch (e) {
      Alert.alert('保存できませんでした', String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={{ gap: spacing.md }}>
        <Field label="お店" value={draft.storeName} onChangeText={(v) => receiptDraft.update((d) => ({ ...d, storeName: v }))} />
        <Field label="日付（YYYY-MM-DD）" value={draft.date} onChangeText={(v) => receiptDraft.update((d) => ({ ...d, date: v }))} />
        <View style={styles.totalRow}>
          <Text style={font.caption}>{`品目の合計 ${yen(sum)}`}</Text>
          <Text style={font.caption}>{`レシートの合計 ${yen(draft.total)}`}</Text>
        </View>
      </Card>

      <SectionTitle>{`品目（${draft.items.length}）`}</SectionTitle>
      {draft.items.map((item, i) => (
        <Card key={i} style={styles.item} tint={item.productId ? colors.cheapSoft : undefined}>
          <ProductImage uri={item.imageUrl} size={48} />
          <View style={{ flex: 1, gap: 4 }}>
            <TextInput
              style={styles.nameInput}
              value={item.receiptName}
              onChangeText={(v) => receiptDraft.updateItem(i, { receiptName: v })}
            />
            {item.productName ? (
              <Badge color={colors.cheap} icon="link">{item.productName}</Badge>
            ) : (
              <Pressable onPress={() => router.push({ pathname: '/barcode', params: { index: String(i) } })}>
                <Badge color={colors.sky} icon="barcode-outline">バーコードで紐づけ</Badge>
              </Pressable>
            )}
            {item.discount > 0 ? <Text style={font.caption}>{`値引き ${yen(item.discount)}`}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <TextInput
              style={styles.priceInput}
              keyboardType="number-pad"
              value={String(item.price)}
              onChangeText={(v) => receiptDraft.updateItem(i, { price: Number(v.replace(/\D/g, '')) || 0 })}
            />
            {item.quantity > 1 ? <Text style={font.caption}>{`×${item.quantity}`}</Text> : null}
            <Pressable
              hitSlop={8}
              onPress={() => receiptDraft.update((d) => ({ ...d, items: d.items.filter((_, j) => j !== i) }))}
            >
              <Ionicons name="trash-outline" size={18} color={colors.inkSoft} />
            </Pressable>
          </View>
        </Card>
      ))}

      <Button
        title="品目を追加"
        icon="add"
        color={colors.lavender}
        onPress={() =>
          receiptDraft.update((d) => ({
            ...d,
            items: [...d.items, { receiptName: '', price: 0, quantity: 1, discount: 0, productId: null, productName: null, imageUrl: null }],
          }))
        }
      />
      <Button title={saving ? '保存中…' : 'この内容で保存'} icon="checkmark-circle" onPress={save} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameInput: { ...font.body, padding: 0, width: '100%' },
  priceInput: {
    ...font.price,
    fontSize: 20,
    width: 88,
    textAlign: 'right',
    padding: 0,
    borderBottomWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
});
