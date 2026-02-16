<script setup lang="ts">
import { ref, onBeforeMount, onMounted, watch, inject, nextTick, computed, useTemplateRef } from "vue";
import { useRoute } from "vue-router";
import { db, type Product, type Term } from "@/db";
import { convertToBase64, getResizedBlob } from "@/utils/imageHelper";
import { formatProductForSave, productEqual, formatProductsForExport } from "@/utils/productHelper";
import { exportToJson, importFromJson } from "@/composables/useFileIO";
import draggable from "vuedraggable";
import { PRODUCT_DEFAULT } from "@/const/setting";
import { EXPORT_DELAY, SAVING_DELAY } from "@/const/number";
import { gtmTrackEvent, gtmTrackError } from "@/utils/gtm.ts";
import { getDateValue } from "@/utils/dateHelper";
import ProductAdminItem from "@/components/ProductAdminItem.vue";
import TermFilterGroup from "@/components/TermFilterGroup.vue";
import { fetchTerms } from "@/composables/useTerms";

const openDialog = inject("globalDialog");
const popped = inject("globalPopup");
const loader = inject("globalLoader");

const route = useRoute();

// UI管理用の拡張型
interface EditableProduct extends Product {
  tempId: number; // key固定用のID
  showMeta?: boolean;
}

const editItemList = useTemplateRef("editItemList")
const editableProducts = ref<EditableProduct[]>([]);
const allCategories = ref<Term[]>([]);
const allGenres = ref<Term[]>([]);
const activeCategoryId = ref<number | "all">("all"); // カテゴリー選択状態
const activeGenreId = ref<number | "all">("all"); // ジャンル選択状態

const isSortMode = ref(false); // 並び替えモード
const isSaving = ref(false); // 保存中フラグ
const isImported = ref(false); // インポート経由のデータかどうか
const isExporting = ref(false);

let productDefault = { ...PRODUCT_DEFAULT };

let saved = false;
let tempId: number = 0;
let headerHeight = 0

watch(isSortMode, (val) => {
  if (val === true) {
    activeCategoryId.value = "all";
    activeGenreId.value = "all";
  }
});

watch(isSaving, (val) => {
  loader(val);

  if (val === false && saved) {
    popped("保存が完了しました");
    saved = false;
  }
});

// 初期表示
onBeforeMount(async () => {
  // デフォルト設定
  const defaultOpt = await db.options.get("productDefault");
  if (defaultOpt && defaultOpt.value) {
    productDefault = { ...PRODUCT_DEFAULT, ...defaultOpt.value };
  }

  allCategories.value = await fetchTerms("category");
  allGenres.value = await fetchTerms("genre");

  const allProducts = await db.products.orderBy("sortOrder").toArray();

  editableProducts.value = allProducts.map((p) => ({
    ...p,
    infiniteStock: p.infiniteStock ? 1 : 0,
    hidden: p.hidden ? 1 : 0,
    r18: p.r18 ? 1 : 0,
    terms: p.terms || {},
    tempId: p.id!,
    showMeta: productDefault.showMeta,
  }));

  if (allProducts.length) {
    const ids = allProducts.map((p) => p.id);
    tempId = Math.max(...ids);
  }
})

onMounted(() => {
  headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'));
});

// カテゴリー絞り込み
const filteredProducts = computed({
  get: () => {
    if (activeCategoryId.value === "all" && activeGenreId.value === "all") {
      return editableProducts.value;
    }

    return editableProducts.value.filter((p) => {
      const matchCat =
        activeCategoryId.value === "all" ||
        p.terms?.category?.includes(activeCategoryId.value as number);
      const matchGenre =
        activeGenreId.value === "all" ||
        p.terms?.genre?.includes(activeGenreId.value as number);
      return matchCat && matchGenre;
    });
  },
  set: (newValue) => {
    // 絞り込みなし（全件表示）の時だけ並び替えを許可する場合
    if (activeCategoryId.value === "all" && activeGenreId.value === "all") {
      editableProducts.value = newValue;
    }
  },
});

// 画像選択
const onFileChange = async (e: Event, index: number) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const tempUrl = URL.createObjectURL(file);
  const resizedBlob = await getResizedBlob(tempUrl);
  URL.revokeObjectURL(tempUrl);

  if (resizedBlob) {
    editableProducts.value[index].image = await convertToBase64(resizedBlob);
  }
};

