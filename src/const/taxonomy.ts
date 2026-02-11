import IOcticonFileDirectory24 from "~icons/octicon/file-directory-24";
import IOcticonInbox24 from "~icons/octicon/inbox-24";

export const TAXONOMY_DEFINITIONS = {
  category: {
    label: "カテゴリー",
    icon: IOcticonFileDirectory24,
    placeholder: "例：漫画、グッズ",
  },
  genre: {
    label: "ジャンル",
    icon: IOcticonInbox24,
    placeholder: "例：アイドルマイスター、ホース娘",
  },
} as const;

export type TaxonomyName = keyof typeof TAXONOMY_DEFINITIONS;
