export const TAXONOMY_DEFINITIONS = {
  category: { 
    label: "カテゴリー", 
  },
} as const;

export type TaxonomyName = keyof typeof TAXONOMY_DEFINITIONS;