import { db } from "@/db";
import type { TaxonomyName } from "@/const/taxonomy";

export async function fetchTerms(taxonomy: TaxonomyName) {
  return await db.terms.where("taxonomy").equals(taxonomy).sortBy("sortOrder");
}
