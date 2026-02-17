import { db, type Term } from "@/db";
import type { TaxonomyName } from "@/const/taxonomy";

export async function addTerm(taxonomy: TaxonomyName, name: string, sortOrder: number = 0): Promise<number> {
  // 重複チェック
  const exists = await db.terms
    .where({ taxonomy: taxonomy, name: name })
    .count();

  if (exists > 0) {
    return 0;
  }

  const newTerm: Omit<Term, "id"> = {
    taxonomy: taxonomy,
    name: name,
    sortOrder: sortOrder,
  };

  try {
    const id = await db.terms.add(newTerm as Term);
    return id;
  } catch (err) {
    console.error(err);
    return -1;
  }
}