import {
  getResizedBase64,
  convertToBase64,
} from "@/utils/imageHelper";
import { sanitizeDate } from "@/utils/dateHelper";
import { db, type Product } from "@/db";
import { TAXONOMY_NAMES } from "@/const/taxonomy";

/**
 * UI用のオブジェクトをDB保存用の純粋なデータ構造に変換する
 * Base64への変換もここで行う
 */
export async function formatProductForSave(item, index = 0) {
  // 画像がBlobならBase64に変換、そうでなければ保持
  const image =
    item.image instanceof Blob ? await convertToBase64(item.image) : item.image;

  const forSave = {
    title: item.title || "",
    price: Number(item.price) || 0,
    stock: Number(item.stock) || 0,
    infiniteStock: item.infiniteStock ? 1 : 0,
    pubdate: item.pubdate || "",
    cost: item.cost ?? null,
    r18: item.r18 ? 1 : 0,
    terms: item.terms ? JSON.parse(JSON.stringify(item.terms)) : null,
    totalSalesAmount: item.totalSalesAmount || 0,
    sortOrder: index,
    hidden: item.hidden ? 1 : 0,
    image: image,
  };

  if (item.id !== undefined) {
    forSave.id = item.id;
  }

  return forSave;
}

/**
 * インポートされた生データを、アプリ内で使える形式にクリーニングする
 */
export async function sanitizeImportedProduct(data: Product) {
  const imageContent = String(data.image || "");

  if (imageContent.startsWith("data:")) {
    // 自前データ（Base64）の場合
    data.image = await getResizedBase64(imageContent);
  } else if (imageContent.startsWith("http")) {
    // 外部URLの場合はそのまま保存
    data.image = imageContent;
  } else {
    data.image = "";
  }

  data.pubdate = sanitizeDate(data.pubdate);

  return formatProductForSave(data, data.sortOrder);
}

/**
 * インポート用：名前の配列をIDの配列に変換する
 */
export async function resolveTermsByName(terms: object | undefined) {
  if (!terms) return null;
  const resolvedTerms = {};

  for (const [taxonomy, names] of Object.entries(terms)) {
    if (!TAXONOMY_NAMES.includes(taxonomy)) continue;
    if (!Array.isArray(names) || !names.length) continue;

    const resolvedIds: number[] = [];
    let order = await db.terms.where({ taxonomy }).count()

    for (const name of names) {
      let termId: number | undefined;
      
      if (typeof name === "string") {
        const trimmedName = name.trim();
        if (!trimmedName) continue;

        // DBに既存のタームがあるかチェック
        const existingTerm = await db.terms
          .where({ taxonomy, name: trimmedName })
          .first();

        if (existingTerm) {
          termId = existingTerm.id;
        } else {
          // なければ新規作成
          termId = await db.terms.add({
            taxonomy,
            name: trimmedName,
            sortOrder: ++order
          });
        }
      } else if (typeof name === "number") {
        // ID指定の場合はそのまま存在確認
        const existingTerm = await db.terms.get(name);
        if (existingTerm) termId = existingTerm.id;
      }

      if (termId !== undefined) {
        resolvedIds.push(termId);
      }
    }
    resolvedTerms[taxonomy] = [...new Set(resolvedIds)];
  }
  return resolvedTerms;
}

/**
 * エクスポート用：IDの配列を名前の配列に変換する
 */
export async function formatProductsForExport(products: []) {
  const allTerms = await db.terms.toArray();
  const termMap = new Map(allTerms.map((t) => [t.id, t.name]));

  return products.map((product) => {
    if (!product.terms) return product

    const exportedTerms = {};
    for (const [taxonomy, ids] of Object.entries(product.terms)) {
      if (Array.isArray(ids)) {
        exportedTerms[taxonomy] = ids
          .map((id) => termMap.get(id))
          .filter(Boolean); // 存在するターム名だけを抽出
      }
    }

    return {
      ...product,
      terms: exportedTerms,
    };
  });
}

/**
 * 内容が等しいproductかどうか判定
 */
export function productEqual(oldProduct, newProduct) {
  if (!oldProduct) return false;

  return Object.keys(newProduct).reduce((acc, key) => {
    if (key === "showMeta" || key === "tempId") return acc;

    if (key === "terms") {
      acc =
        acc &&
        JSON.stringify(oldProduct[key]) === JSON.stringify(newProduct[key]);
    } else {
      acc = acc && oldProduct[key] === newProduct[key];
    }
    return acc;
  }, true);
}

/**
 * 入力欄の全選択
 */
export function selectAllText(e: FocusEvent) {
  (e.target as HTMLInputElement).select();
}
