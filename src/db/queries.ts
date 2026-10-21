import type { SQLiteDatabase } from 'expo-sqlite';

import { storePalette } from '../theme/colors';
import type { Product, ProductSummary, Store, StorePriceRow } from './types';

// ---- 店舗 ----

export async function listStores(db: SQLiteDatabase): Promise<Store[]> {
  return db.getAllAsync<Store>('SELECT * FROM stores ORDER BY name');
}

/** 同じ名前の店があればそれを返し、なければ作る */
export async function findOrCreateStore(
  db: SQLiteDatabase,
  name: string,
  location?: { latitude: number; longitude: number },
): Promise<Store> {
  const existing = await db.getFirstAsync<Store>('SELECT * FROM stores WHERE name = ?', name);
  if (existing) return existing;
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM stores');
  const color = storePalette[(count?.n ?? 0) % storePalette.length];
  const result = await db.runAsync(
    'INSERT INTO stores (name, latitude, longitude, color) VALUES (?, ?, ?, ?)',
    name,
    location?.latitude ?? null,
    location?.longitude ?? null,
    color,
  );
  return {
    id: result.lastInsertRowId,
    name,
    branch: null,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    color,
  };
}

// ---- 商品 ----

export async function findProductByJan(db: SQLiteDatabase, jan: string): Promise<Product | null> {
  return db.getFirstAsync<Product>('SELECT * FROM products WHERE jan = ?', jan);
}

/** バーコードなしで記録した商品を、他の店の同じ品名と同じ商品として扱うために使う */
export async function findProductByName(db: SQLiteDatabase, name: string): Promise<Product | null> {
  return db.getFirstAsync<Product>('SELECT * FROM products WHERE name = ? ORDER BY jan IS NULL, id LIMIT 1', name);
}

export async function upsertProduct(
  db: SQLiteDatabase,
  product: Omit<Product, 'id' | 'category'> & { category?: string | null },
): Promise<Product> {
  if (product.jan) {
    const existing = await findProductByJan(db, product.jan);
    if (existing) return existing;
  }
  const result = await db.runAsync(
    'INSERT INTO products (jan, name, maker, image_url, category) VALUES (?, ?, ?, ?, ?)',
    product.jan,
    product.name,
    product.maker,
    product.image_url,
    product.category ?? null,
  );
  return { ...product, category: product.category ?? null, id: result.lastInsertRowId };
}

export async function listProductSummaries(db: SQLiteDatabase, search = ''): Promise<ProductSummary[]> {
  return db.getAllAsync<ProductSummary>(
    `SELECT p.*,
            MIN(pu.unit_price) AS min_unit_price,
            (SELECT s.name FROM purchases x JOIN stores s ON s.id = x.store_id
              WHERE x.product_id = p.id ORDER BY x.unit_price, x.recorded_at DESC LIMIT 1) AS min_store_name,
            (SELECT x.unit_price FROM purchases x
              WHERE x.product_id = p.id ORDER BY x.recorded_at DESC, x.id DESC LIMIT 1) AS last_unit_price,
            COUNT(pu.id) AS record_count
       FROM products p
       LEFT JOIN purchases pu ON pu.product_id = p.id
      WHERE p.name LIKE ?
      GROUP BY p.id
      ORDER BY MAX(pu.recorded_at) DESC, p.name`,
    `%${search}%`,
  );
}

export async function getProduct(db: SQLiteDatabase, id: number): Promise<Product | null> {
  return db.getFirstAsync<Product>('SELECT * FROM products WHERE id = ?', id);
}

/** 商品詳細: 店舗ごとの最安値・最新価格（最安の店が先頭） */
export async function storePricesForProduct(db: SQLiteDatabase, productId: number): Promise<StorePriceRow[]> {
  return db.getAllAsync<StorePriceRow>(
    `SELECT s.id AS store_id, s.name AS store_name, s.color AS store_color,
            MIN(pu.unit_price) AS min_unit_price,
            (SELECT x.unit_price FROM purchases x WHERE x.product_id = pu.product_id AND x.store_id = s.id
              ORDER BY x.recorded_at DESC, x.id DESC LIMIT 1) AS last_unit_price,
            MAX(pu.recorded_at) AS last_recorded_at
       FROM purchases pu JOIN stores s ON s.id = pu.store_id
      WHERE pu.product_id = ?
      GROUP BY s.id
      ORDER BY min_unit_price`,
    productId,
  );
}

export type HistoryRow = { id: number; unit_price: number; recorded_at: string; store_name: string; store_color: string; is_discounted: number };

