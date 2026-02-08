<script setup lang="ts">
import { ref, onMounted, watch, inject } from "vue";
import { useRoute } from "vue-router";
import { db } from "@/db";
import { exportToJson, importFromJson } from "@/composables/useFileIO";
import { EXPORT_DELAY } from "@/const/number";
import { gtmTrackEvent, gtmTrackError } from "@/utils/gtm.ts";

const router = useRoute();

const openDialog = inject("globalDialog");
const popped = inject("globalPopup");
const loader = inject("globalLoader");

const circleName = ref("");
const showStock = ref(true);
const showSoldoutItems = ref(true);
const showCheckoutDialog = ref(true);
const showCalculator = ref(true);
const threeColumns = ref(false);
const isSaving = ref(false); // 保存中フラグ
const isExporting = ref(false);

const includeSales = ref(false); // 売上データを含めるかどうか

let saved = false;

watch(isSaving, (val) => {
  loader(val);

  if (val === false && saved) {
    popped("保存が完了しました");
    saved = false;
  }
});

const loadOptions = async () => {
  const nameOpt = await db.options.get("circleName");
  if (nameOpt) circleName.value = nameOpt.value;

  const stockOpt = await db.options.get("showStock");
  if (stockOpt) showStock.value = stockOpt.value;

  const soldoutOpt = await db.options.get("showSoldoutItems");
  if (soldoutOpt) showSoldoutItems.value = soldoutOpt.value;

  const dialogOpt = await db.options.get("showCheckoutDialog");
  if (dialogOpt) showCheckoutDialog.value = dialogOpt.value;

  const calcOpt = await db.options.get("showCalculator");
  if (calcOpt) showCalculator.value = calcOpt.value;

  const columnsOpt = await db.options.get("numCols");
  if (columnsOpt) threeColumns.value = columnsOpt.value === 3;
};

const resetOptions = () => {
  circleName.value = "";
  showStock.value = true;
  showSoldoutItems.value = true;
  showCheckoutDialog.value = true;
  showCalculator.value = true;
  threeColumns.value = false;
};

// 初期ロード
onMounted(loadOptions);

// 設定保存
const saveSettings = async () => {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    await db.options.put({ key: "circleName", value: circleName.value });
    await db.options.put({ key: "showStock", value: showStock.value });
    await db.options.put({
      key: "showSoldoutItems",
      value: showSoldoutItems.value,
    });
    await db.options.put({
      key: "showCheckoutDialog",
      value: showCheckoutDialog.value,
    });
    await db.options.put({
      key: "showCalculator",
      value: showCalculator.value,
    });
    await db.options.put({
      key: "numCols",
      value: threeColumns.value ? 3 : 2,
    });

    saved = true;
    gtmTrackEvent("save_settings");
  } catch (e) {
    gtmTrackError("save_settings");
    await openDialog("保存に失敗しました。再読込してください。");
  } finally {
    setTimeout(() => {
      isSaving.value = false;
    }, 500);
  }
};

// 全データ一括エクスポート
const exportAllData = async () => {
  if (isExporting.value) return;
  isExporting.value = true;
  try {
    const products = await db.products.toArray();
    const options = await db.options.toArray();
    let dataExists = products.length || options.length;

    // エクスポート用データオブジェクトの作成
    const exportData: any = {
      timestamp: new Date().toISOString(),
      options,
      products: products,
    };

    // チェックが入っている場合のみ売上データ（sales）を取得して追加
    if (includeSales.value) {
      const sales = await db.sales.toArray();
      exportData.sales = sales;
      dataExists = dataExists || sales.length;
    }
    if (!dataExists) {
      await openDialog("データがありません");
      isExporting.value = false;
      return;
    }

    await exportToJson(exportData, `backup`);
    setTimeout(() => {
      isExporting.value = false;
    }, EXPORT_DELAY);
    gtmTrackEvent("export_app_data");
  } catch (err) {
    console.error(err);
    gtmTrackError("export_app_data");
    await openDialog("エクスポートに失敗しました。");
    isExporting.value = false;
  }
};

