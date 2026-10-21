export type OcrLine = { text: string; left: number; top: number; height: number };

/**
 * OCR の行を縦位置でまとめ、同じ高さにあるもの（品名と価格など）を左から順に 1 行へ連結する。
 */
export function rowsToText(lines: OcrLine[]): string {
  const sorted = [...lines].sort((a, b) => a.top + a.height / 2 - (b.top + b.height / 2));
  const rows: OcrLine[][] = [];
  for (const line of sorted) {
    const center = line.top + line.height / 2;
    const row = rows[rows.length - 1];
    if (row) {
      const ref = row[0];
      const refCenter = ref.top + ref.height / 2;
      if (Math.abs(center - refCenter) < Math.min(ref.height, line.height) * 0.6) {
        row.push(line);
        continue;
      }
    }
    rows.push([line]);
  }
  return rows
    .map((row) =>
      row
        .sort((a, b) => a.left - b.left)
        .map((l) => l.text)
        .join(' '),
    )
    .join('\n');
}
