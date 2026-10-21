export const yen = (n: number | null | undefined) => (n == null ? '—' : `¥${n.toLocaleString('ja-JP')}`);

export const shortDate = (iso: string) => {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(m)}/${Number(d)}`;
};

export const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** 2 点間の距離（km） */
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
