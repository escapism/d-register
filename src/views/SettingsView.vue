<script setup lang="ts">
import { ref, onBeforeMount, watch, inject } from "vue";
import { useRoute } from "vue-router";
import { db } from "@/db";
import { exportToJson, importFromJson } from "@/composables/useFileIO";
import { resolveTermsByName} from "@/utils/productHelper"
import { EXPORT_DELAY, SAVING_DELAY } from "@/const/number";
import { gtmTrackEvent, gtmTrackError } from "@/utils/gtm.ts";
import { SETTING_SCHEMA } from "@/const/setting";

const router = useRoute();

const openDialog = inject("globalDialog");
const popped = inject("globalPopup");
const loader = inject("globalLoader");

const settings = ref<Record<string, any>>({});
const isSaving = ref(false); // 保存中フラグ
const isExporting = ref(false);
const includeSales = ref(false); // 売上データを含めるかどうか

let saved = false;

// 初期値のセット
const resetOptions = () => {
  SETTING_SCHEMA.forEach((s) => {
    settings.value[s.key] = s.default;
  });
};
resetOptions();

watch(isSaving, (val) => {
  loader(val);

  if (val === false && saved) {
    popped("保存が完了しました");
    saved = false;
  }
});

const loadOptions = async () => {
  const allOpts = await db.options.toArray();
  const optMap = Object.fromEntries(allOpts.map((o) => [o.key, o.value]));

  SETTING_SCHEMA.forEach((s) => {
    if (optMap[s.key] !== undefined) {
      if (s.type === "toggle") {
        settings.value[s.key] = optMap[s.key] ? 1 : 0;
      } else {
        settings.value[s.key] = optMap[s.key];
      }
    }
  });
};

// 初期ロード
onBeforeMount(loadOptions);

// 設定保存
const saveSettings = async () => {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    const dataToPut = SETTING_SCHEMA.map((s) => ({
      key: s.key,
      value: settings.value[s.key],
    }));

    await db.options.bulkPut(dataToPut);
    saved = true;
    gtmTrackEvent("save_settings");
  } catch (e) {
    gtmTrackError("save_settings");
    await openDialog("保存に失敗しました。再読込してください。");
  } finally {
    setTimeout(() => {
      isSaving.value = false;
    }, SAVING_DELAY);
  }
};

// 全データ一括エクスポート
const exportAllData = async () => {
  if (isExporting.value) return;
  isExporting.value = true;
  try {
    const products = await db.products.toArray();
    const options = await db.options.toArray();
    const terms = await db.terms.toArray();
    let dataExists = products.length || options.length || terms.length;

    // エクスポート用データオブジェクトの作成
    const exportData: any = {
      timestamp: new Date().toISOString(),
      options,
      products,
      terms,
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
    loader(true);
    const data = await importFromJson(file);

    await db.transaction(
      "rw",
      [db.options, db.products, db.terms, db.sales],
      async () => {
        await db.options.clear();
        await db.products.clear();
        await db.terms.clear();
        await db.sales.clear();

        // 設定値 (options) の上書き
        if (data.options) {
          await db.options.bulkPut(data.options);
        }

        // ターム (terms) の上書き
        if (data.terms) {
          await db.terms.bulkPut(data.terms);
        }

        // 頒布物 (products) の上書き
        if (data.products) {
          for (const p of data.products) {
            if (p.terms) {
              p.terms = await resolveTermsByName(p.terms);
            }
          }
          await db.products.bulkPut(data.products);
        }

        // 売上データがJSONに含まれている場合のみ処理
        if (data.sales && Array.isArray(data.sales)) {
          await db.sales.bulkPut(data.sales);
        }
      },
    );
    loader(false);
    gtmTrackEvent("import_app_data");
    await openDialog("インポートが完了しました。");
    resetOptions();
    await loadOptions();
  } catch (err) {
    console.error(err);
    loader(false);
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

    <ul class="sub-menu">
      <li>
        <router-link to="/settings/product"
          ><i-octicon-chevron-right-24 /> 頒布物設定</router-link
        >
      </li>
    </ul>
    <table class="setting-table">
      <tbody>
        <tr v-for="item in SETTING_SCHEMA" :key="item.key">
          <th>{{ item.label }}</th>
          <td>
            <input
              v-if="item.type === 'text'"
              type="text"
              v-model="settings[item.key]"
              placeholder="未設定"
            />
            <input
              v-else-if="item.type === 'toggle'"
              type="checkbox"
              v-model="settings[item.key]"
              :true-value="1"
              :false-value="0"
            />
            <input
              v-else-if="item.type === 'columns'"
              type="checkbox"
              v-model="settings[item.key]"
              :true-value="3"
              :false-value="2"
            />
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