export async function priceHistory(db: SQLiteDatabase, productId: number): Promise<HistoryRow[]> {
  return db.getAllAsync<HistoryRow>(
    `SELECT pu.id, pu.unit_price, pu.recorded_at, pu.is_discounted, s.name AS store_name, s.color AS store_color
       FROM purchases pu JOIN stores s ON s.id = pu.store_id
      WHERE pu.product_id = ?
      ORDER BY pu.recorded_at DESC, pu.id DESC`,
    productId,
  );
}

// ---- 価格記録 ----

export async function addPurchase(
  db: SQLiteDatabase,
  p: {
    productId: number;
    storeId: number;
    receiptId?: number | null;
    price: number;
    quantity?: number;
    isDiscounted?: boolean;
    recordedAt: string;
  },
): Promise<void> {
  const quantity = Math.max(1, p.quantity ?? 1);
  await db.runAsync(
    `INSERT INTO purchases (product_id, store_id, receipt_id, price, quantity, unit_price, is_discounted, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    p.productId,
    p.storeId,
    p.receiptId ?? null,
    p.price,
    quantity,
    Math.round(p.price / quantity),
    p.isDiscounted ? 1 : 0,
    p.recordedAt,
  );
}

export async function addReceipt(
  db: SQLiteDatabase,
  r: { storeId: number; purchasedAt: string; total: number | null; imageUri: string | null; rawText: string },
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO receipts (store_id, purchased_at, total, image_uri, raw_text) VALUES (?, ?, ?, ?, ?)',
    r.storeId,
    r.purchasedAt,
    r.total,
    r.imageUri,
    r.rawText,
  );
  return result.lastInsertRowId;
}

// ---- 略称辞書 ----

export async function productForAlias(db: SQLiteDatabase, storeId: number, receiptName: string): Promise<Product | null> {
  return db.getFirstAsync<Product>(
    `SELECT p.* FROM receipt_aliases a JOIN products p ON p.id = a.product_id
      WHERE a.store_id = ? AND a.receipt_name = ?`,
    storeId,
    receiptName,
  );
}

export async function rememberAlias(db: SQLiteDatabase, storeId: number, receiptName: string, productId: number) {
  await db.runAsync(
    'INSERT OR REPLACE INTO receipt_aliases (store_id, receipt_name, product_id) VALUES (?, ?, ?)',
    storeId,
    receiptName,
    productId,
  );
}

// ---- ホーム ----

export type RecentRow = { id: number; product_id: number; product_name: string; image_url: string | null; unit_price: number; store_name: string; store_color: string; recorded_at: string; min_unit_price: number };

export async function recentPurchases(db: SQLiteDatabase, limit = 10): Promise<RecentRow[]> {
  return db.getAllAsync<RecentRow>(
    `SELECT pu.id, pu.product_id, p.name AS product_name, p.image_url, pu.unit_price, pu.recorded_at,
            s.name AS store_name, s.color AS store_color,
            (SELECT MIN(x.unit_price) FROM purchases x WHERE x.product_id = pu.product_id) AS min_unit_price
       FROM purchases pu
       JOIN products p ON p.id = pu.product_id
       JOIN stores s ON s.id = pu.store_id
      ORDER BY pu.recorded_at DESC, pu.id DESC
      LIMIT ?`,
    limit,
  );
}

export async function monthTotal(db: SQLiteDatabase, yearMonth: string): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(price) AS total FROM purchases WHERE substr(recorded_at, 1, 7) = ?",
    yearMonth,
  );
  return row?.total ?? 0;
}

// ---- お店 ----

export type StoreSummary = Store & { record_count: number; cheapest_count: number };

/** 店ごとの記録数と「この店が最安の商品数」 */
export async function listStoreSummaries(db: SQLiteDatabase): Promise<StoreSummary[]> {
  return db.getAllAsync<StoreSummary>(
    `WITH best AS (SELECT product_id, MIN(unit_price) AS p FROM purchases GROUP BY product_id)
     SELECT s.*,
            (SELECT COUNT(*) FROM purchases x WHERE x.store_id = s.id) AS record_count,
            (SELECT COUNT(DISTINCT x.product_id) FROM purchases x JOIN best b
               ON b.product_id = x.product_id AND b.p = x.unit_price WHERE x.store_id = s.id) AS cheapest_count
       FROM stores s
      ORDER BY s.name`,
  );
}

export async function setStoreLocation(db: SQLiteDatabase, storeId: number, latitude: number, longitude: number) {
  await db.runAsync('UPDATE stores SET latitude = ?, longitude = ? WHERE id = ?', latitude, longitude, storeId);
}
