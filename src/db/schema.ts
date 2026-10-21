import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 1;

/** SQLiteProvider の onInit から呼ぶ。user_version でマイグレーションを管理する。 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        branch TEXT,
        latitude REAL,
        longitude REAL,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jan TEXT UNIQUE,
        name TEXT NOT NULL,
        maker TEXT,
        image_url TEXT,
        category TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id INTEGER NOT NULL REFERENCES stores(id),
        purchased_at TEXT NOT NULL,
        total INTEGER,
        image_uri TEXT,
        raw_text TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        store_id INTEGER NOT NULL REFERENCES stores(id),
        receipt_id INTEGER REFERENCES receipts(id) ON DELETE SET NULL,
        price INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price INTEGER NOT NULL,
        is_discounted INTEGER NOT NULL DEFAULT 0,
        recorded_at TEXT NOT NULL
      );
      CREATE INDEX purchases_product ON purchases(product_id, recorded_at);
      CREATE INDEX purchases_store ON purchases(store_id);

      -- 「この店のこの略称 = この商品」を覚えて次回から自動で紐づける
      CREATE TABLE receipt_aliases (
        store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        receipt_name TEXT NOT NULL,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        PRIMARY KEY (store_id, receipt_name)
      );
    `);
    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
