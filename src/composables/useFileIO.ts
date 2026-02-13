
import { db } from "@/db"
import { getDateString } from "@/utils/dateHelper";
import {sanitizeImportedProduct, resolveTermsByName} from "@/utils/productHelper"

/**
 * データをJSONファイルとしてダウンロードさせる
 */
export async function exportToJson(data, fileName = "") {
  const circleName = await db.options.get("circleName");

  fileName = `${fileName}${circleName?.value ? "_" + circleName.value : ""}_${getDateString()}.json`;

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * ファイル選択ダイアログを開き、JSONをパースして返す
 */
export async function importFromJson(file : File, property="") {
  const text = await file.text()

  try {
    const data = JSON.parse(text)

    const products = Array.isArray(data) ? data : data.products
    if (products) {
      const sanitizedProducts = await Promise.all(products.map(sanitizeImportedProduct))

      if (property === "products") {
        for (const p of sanitizedProducts) {
          if (p.terms) {
            p.terms = await resolveTermsByName(p.terms)
          }
        }
      }

      if (property === "products") {
        return sanitizedProducts
      }
      if (Array.isArray(data)) {
        return {
          products: sanitizedProducts
        }
      }
    }

    return data
  } catch (err) {
    throw err
  }
}
