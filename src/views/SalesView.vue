<script setup lang="ts">
import { ref, onMounted, computed, inject } from "vue";
import { useRoute } from 'vue-router';
import { db, type Product } from "@/db";
import { EXPORT_DELAY } from "@/const/number";
import { getDateString } from "@/utils/dateHelper";
import { gtmTrackEvent, gtmTrackError } from "@/utils/gtm.ts";

const router = useRoute()

const openDialog = inject("globalDialog");
const products = ref<Product[]>([]);
const sales = ref<any[]>([]);
const circleName = ref("");
const paidOff = ref(false);

const isExporting = ref(false);
const isExporting2 = ref(false);

// データをロード
const loadSales = async () => {
  sales.value = await db.sales.toArray();
};

onMounted(async () => {
  await loadSales();

  const [pData, nameOpt] = await Promise.all([
    db.products.toArray(),
    db.options.get("circleName"),
  ]);
  products.value = pData;
  if (nameOpt) circleName.value = nameOpt.value;
});

// ファイル名生成用のユーティリティ
const getExportFileName = (prefix: string) => {
  return `${prefix}_${circleName.value ? circleName.value + "_" : ""}${getDateString()}.csv`;
};

// 商品ごとの集計データを作成
const salesSummary = computed(() => {
  // 1. 売上データから、商品IDごとにグループ化する
  // (削除されたものも含め、売上がある全商品を網羅する)
  const groupedSales = sales.value.reduce((acc, s) => {
    const id = s.productId;
    if (!acc[id]) {
      acc[id] = {
        id: id,
        title: s.productTitle, // 売上記録時の名称を初期値にする
        quantity: 0,
        total: 0,
        priceAtSale: s.priceAtSale // 完済計算用に使う（直近の価格）
      };
    }
    acc[id].quantity += s.quantity;
    acc[id].total += (s.priceAtSale * s.quantity);
    return acc;
  }, {} as Record<number, any>);

  // 2. 集計したデータを配列にし、現存する商品情報とマージする
  const summary = Object.values(groupedSales).map((soldItem: any) => {
    // マスターデータ(products)から現在の情報を探す
    const currentProduct = products.value.find(p => p.id === soldItem.id);
    
    // 印刷費。マスターになければ売上データからは不明なので0（または計算から除外）
    const cost = currentProduct?.cost || 0;
    const isPaidOff = cost > 0 ? soldItem.total >= cost : false;

    return {
      id: soldItem.id,
      // マスターに商品があれば最新のタイトル、なければ売上時のタイトル
      title: currentProduct ? currentProduct.title : soldItem.title,
      quantity: soldItem.quantity,
      total: soldItem.total,
      cost,
      isPaidOff,
      // 並び替え用：マスターにあればその順序、なければ最後(Infinity)
      sortOrder: currentProduct !== undefined ? currentProduct.sortOrder : Infinity,
      isDeleted: !currentProduct
    };
  });

  // 3. ソート：sortOrder順に並べ、削除済み(Infinity)は最後に
  return summary.sort((a, b) => a.sortOrder - b.sortOrder);
});

// 総合計
const totalAmount = computed(() =>
  sales.value.reduce(
    (acc, cur) => acc + (Number(cur.priceAtSale * cur.quantity) || 0),
    0,
  ),
);

const totalQuantity = computed(() =>
  sales.value.reduce((acc, cur) => acc + (Number(cur.quantity) || 0), 0),
);

// 詳細CSV
const downloadSalesCSV = async () => {
  if (isExporting.value) return;
  if (!sales.value || sales.value.length === 0)
    return openDialog("データがありません");

  isExporting.value = true;

  try {
    const allTerms = await db.terms.toArray();
    const termMap = new Map(allTerms.map(t => [t.id, t.name]));

    // カテゴリー/ジャンルがマスターに存在するかチェック
    const hasCategory = allTerms.some(t => t.taxonomy === 'category');
    const hasGenre = allTerms.some(t => t.taxonomy === 'genre');

    // ヘッダーの構築
    const headerItems = ["精算ID", "日時", "品名", "単価", "数量", "小計"];
    if (hasCategory) headerItems.push("カテゴリー");
    if (hasGenre) headerItems.push("ジャンル");

    let csv = headerItems.join(",") + "\n";

    // データ行の生成
    sales.value.forEach((s) => {
      // マスターデータ(products)から現在のターム設定を取得
      const currentProduct = products.value.find(p => p.id === s.productId);
      
      const rowItems = [
        s.transactionId || "N/A",
        new Date(s.timestamp).toLocaleString("ja-JP"),
        `"${s.productTitle}"`,
        s.priceAtSale,
        s.quantity,
        s.priceAtSale * s.quantity
      ];

      // カテゴリー列（存在する場合）
      if (hasCategory) {
        const cats = currentProduct?.terms?.category
          ?.map(id => termMap.get(id))
          .filter(Boolean)
          .join("/") || "";
        rowItems.push(`"${cats}"`);
      }

      // ジャンル列（存在する場合）
      if (hasGenre) {
        const genres = currentProduct?.terms?.genre
          ?.map(id => termMap.get(id))
          .filter(Boolean)
          .join("/") || "";
        rowItems.push(`"${genres}"`);
      }

      csv += rowItems.join(",") + "\n";
    });

    // フッター合計行
    const totalRow = new Array(headerItems.length).fill("");
    totalRow[0] = '"合計"';
    totalRow[headerItems.indexOf("数量")] = totalQuantity.value;
    totalRow[headerItems.indexOf("小計")] = totalAmount.value;
    csv += `\n${totalRow.join(",")}\n`;

    downloadFile(csv, getExportFileName("sales_detail"));
    setTimeout(() => {
      isExporting.value = false;
    }, EXPORT_DELAY);
    gtmTrackEvent("export_sales_detail");
  } catch (err) {
    console.error(err);
    gtmTrackError("export_sales_detail");
    await openDialog("エクスポートに失敗しました。");
    isExporting.value = false;
  }
};

