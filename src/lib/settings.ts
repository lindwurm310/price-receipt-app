import { Storage } from 'expo-sqlite/kv-store';

/** 端末内に保存する設定値。個人利用の間は API キーもここに置く。 */
const KEYS = {
  yahooAppId: 'settings.yahooAppId',
  nearbyRadiusKm: 'settings.nearbyRadiusKm',
} as const;

export const settings = {
  getYahooAppId: () => Storage.getItemSync(KEYS.yahooAppId) ?? '',
  setYahooAppId: (v: string) => Storage.setItemSync(KEYS.yahooAppId, v.trim()),
  getNearbyRadiusKm: () => Number(Storage.getItemSync(KEYS.nearbyRadiusKm) ?? '3'),
  setNearbyRadiusKm: (v: number) => Storage.setItemSync(KEYS.nearbyRadiusKm, String(v)),
};
