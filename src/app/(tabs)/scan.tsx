import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { Button, Card, Field } from '../../components/ui';
import { isOcrAvailable, recognizeReceipt } from '../../lib/ocr';
import { parseReceipt } from '../../lib/receiptParser';
import { receiptDraft } from '../../lib/receiptDraft';
import { colors, font, radius, spacing } from '../../theme/colors';

export default function ScanScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualText, setManualText] = useState('');
  const ocrReady = isOcrAvailable();

  async function pick(source: 'camera' | 'library') {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1 };
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('カメラを使えません', '設定アプリでカメラへのアクセスを許可してください。');
        return;
      }
    }
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setImageUri(uri);
    if (!ocrReady) return;

    setBusy(true);
    try {
      const text = await recognizeReceipt(uri);
      openReview(text, uri);
    } catch (e) {
      Alert.alert('読み取りに失敗しました', String(e));
    } finally {
      setBusy(false);
    }
  }

  function openReview(text: string, uri: string | null) {
    receiptDraft.start(parseReceipt(text), text, uri);
    router.push('/receipt-review');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card tint={colors.primarySoft}>
        <Text style={font.title}>レシートを読み取る</Text>
        <Text style={[font.body, { marginTop: spacing.xs }]}>
          まっすぐ・明るい場所で、レシート全体が写るように撮影してください。
        </Text>
      </Card>

      <Button title="カメラで撮る" icon="camera" onPress={() => pick('camera')} disabled={busy} />
      <Button title="写真から選ぶ" icon="images" color={colors.lavender} onPress={() => pick('library')} disabled={busy} />

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={colors.ink} />
          <Text style={font.body}>読み取り中…</Text>
        </View>
      ) : null}

      {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} contentFit="contain" /> : null}

      {!ocrReady ? (
        <Card tint={colors.lemon}>
          <Text style={[font.body, { fontWeight: '700' }]}>文字の自動読み取りは開発用ビルドで使えます</Text>
          <Text style={[font.caption, { color: colors.ink, marginTop: spacing.xs }]}>
            Expo Go では OCR が動かないため、レシートの文字を下に貼り付けて試せます。
          </Text>
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <Field
              label="レシートの文字"
              value={manualText}
              onChangeText={setManualText}
              multiline
              style={{ minHeight: 140, textAlignVertical: 'top' }}
              placeholder={'スーパーさくら\n2026年10月20日\n牛乳 258\n合計 ¥258'}
            />
            <Button title="この内容で読み取る" icon="sparkles" onPress={() => openReview(manualText, imageUri)} disabled={!manualText.trim()} />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  busy: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', height: 320, borderRadius: radius.md, backgroundColor: colors.surface },
});