// 保存
const saveAll = async () => {
  if (isSaving.value) return; // 二重送信防止
  isSaving.value = true; // ローディング開始

  try {
    await db.transaction("rw", db.products, async () => {
      if (isImported.value) {
        // インポートモード（丸ごと入れ替え）
        await db.products.clear();

        const dataToSave = await Promise.all(
          editableProducts.value.map((item, index) =>
            formatProductForSave(item, index),
          ),
        );

        if (dataToSave.length > 0) {
          await db.products.bulkPut(dataToSave);
        }
      } else {
        // 通常編集モード（差分保存）
        const savedProducts = await db.products.toArray();

        // 削除処理
        const currentIds = editableProducts.value
          .map((p) => p.id)
          .filter((id) => id !== undefined);
        await db.products
          .where("id")
          .noneOf(currentIds as number[])
          .delete();

        editableProducts.value.forEach(async (item, index) => {
          const oldData = savedProducts.find((p) => p.id === item.id);
          item.sortOrder = index;
          const isDataChanged = !productEqual(oldData, item);

          if (!isDataChanged) return;

          const data = await formatProductForSave(item, index);

          if (item.id !== undefined) {
            await db.products.update(item.id, data);
          } else {
            await db.products.put(data);
          }
        });
      }
    });
    isImported.value = false;
    saved = true;
    gtmTrackEvent("save_products");
  } catch (error) {
    console.error(error);
    gtmTrackError("save_products");
    await openDialog("保存に失敗しました。再読込してください。");
  } finally {
    setTimeout(() => {
      isSaving.value = false; // 成功・失敗に関わらずフラグを下ろす
    }, SAVING_DELAY);
  }
};

// JSONエクスポート
const exportJSON = async () => {
  if (isExporting.value) return;
  isExporting.value = true;

  try {
    const products = await db.products.toArray();
    if (!products.length) {
      await openDialog("データがありません");
      isExporting.value = false;
      return;
    }
    const formatProducts = await formatProductsForExport(products)

    await exportToJson(formatProducts, `products_backup`);
    setTimeout(() => {
      isExporting.value = false;
    }, EXPORT_DELAY);
    gtmTrackEvent("export_products");
  } catch (err) {
    console.error(err);
    gtmTrackError("export_products");
    await openDialog("エクスポートに失敗しました。");
    isExporting.value = false;
  }
};

// JSONインポート
const importJSON = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const importedRaw = await importFromJson(file, "products");

    // インポートされた各商品に対してクリーンアップを実行
    const imported = importedRaw.map((p: Product, index) => {
      return {
        ...p,
        terms: p.terms || {},
        tempId: index,
        showMeta: productDefault.showMeta,
      };
    });

    imported.sort((a, b) => a.sortOrder - b.sortOrder);

    editableProducts.value = imported;
    tempId = imported.length;

    // ターム再読み込み
    allCategories.value = await fetchTerms("category");
    allGenres.value = await fetchTerms("genre");

    isImported.value = true; // インポートフラグ
    gtmTrackEvent("import_products");
    await openDialog("インポートしました。保存ボタンを押すと確定します。");
  } catch (err) {
    gtmTrackError("import_products");
    await openDialog("JSONの読み込みに失敗しました。");
  } finally {
    (e.target as HTMLInputElement).value = "";
  }
};

// 指定したインデックスの要素を移動させる
const moveItem = (index: number, direction: "up" | "down") => {
  if (!editableProducts.value) return;
  const newIndex = direction === "up" ? index - 1 : index + 1;

  // 範囲外なら何もしない
  if (newIndex < 0 || newIndex >= editableProducts.value.length) return;

  // 要素の入れ替え
  const item = editableProducts.value.splice(index, 1)[0];
  editableProducts.value.splice(newIndex, 0, item);
  gtmTrackEvent("move_item");
};

// 商品追加（key用のtempIdを生成）
const addNewProduct = () => {
  editableProducts.value.unshift({
    ...JSON.parse(JSON.stringify(productDefault)),
    tempId: ++tempId,
    title: productDefault.title || "",
    pubdate: productDefault.pubdate === "today" ? getDateValue() : null,
    totalSalesAmount: 0,
    sortOrder: 0,
    showMeta: true,
  });

  gtmTrackEvent("add_product");

  nextTick(() => {
    const top = editItemList.value?.$el.getBoundingClientRect().top
    window.scrollTo(0, window.pageYOffset + top - headerHeight);
  });
};