// 全データ一括インポート
const importAllData = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (
    !(await openDialog({
      message: "アプリ内のすべてのデータが上書きされます。よろしいですか？",
      type: "confirm",
    }))
  )
    return;

  try {
    const data = await importFromJson(file);

    await db.transaction(
      "rw",
      [db.options, db.products, db.sales],
      async () => {
        await db.options.clear();
        await db.products.clear();
        await db.sales.clear();

        // 1. 設定値 (options) の上書き
        if (data.options) {
          await db.options.bulkPut(data.options);
        }

        // 2. 頒布物 (products) の上書き
        if (data.products) {
          await db.products.bulkPut(data.products);
        }

        // 売上データがJSONに含まれている場合のみ処理
        if (data.sales && Array.isArray(data.sales)) {
          await db.sales.bulkPut(data.sales);
        }
      },
    );

    gtmTrackEvent("import_app_data");
    await openDialog("インポートが完了しました。");
    resetOptions()
    await loadOptions();
  } catch (err) {
    console.error(err);
    gtmTrackError("import_app_data");
    await openDialog(
      "読み込みに失敗しました。正しいJSONファイルか確認してください。",
    );
  } finally {
    (e.target as HTMLInputElement).value = "";
  }
};

// 全データ削除
const deleteAllData = async () => {
  if (
    !(await openDialog({
      message: "アプリ内のすべての情報を削除します。よろしいですか？",
      type: "confirm",
    }))
  )
    return;
  if (!(await openDialog({ message: "こうかいしませんね？", type: "confirm" })))
    return;

  try {
    await db.delete();
    gtmTrackEvent("delete_app_data");
    await openDialog("すべてのデータを削除しました。");
    //window.location.reload();
    await db.open();
    resetOptions();
  } catch (e) {
    console.error(e);
    gtmTrackError("delete_app_data");
    await openDialog("削除中にエラーが発生しました。");
  }
};
</script>

<template>
  <div class="container page-container">
    <h1 class="page-title"><i-octicon-gear-24 /> {{ router.meta.title }}</h1>

    <table class="setting-table">
      <tbody>
        <tr>
          <th>サークル名</th>
          <td>
            <input
              v-model="circleName"
              placeholder="サークル名を入力"
              type="text"
            />
          </td>
        </tr>
        <tr>
          <th>在庫数を表示</th>
          <td>
            <input type="checkbox" v-model="showStock" />
          </td>
        </tr>
        <tr>
          <th>完売品を表示</th>
          <td>
            <input type="checkbox" v-model="showSoldoutItems" />
          </td>
        </tr>
        <tr>
          <th>精算時の確認ダイアログを表示</th>
          <td>
            <input type="checkbox" v-model="showCheckoutDialog" />
          </td>
        </tr>
        <tr>
          <th>お釣り計算機を表示</th>
          <td>
            <input type="checkbox" v-model="showCalculator" />
          </td>
        </tr>
        <tr>
          <th>3列モード</th>
          <td>
            <input type="checkbox" v-model="threeColumns" />
          </td>
        </tr>
      </tbody>
    </table>
    <div class="button-area">
      <button @click="saveSettings" class="btn btn-save">設定を保存する</button>
    </div>

    <section>
      <h2>データ管理</h2>
      <p class="description">
        設定、頒布物情報を含めたJSONファイルの書き出し、読み込みができます。
      </p>
      <div class="export-options">
        <label class="checkbox-label">
          <input
            type="checkbox"
            v-model="includeSales"
            @change="gtmTrackEvent('toggle_include_sales')"
          />
          売上データも含めて書き出す
        </label>
      </div>
      <div class="button-area">
        <button
          @click="exportAllData"
          class="btn btn-dl"
          :disabled="isExporting"
        >
          <i-octicon-download-16 /> データエクスポート
        </button>

        <label class="btn btn-ul">
          <i-octicon-upload-16 /> データインポート
          <input
            type="file"
            accept=".json,application/json"
            @change="importAllData"
            style="display: none"
          />
        </label>
      </div>
      <button class="delete-btn" @click="deleteAllData">
        <i-octicon-trash-24 /> 全データ削除
      </button>
    </section>
  </div>
</template>
