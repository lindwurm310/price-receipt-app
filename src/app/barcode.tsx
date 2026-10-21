import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { findProductByJan, upsertProduct } from '../db/queries';
import { Button, Card, Field, ProductImage } from '../components/ui';
import { isValidJan, lookupJan } from '../lib/janLookup';
import { receiptDraft } from '../lib/receiptDraft';
import { settings } from '../lib/settings';
import { colors, font, radius, spacing } from '../theme/colors';

/**
 * バーコードを読んで商品を特定する。
 * index パラメータ付きで開かれたら、レシート確認中の品目にその商品を紐づけて戻る。
 * なしなら商品を登録して商品詳細へ進む。
 */
export default function BarcodeScreen() {
  const db = useSQLiteContext();
  const { index } = useLocalSearchParams<{ index?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [jan, setJan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [maker, setMaker] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const handled = useRef(false);

  async function onScanned(result: BarcodeScanningResult) {
    if (handled.current || !isValidJan(result.data)) return;
    handled.current = true;
    setJan(result.data);
    setBusy(true);
    const known = await findProductByJan(db, result.data);
    if (known) {
      setName(known.name);
      setMaker(known.maker);
      setImageUrl(known.image_url);
    } else {
      const hit = await lookupJan(result.data, settings.getYahooAppId());
      if (hit) {
        setName(hit.name);
        setMaker(hit.maker);
        setImageUrl(hit.imageUrl);
      }
    }
    setBusy(false);
  }

  async function confirm() {
    if (!jan || !name.trim()) return;
    const product = await upsertProduct(db, { jan, name: name.trim(), maker, image_url: imageUrl });
    if (index !== undefined) {
      receiptDraft.updateItem(Number(index), { productId: product.id, productName: product.name, imageUrl: product.image_url });
      router.back();
    } else {
      router.replace(`/product/${product.id}`);
    }
  }

  function rescan() {
    handled.current = false;
    setJan(null);
    setName('');
    setMaker(null);
    setImageUrl(null);
  }

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={[font.body, { textAlign: 'center' }]}>バーコードを読むにはカメラの許可が必要です。</Text>
        <Button title="カメラを許可する" icon="camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!jan ? (
        <>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
            onBarcodeScanned={onScanned}
          />
          <Text style={[font.body, { textAlign: 'center' }]}>商品のバーコードを枠に合わせてください</Text>
        </>
      ) : (
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <ProductImage uri={imageUrl} size={96} />
            <View style={{ flex: 1 }}>
              <Text style={font.caption}>{`JAN ${jan}`}</Text>
              {busy ? <ActivityIndicator color={colors.ink} /> : null}
              {!busy && !name ? <Text style={font.body}>商品が見つかりませんでした。名前を入れてください。</Text> : null}
              {maker ? <Text style={font.caption}>{maker}</Text> : null}
            </View>
          </View>
          <Field label="商品名" value={name} onChangeText={setName} />
          <Button title="この商品で決定" icon="checkmark-circle" onPress={confirm} disabled={busy || !name.trim()} />
          <Button title="読み直す" icon="refresh" color={colors.lavender} onPress={rescan} />
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.md, backgroundColor: colors.background },
  camera: { width: '100%', aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden' },
});