// 商品削除
const removeProduct = (index: number) => {
  editableProducts.value.splice(index, 1);
  gtmTrackEvent("remove_product");
};

// ソート用関数
const sortProducts = () => {
  editableProducts.value = [...editableProducts.value].sort((a, b) => {
    // 1. 発行日(pubdate)で比較
    if (a.pubdate && b.pubdate) {
      if (a.pubdate !== b.pubdate) {
        return b.pubdate.localeCompare(a.pubdate); // 新しい順(降順)
      }
    }
    // 2. 片方にしか発行日がない場合
    if (a.pubdate && !b.pubdate) return -1;
    if (b.pubdate && !a.pubdate) return 1;

    // 3. 両方発行日がない、または同じ日付ならID(tempId/id)で比較
    const idA = a.id ?? a.tempId ?? 0;
    const idB = b.id ?? b.tempId ?? 0;
    return idB - idA; // IDが新しい順
  });

  gtmTrackEvent("sort_products");
};

// 並び替えモードの切り替え
const toggleSortMode = () => {
  isSortMode.value = !isSortMode.value;
  gtmTrackEvent("toggle_sort_mode");
};
</script>

<template>
  <div class="container page-container">
    <h1 class="page-title">
      <i-octicon-file-added-24 /> {{ route.meta.title }}
    </h1>
    <ul class="sub-menu">
      <li>
        <router-link to="/admin/terms/category">
          <i-octicon-chevron-right-24 /> カテゴリー管理
        </router-link>
      </li>
      <li>
        <router-link to="/admin/terms/genre">
          <i-octicon-chevron-right-24 /> ジャンル管理
        </router-link>
      </li>
    </ul>
    <div class="buttons">
      <button @click="exportJSON" class="btn btn-dl" :disabled="isExporting">
        <i-octicon-download-16 /> エクスポート
      </button>

      <label class="btn btn-ul">
        <i-octicon-upload-16 /> インポート
        <input
          type="file"
          accept=".json,application/json"
          @change="importJSON"
          style="display: none"
        />
      </label>
    </div>
    <TermFilterGroup
      v-if="allCategories.length || allGenres.length"
      v-model:active-category="activeCategoryId"
      v-model:active-genre="activeGenreId"
      :categories="allCategories"
      :genres="allGenres"
      :disabled="isSortMode"
      slug="admin"
    />
    <div v-if="isImported" class="warning">
      <strong
        >⚠️
        インポートしたデータを編集中です。保存すると既存のデータが上書きされます。</strong
      >
    </div>
    <div class="sort">
      <button
        @click="toggleSortMode"
        class="sort__mode"
        :class="{ 'btn-active': isSortMode }"
      >
        <i-octicon-code-24 /> {{ isSortMode ? "編集に戻る" : "並び替えモード" }}
      </button>
      <button
        @click="sortProducts"
        class="sort__pudbate"
        title="発行日が新しい順に並べ替えます"
      >
        <i-octicon-sort-desc-24 /> 発行日順に整列
      </button>
    </div>
    <button
      @click="addNewProduct"
      class="add-btn"
      aria-label="アイテム追加"
      :disabled="isSortMode"
    >
      <i-octicon-plus-16 />
    </button>

    <draggable
      v-model="filteredProducts"
      ref="editItemList"
      item-key="tempId"
      class="edit-item-list"
      :class="{ 'is-sort-mode': isSortMode }"
      :disabled="!isSortMode"
      handle=".drag-handle"
      :animation="200"
      ghost-class="ghost"
      drag-class="drag"
      tag="div"
    >
      <template #item="{ element: item, index }">
        <ProductAdminItem
          :item="item"
          :index="index"
          :is-sort-mode="isSortMode"
          :all-categories="allCategories"
          :all-genres="allGenres"
          :total-products="editableProducts.length"
          :enable-r18="!!productDefault.enableR18"
          @file-change="onFileChange"
          @remove="removeProduct"
          @move="moveItem"
        />
      </template>
    </draggable>
  </div>

  <div class="page-control product-admin-control">
    <button @click="saveAll" class="btn btn-save" :disabled="isSaving">
      変更を保存する
    </button>
  </div>
</template>
<style scoped></style>
