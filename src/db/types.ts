export type Store = {
  id: number;
  name: string;
  branch: string | null;
  latitude: number | null;
  longitude: number | null;
  color: string;
};

export type Product = {
  id: number;
  jan: string | null;
  name: string;
  maker: string | null;
  image_url: string | null;
  category: string | null;
};

export type Purchase = {
  id: number;
  product_id: number;
  store_id: number;
  receipt_id: number | null;
  price: number;
  quantity: number;
  unit_price: number;
  is_discounted: number;
  recorded_at: string;
};

/** 商品一覧カード用: 商品ごとの最安値とその店 */
export type ProductSummary = Product & {
  min_unit_price: number | null;
  min_store_name: string | null;
  last_unit_price: number | null;
  record_count: number;
};

/** 商品詳細の店舗別比較用 */
export type StorePriceRow = {
  store_id: number;
  store_name: string;
  store_color: string;
  min_unit_price: number;
  last_unit_price: number;
  last_recorded_at: string;
};
