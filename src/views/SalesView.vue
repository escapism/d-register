<script setup lang="ts">
import { ref, onMounted, computed, inject } from "vue";
import { db } from "@/db";
import { EXPORT_DELAY } from "@/const/number";
import { getDateString } from "@/utils/dateHelper";

const openDialog = inject('globalDialog');
const products = ref<Product[]>([]);
const sales = ref<any[]>([]);
const circleName = ref("data");
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
    db.products.orderBy("sortOrder").toArray(),
    db.options.get("circleName"),
  ]);
  console.log(pData, nameOpt)

  products.value = pData;
  if (nameOpt) circleName.value = nameOpt.value;
});

// ファイル名生成用のユーティリティ
const getExportFileName = (prefix: string) => {
  return `${prefix}_${circleName.value ? circleName.value + "_" : ""}${getDateString()}.csv`;
};

// 商品ごとの集計データを作成
const salesSummary = computed(() => {
  return (
    products.value
      .map((p) => {
        // 1. この商品の販売レコードを抽出 (productId または title で紐付け)
        const itemSales = sales.value.filter(
          (s) => s.productId === p.id || s.productTitle === p.title,
        );

        // 2. 数量の合計を計算
        const quantity = itemSales.reduce((sum, s) => sum + s.quantity, 0);

        // 3. 完済（ペイ）判定
        const isPaidOff =
          p.cost && p.cost > 0 ? (p.total_sales_amount || 0) >= p.cost : false;

        paidOff.value = paidOff.value || isPaidOff;

        return {
          id: p.id,
          title: p.title,
          quantity: quantity, // これで「頒布数」が表示される
          total: p.total_sales_amount || 0,
          cost: p.cost || 0,
          isPaidOff: isPaidOff,
        };
      })
      // 3. 頒布数が 0 は除く
      .filter((item) => item.quantity)
  );
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
const downloadSalesCSV = () => {
  if (isExporting.value) return;
  if (!sales.value || sales.value.length === 0)
    return openDialog("データがありません");

  isExporting.value = true;

  let csv = "日時,商品名,単価,数量,小計,精算ID\n";
  sales.value.forEach((s) => {
    csv +=
      [
        new Date(s.timestamp).toLocaleString("ja-JP"),
        `"${s.productTitle}"`,
        s.priceAtSale,
        s.quantity,
        s.priceAtSale * s.quantity,
        s.transactionId || "N/A",
      ].join(",") + "\n";
  });

  // 末尾に合計行を追加
  csv += `\n"合計",,,${totalQuantity.value},${totalAmount.value},`;

  downloadFile(csv, getExportFileName("sales_detail"));
  setTimeout(() => {
    isExporting.value = false;
  }, EXPORT_DELAY);
};

// 概要CSV（画面に表示している集計）
const downloadSalesOverviewCSV = () => {
  if (isExporting2.value) return;
  if (salesSummary.value.length === 0) return openDialog("データがありません");

  isExporting2.value = true;

  let csv = "商品名,頒布数,合計金額\n";
  salesSummary.value.forEach((s) => {
    csv += [`"${s.title}"`, s.quantity, s.total].join(",") + "\n";
  });

  csv += `\n"合計",${totalQuantity.value},${totalAmount.value}`;

  downloadFile(csv, getExportFileName("sales_overview"));
  setTimeout(() => {
    isExporting2.value = false;
  }, EXPORT_DELAY);
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
  if (await openDialog({message: "売上データをすべて削除します。よろしいですか？", type: "confirm"})) {
    await db.sales.clear();
    await loadSales();
    await openDialog("削除しました");
  }
};
</script>

<template>
  <div class="container page-container">
    <h1 class="page-title"><i-octicon-archive-24 /> 売上確認</h1>
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
        <i-octicon-history-16 /> 精算履歴・取消はこちら
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
