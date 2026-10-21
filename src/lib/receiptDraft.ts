import { useSyncExternalStore } from 'react';

import { today } from './format';
import type { ParsedReceipt } from './receiptParser';

/** 読み取り結果の確認画面とバーコード画面で共有する、保存前のレシート */
export type DraftItem = {
  receiptName: string;
  price: number;
  quantity: number;
  discount: number;
  productId: number | null;
  productName: string | null;
  imageUrl: string | null;
};

export type ReceiptDraft = {
  storeName: string;
  date: string;
  total: number | null;
  imageUri: string | null;
  rawText: string;
  items: DraftItem[];
};

let draft: ReceiptDraft | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const receiptDraft = {
  get: () => draft,
  start(parsed: ParsedReceipt, rawText: string, imageUri: string | null) {
    draft = {
      storeName: parsed.storeName ?? '',
      date: parsed.date ?? today(),
      total: parsed.total,
      imageUri,
      rawText,
      items: parsed.items.map((i) => ({
        receiptName: i.name,
        price: i.price,
        quantity: i.quantity,
        discount: i.discount,
        productId: null,
        productName: null,
        imageUrl: null,
      })),
    };
    emit();
  },
  update(fn: (d: ReceiptDraft) => ReceiptDraft) {
    if (!draft) return;
    draft = fn(draft);
    emit();
  },
  updateItem(index: number, patch: Partial<DraftItem>) {
    receiptDraft.update((d) => ({ ...d, items: d.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));
  },
  clear() {
    draft = null;
    emit();
  },
};

export function useReceiptDraft(): ReceiptDraft | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => draft,
  );
}
