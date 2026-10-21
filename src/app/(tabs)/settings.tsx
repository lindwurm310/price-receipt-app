import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text } from 'react-native';

import { Button, Card, Field, SectionTitle } from '../../components/ui';
import { settings } from '../../lib/settings';
import { colors, font, spacing } from '../../theme/colors';

export default function SettingsScreen() {
  const [appId, setAppId] = useState(settings.getYahooAppId());
  const [radiusKm, setRadiusKm] = useState(String(settings.getNearbyRadiusKm()));
  const [saved, setSaved] = useState(false);

  function save() {
    settings.setYahooAppId(appId);
    settings.setNearbyRadiusKm(Number(radiusKm) || 3);
    setSaved(true);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SectionTitle>商品検索（JANコード）</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <Text style={font.body}>
          Yahoo!ショッピングのアプリケーションIDを入れると、バーコードから商品名と画像を取得できます。未設定の場合は Open Food Facts で探します。
        </Text>
        <Field label="Yahoo! アプリケーションID" value={appId} onChangeText={(v) => { setAppId(v); setSaved(false); }} autoCapitalize="none" />
        <Text
          style={[font.caption, { textDecorationLine: 'underline' }]}
          onPress={() => Linking.openURL('https://e.developer.yahoo.co.jp/register')}
        >
          アプリケーションIDを取得する
        </Text>
      </Card>

      <SectionTitle>近所の範囲</SectionTitle>
      <Card>
        <Field label="半径（km）" value={radiusKm} onChangeText={(v) => { setRadiusKm(v); setSaved(false); }} keyboardType="decimal-pad" />
      </Card>

      <Button title={saved ? '保存しました' : '保存'} icon="save" color={saved ? colors.cheap : colors.primary} onPress={save} />
      <Text style={[font.caption, { textAlign: 'center', marginTop: spacing.md }]}>
        Web Services by Yahoo! JAPAN
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
});
