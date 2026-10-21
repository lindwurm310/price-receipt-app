/**
 * パステルカラーのテーマ。
 * 色には意味を持たせる: ミント = 安い/最安値、ピーチ = 高い/値上がり。
 * パステルの上の文字は必ず ink（ダークグレー）を使い、白文字は使わない。
 */
export const colors = {
  background: '#FFF8F1', // クリーム
  surface: '#FFFFFF',
  primary: '#F6B5C8', // サクラピンク
  primarySoft: '#FDE4EC',
  cheap: '#A8E2CB', // ミント
  cheapSoft: '#E3F6EE',
  expensive: '#FFC6A5', // ピーチ
  expensiveSoft: '#FFEBDF',
  lavender: '#CDBEF0',
  sky: '#B5D8F4',
  lemon: '#FBE5A0',
  ink: '#4A4458',
  inkSoft: '#8A8496',
  border: '#F0E6EA',
} as const;

/** 店舗の色分けに順番に割り当てるパレット */
export const storePalette = [
  colors.lavender,
  colors.sky,
  colors.lemon,
  colors.cheap,
  colors.primary,
  colors.expensive,
] as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const font = {
  price: { fontSize: 28, fontWeight: '800' as const, color: colors.ink },
  title: { fontSize: 22, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 15, color: colors.ink },
  caption: { fontSize: 12, color: colors.inkSoft },
};
