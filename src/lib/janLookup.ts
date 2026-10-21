/**
 * JAN コードから商品名・画像を探す。
 * Yahoo!ショッピング商品検索API v3 → Open Food Facts の順に試す。
 * どちらでも見つからなければ null（手入力してもらう）。
 */

export type JanLookupResult = {
  jan: string;
  name: string;
  maker: string | null;
  imageUrl: string | null;
  source: 'yahoo' | 'openfoodfacts';
};

/** JAN(EAN-13 / EAN-8) のチェックディジットを検証する */
export function isValidJan(code: string): boolean {
  if (!/^(\d{8}|\d{13})$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** ネットショップの商品名に付きがちな【送料無料】や ×24本 などを落とす */
export function cleanProductName(name: string): string {
  return name
    .replace(/【[^】]*】|\[[^\]]*\]|［[^］]*］/g, ' ')
    .replace(/(送料無料|まとめ買い|ケース販売|あす楽)/g, ' ')
    .replace(/[×xX]\s*\d+\s*(本|個|袋|缶|箱|パック|セット)(入り?)?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fromYahoo(jan: string, appId: string): Promise<JanLookupResult | null> {
  const url =
    'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch' +
    `?appid=${encodeURIComponent(appId)}&jan_code=${jan}&results=5&image_size=300`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as {
    hits?: { name?: string; brand?: { name?: string }; image?: { medium?: string }; exImage?: { url?: string } }[];
  };
  const hit = json.hits?.find((h) => h.name);
  if (!hit?.name) return null;
  return {
    jan,
    name: cleanProductName(hit.name),
    maker: hit.brand?.name || null,
    imageUrl: hit.exImage?.url ?? hit.image?.medium ?? null,
    source: 'yahoo',
  };
}

async function fromOpenFoodFacts(jan: string): Promise<JanLookupResult | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${jan}.json?fields=product_name,product_name_ja,brands,image_front_url`,
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    status?: number;
    product?: { product_name?: string; product_name_ja?: string; brands?: string; image_front_url?: string };
  };
  const p = json.product;
  const name = p?.product_name_ja || p?.product_name;
  if (json.status !== 1 || !name) return null;
  return { jan, name, maker: p?.brands || null, imageUrl: p?.image_front_url ?? null, source: 'openfoodfacts' };
}

export async function lookupJan(jan: string, yahooAppId: string): Promise<JanLookupResult | null> {
  if (!isValidJan(jan)) return null;
  try {
    if (yahooAppId) {
      const hit = await fromYahoo(jan, yahooAppId);
      if (hit) return hit;
    }
    return await fromOpenFoodFacts(jan);
  } catch {
    return null;
  }
}
