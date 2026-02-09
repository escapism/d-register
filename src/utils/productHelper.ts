import { getImageWidth, getResizedBlob, convertToBase64 } from "@/utils/imageHelper";
import { sanitizeDate } from "@/utils/dateHelper";

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
    infinite_stock: item.infinite_stock ? 1 : 0,
    pubdate: item.pubdate || "",
    cost: item.cost ?? null,
    r18: item.r18 ? 1 : 0,
    terms: item.terms ? JSON.parse(JSON.stringify(item.terms)) : null,
    total_sales_amount: item.total_sales_amount || 0,
    sortOrder: index,
    hidden: item.hidden ? 1 : 0,
    image: image,
  };
  console.log(forSave)

  if (item.id !== undefined) {
    forSave.id = item.id
  }

  return forSave
}

/**
 * インポートされた生データを、アプリ内で使える形式にクリーニングする
 */
export async function sanitizeImportedProduct(data) {
  let imageContent = data.image || "";

  if (imageContent.startsWith("data:")) {
    // 自前データ（Base64）の場合
    const width = await getImageWidth(data.image);
    if (width > 480) {
      imageContent = await getResizedBlob(data.image);
    }
  } else if (imageContent.startsWith("http")) {
    // 外部URLの場合はそのまま保存
    imageContent = data.image;
  }

  data.pubdate = sanitizeDate(data.pubdate)

  return formatProductForSave(data, data.sortOrder)
}

/**
 * 内容が等しいproductかどうか判定
 */
export function productEqual(oldProduct, newProduct) {
  if (!oldProduct) return false;

  return Object.keys(newProduct).reduce((acc, key) => {
    if (key === "showMeta" || key === "tempId") return acc

    if (key === "terms") {
      acc = acc && JSON.stringify(oldProduct[key]) === JSON.stringify(newProduct[key]);
    } else {
      acc = acc && oldProduct[key] === newProduct[key];
    }
    return acc;
  }, true);
}