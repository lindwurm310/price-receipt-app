/**
 * OCR で読んだレシートの文字列から、店舗名・日付・品目・合計を取り出す。
 * 日本のスーパー/ドラッグストアのレシートを想定したルールベースの解析。
 * レシートには通常 JAN コードは印字されないため、品目は「略称 + 価格」で返す。
 */

export type ParsedItem = {
  /** レシートに印字された品名（略称のことが多い） */
  name: string;
  /** 値引き後の税込/税抜価格（円） */
  price: number;
  quantity: number;
  /** 値引き行が直後にあった場合の値引き額（円、正の数） */
  discount: number;
};

export type ParsedReceipt = {
  storeName: string | null;
  /** YYYY-MM-DD */
  date: string | null;
  items: ParsedItem[];
  total: number | null;
};

// 品目として扱わない行（合計・税・支払いなど）
const NON_ITEM_KEYWORDS = [
  '小計', '合計', '合 計', '総計', '税', '内税', '外税', '対象', 'お預', '預り', '預か', 'お釣', 'おつり', '釣銭',
  '現金', 'クレジット', 'カード', '電子マネー', 'ポイント', '点数', '買上', 'お買上', '担当', 'TEL', '電話',
  '領収', '登録番号', 'No.', '¥0',
];
const DISCOUNT_KEYWORDS = ['値引', '割引', '引き', 'クーポン', '%OFF', '％OFF'];
const TOTAL_KEYWORDS = ['合計', '合 計', 'お買上計', '総計'];
const STORE_HINTS = ['店', 'ストア', 'マート', 'スーパー', 'ドラッグ', '薬局', 'マーケット', 'MART', 'STORE'];

/** 全角英数記号を半角に寄せ、全角スペースを半角に */
export function normalize(text: string): string {
  return text
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ')
    .replace(/[￥]/g, '¥')
    .replace(/[―‐−–]/g, '-');
}

function toNumber(s: string): number {
  return Number(s.replace(/[,，.]/g, ''));
}

/** 西暦・和暦（令和）の日付を YYYY-MM-DD にする */
export function parseDate(line: string): string | null {
  const pad = (n: number) => String(n).padStart(2, '0');
  const western = line.match(/(20\d{2})\s*[年/.\-]\s*(\d{1,2})\s*[月/.\-]\s*(\d{1,2})/);
  if (western) {
    const [, y, m, d] = western;
    return valid(Number(y), Number(m), Number(d));
  }
  const reiwa = line.match(/(?:令和|R)\s*(\d{1,2}|元)\s*[年/.\-]\s*(\d{1,2})\s*[月/.\-]\s*(\d{1,2})/);
  if (reiwa) {
    const [, y, m, d] = reiwa;
    const year = 2018 + (y === '元' ? 1 : Number(y));
    return valid(year, Number(m), Number(d));
  }
  return null;

  function valid(y: number, m: number, d: number): string | null {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${y}-${pad(m)}-${pad(d)}`;
  }
}

// 行末の価格: 「¥198」「198円」「198※」「198 外」「-50」など
const PRICE_AT_END = /^(.*?)[\s.・]*(-)?\s*[¥]?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(?:円)?\s*[※*軽外内非A-Z]{0,2}$/;
// 数量行: 「2個 X 単98」「2コ×@98」「@98 x 2」など
const QUANTITY_LINE = /(\d+)\s*(?:個|コ|点|本)?\s*[x×X＊*]\s*(?:単|@)?\s*¥?(\d+)|@\s*¥?(\d+)\s*[x×X＊*]\s*(\d+)/;

function includesAny(line: string, words: readonly string[]): boolean {
  return words.some((w) => line.includes(w));
}

function isStoreLine(line: string): boolean {
  if (parseDate(line)) return false;
  if (/\d{2,4}-\d{2,4}-\d{3,4}/.test(line)) return false; // 電話番号
  if (/[都道府県市区町村]\S*\d/.test(line)) return false; // 住所
  if (/^[\d\s¥,.\-:]+$/.test(line)) return false;
  return line.length >= 2;
}

export function parseReceipt(rawText: string): ParsedReceipt {
  const lines = normalize(rawText)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let storeName: string | null = null;
  let date: string | null = null;
  let total: number | null = null;
  const items: ParsedItem[] = [];
  let pendingQuantity: number | null = null;

  // 店舗名: 上部 5 行のうち店舗らしい語を含む行、なければ最初の店名らしい行
  const head = lines.slice(0, 5).filter(isStoreLine);
  storeName = head.find((l) => includesAny(l, STORE_HINTS)) ?? head[0] ?? null;

  for (const line of lines) {
    if (!date) date = parseDate(line);

    if (includesAny(line, TOTAL_KEYWORDS) && !line.includes('小計')) {
      const m = line.match(PRICE_AT_END);
      if (m && total === null) total = toNumber(m[3]);
      continue;
    }

    // 数量行は品目の前に印字する店と後に印字する店がある。
    // 直前の品目の金額が「数量 × 単価」と一致すればその品目に、しなければ次の品目に付ける。
    const qty = line.match(QUANTITY_LINE);
    if (qty && !line.match(/[ぁ-んァ-ヶ一-龠]{2,}/)) {
      const count = Number(qty[1] ?? qty[4]);
      const unit = Number(qty[2] ?? qty[3]);
      const last = items[items.length - 1];
      if (last && last.price + last.discount === count * unit) last.quantity = count;
      else pendingQuantity = count;
      continue;
    }

    const m = line.match(PRICE_AT_END);
    if (!m) continue;
    const [, rawName, minus, amount] = m;
    const name = rawName.replace(/^[\s*※#]+/, '').trim();
    const value = toNumber(amount);

    if (minus || includesAny(line, DISCOUNT_KEYWORDS)) {
      const last = items[items.length - 1];
      if (last) {
        last.discount += value;
        last.price = Math.max(0, last.price - value);
      }
      continue;
    }
    if (name.length < 1 || includesAny(line, NON_ITEM_KEYWORDS)) continue;
    if (parseDate(line) || /\d{1,2}:\d{2}/.test(line)) continue;
    if (value <= 0 || value > 100000) continue;

    items.push({ name, price: value, quantity: pendingQuantity ?? 1, discount: 0 });
    pendingQuantity = null;
  }

  return { storeName, date, items, total };
}