// 概要CSV（画面に表示している集計）
const downloadSalesOverviewCSV = async () => {
  if (isExporting2.value) return;
  if (salesSummary.value.length === 0) return openDialog("データがありません");

  isExporting2.value = true;

  try {
    let csv = "品名,頒布数,合計金額\n";
    salesSummary.value.forEach((s) => {
      csv += [`"${s.title}"`, s.quantity, s.total].join(",") + "\n";
    });

    csv += `\n"合計",${totalQuantity.value},${totalAmount.value}`;

    downloadFile(csv, getExportFileName("sales_overview"));
    setTimeout(() => {
      isExporting2.value = false;
    }, EXPORT_DELAY);
    gtmTrackEvent("export_sales_overview");
  } catch (err) {
    console.error(err);
    gtmTrackError("export_sales_overview");
    await openDialog("エクスポートに失敗しました。");
    isExporting2.value = false;
  }
};

const downloadFile = (content: string, filename: string) => {
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// データ削除
const deleteSales = async () => {
  if (!sales.value || sales.value.length === 0)
    return openDialog("データがありません");

  if (
    await openDialog({
      message: "売上データをすべて削除します。よろしいですか？",
      type: "confirm",
    })
  ) {
    try {
      await db.sales.clear();
      gtmTrackEvent("delete_sales");
      await loadSales();
      await openDialog("削除しました");
    } catch (err) {
      console.error(err);
      gtmTrackError("delete_sales");
      await openDialog("削除に失敗しました。");
    }
  }
};
</script>

<template>
  <div class="container page-container">
    <h1 class="page-title"><i-octicon-archive-24 /> {{ router.meta.title }}</h1>
    <div class="table-wrap">
      <table class="sales-table">
        <thead>
          <tr>
            <th class="paid-off"></th>
            <th>タイトル</th>
            <th class="num">頒布数</th>
            <th class="amount">合計金額</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in salesSummary" :key="item.id">
            <td class="paid-off">
              <i-octicon-star-fill-16
                v-if="item.isPaidOff"
                aria-label="印刷費回収済み"
              />
            </td>
            <th scope="row">
              <i-octicon-x-24 v-if="item.isDeleted" class="deleted" aria-label="削除済み" />
              <template v-if="item.title">{{ item.title }}</template>
              <span v-else class="untitled">名称未設定</span>
            </th>
            <td class="num">{{ item.quantity }}</td>
            <td class="amount">{{ item.total.toLocaleString("ja-JP") }}円</td>
          </tr>
          <tr v-if="salesSummary.length === 0">
            <td colspan="4" class="no-data">売上データがまだありません。</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th class="paid-off"></th>
            <th scope="row">合計</th>
            <td class="num">{{ totalQuantity }}</td>
            <td class="amount">{{ totalAmount.toLocaleString("ja-JP") }}円</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="sales-table-note" v-if="paidOff">
      <i-octicon-star-fill-16 />：印刷費回収済み
    </div>
    <div class="button-area">
      <router-link to="/sales/cancel" class="btn btn-history">
        <i-octicon-history-16 /> 精算履歴・取消
      </router-link>
    </div>
    <section>
      <h2>CSVダウンロード</h2>
      <div class="buttons">
        <a
          href="#"
          @click.prevent="downloadSalesOverviewCSV"
          class="btn btn-dl"
          :class="{ disabled: isExporting2 }"
          ><i-octicon-download-16 /> 概要</a
        >
        <a
          href="#"
          @click.prevent="downloadSalesCSV"
          class="btn btn-dl"
          :class="{ disabled: isExporting }"
          ><i-octicon-download-16 /> 詳細</a
        >
      </div>
    </section>
    <button class="delete-btn" @click="deleteSales">
      <i-octicon-trash-24 /> 売上データ削除
    </button>
  </div>
</template>
