// 設定の定義（スキーマ）
export const SETTING_SCHEMA = [
  { key: "circleName", label: "サークル名", type: "text", default: "" },
  { key: "showTitle", label: "タイトルを表示", type: "toggle", default: 1 },
  { key: "showStock", label: "在庫数を表示", type: "toggle", default: 1 },
  { key: "showSoldoutItems", label: "完売品を表示", type: "toggle", default: 1 },
  { key: "showCheckoutDialog", label: "精算時の確認ダイアログを表示", type: "toggle", default: 1 },
  { key: "showCalculator", label: "お釣り計算機を表示", type: "toggle", default: 1 },
  { key: "showAgeVerification", label: "年齢確認ダイアログを表示", type: "toggle", default: 0 },
  { key: "enableFiltering", label: "レジでの絞り込み機能", type: "toggle", default: 0 },
  { key: "numCols", label: "3列モード", type: "columns", default: 2 },
] as const;

// 頒布物デフォルト
export const PRODUCT_DEFAULT = {
  title : "",
  price: 500,
  stock: 10,
  infinite_stock: 0,
  pubdate: "",
  cost: null,
  hidden: 0,
  r18: 0,
  terms: {category : []},
  showMeta: 0,
} as const;