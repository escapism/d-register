<script setup lang="ts">
import { ref, onMounted, watch, inject, nextTick } from "vue";
import { useRoute } from 'vue-router';
import { db, type Product } from "@/db";
import {
  convertToBase64,
  getResizedBlob,
  productEqual,
} from "@/utils/imageHelper";
import { formatProductForSave } from "@/utils/productHelper";
import { exportToJson, importFromJson } from "@/composables/useFileIO";
import draggable from "vuedraggable";
import { EXPORT_DELAY } from "@/const/number";
import { gtmTrackEvent, gtmTrackError } from "@/utils/gtm.ts"

const openDialog = inject("globalDialog");
const popped = inject("globalPopup");
const loader = inject("globalLoader");

const metaRefs = ref<Record<number, HTMLElement | null>>({});
const route = useRoute();

// UI管理用の拡張型
interface EditableProduct extends Omit<Product, "image"> {
  tempId: number; // key固定用のID
  image?: Blob | string;
  showMeta?: boolean;
}

// テンプレート参照用の関数
const setMetaRef = (el: any, id: number) => {
  if (el) {
    metaRefs.value[id] = el;
  } else {
    delete metaRefs.value[id];
  }
};

const editableProducts = ref<EditableProduct[]>([]);
const isSortMode = ref(false); // 並び替えモード
const isSaving = ref(false); // 保存中フラグ
const isImported = ref(false); // インポート経由のデータかどうか
const isExporting = ref(false);

let saved = false;

let tempId: number = 0;

watch(isSaving, (val) => {
  loader(val);

  if (val === false && saved) {
    popped("保存が完了しました");
    saved = false;
  }
});

// 初期表示
onMounted(async () => {
  const all = await db.products.orderBy("sortOrder").toArray();
  editableProducts.value = all.map((p) => ({
    ...p,
    tempId: p.id,
    showMeta: false, // 初期状態は閉じる
  }));

  if (all.length) {
    const ids = all.map((p) => p.id);
    tempId = Math.max(...ids);
  }
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
    gtmTrackError("save_products")
    await openDialog("保存に失敗しました。再読込してください。");
  } finally {
    setTimeout(() => {
      isSaving.value = false; // 成功・失敗に関わらずフラグを下ろす
    }, 500);
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
      return
    }

    await exportToJson(products, `products_backup`);
    setTimeout(() => {
      isExporting.value = false;
    }, EXPORT_DELAY);
    gtmTrackEvent("export_products");
  } catch (err) {
    console.error(err);
    gtmTrackError("export_products")
    await openDialog("エクスポートに失敗しました。");
    isExporting.value = false;
  }
};

// JSONインポート
const importJSON = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const data = await importFromJson(file, "products");
    const imported = data.map((item, index) => {
      return {
        ...item,
        tempId: index,
        showMeta: false,
      };
    });

    imported.sort((a, b) => a.sortOrder - b.sortOrder);

    editableProducts.value = imported;
    tempId = imported.length;
    isImported.value = true; // インポートフラグ
    gtmTrackEvent("import_products");
    await openDialog("インポートしました。保存ボタンを押すと確定します。");
  } catch (err) {
    gtmTrackError("import_products")
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
  gtmTrackEvent("move_item")
};

// 入力欄の全選択
const selectAllText = (e: FocusEvent) => {
  (e.target as HTMLInputElement).select();
};

// 商品追加（key用のtempIdを生成）
const addNewProduct = () => {
  editableProducts.value.unshift({
    tempId: ++tempId,
    title: "",
    price: 500,
    stock: 10,
    infinite_stock: false,
    pubdate: "",
    cost: null,
    total_sales_amount: 0,
    sortOrder: 0,
    hidden: false,
    showMeta: false, // 追加情報エリアは閉じた状態で作成
  });

  gtmTrackEvent("add_product")

  nextTick(() => {
    window.scrollTo(0, 0);
  });
};

// 商品削除
const removeProduct = (index: number) => {
  editableProducts.value.splice(index, 1);
  gtmTrackEvent("remove_product")
};

// 表示切り替え関数
const toggleMeta = (id: number, index: number) => {
  const content = metaRefs.value[id];
  if (!content) return;
  const item = editableProducts.value[index];

  if (item.showMeta) {
    // 閉じるアニメーション
    content.style.height = `${content.scrollHeight}px`;
    requestAnimationFrame(() => {
      content.style.height = 0;
      content.style.marginTop = 0;
    });
  } else {
    // 開くアニメーション
    content.style.transition = "none";
    content.style.height = "auto";
    requestAnimationFrame(() => {
      const height = content.scrollHeight;
      content.style.height = 0;
      requestAnimationFrame(() => {
        content.style.transition = null;
        content.style.height = `${height}px`;
        content.style.marginTop = null;
      });
    });
  }
  item.showMeta = !item.showMeta;
  gtmTrackEvent("toggle_meta")
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

  gtmTrackEvent("sort_products")
};

// 並び替えモードの切り替え
const toggleSortMode = () => {
  isSortMode.value = !isSortMode.value;
  gtmTrackEvent("toggle_sort_mode")
};
</script>

<template>
  <div class="container page-container">
    <h1 class="page-title"><i-octicon-file-added-24 /> {{ route.meta.title }}</h1>

    <div class="buttons">
      <button @click="exportJSON" class="btn btn-dl" :disabled="isExporting">
        <i-octicon-download-16 /> エクスポート
      </button>

      <label class="btn btn-ul">
        <i-octicon-upload-16 /> インポート
        <input
          type="file"
          accept=".json"
          @change="importJSON"
          style="display: none"
        />
      </label>
    </div>
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
      v-model="editableProducts"
      item-key="tempId"
      class="edit-item-list"
      :class="{ 'is-sort-mode': isSortMode }"
      :disabled="!isSortMode"
      handle=".drag-handle"
      :animation="200"
      ghost-class="ghost"
      drag-class="drag"
    >
      <template #item="{ element: item, index }">
        <div :key="item.tempId" class="edit-item">
          <div
            v-if="isSortMode"
            class="drag-handle"
            :class="{ 'no-image': !item.image }"
            :aria-label="item.title"
          ></div>
          <div class="edit-item-inner">
            <div
              class="edit-item__image"
              @click="
                (
                  $event.currentTarget.querySelector(
                    'input[type=file]',
                  ) as HTMLInputElement
                ).click()
              "
            >
              <i-octicon-file-media-24
                class="edit-item__image-icon"
                aria-label="画像"
                v-if="!item.image"
              />
              <div class="edit-item__image-container">
                <img v-if="item.image" :src="item.image" />
                <i-octicon-plus-circle-24 v-else />
              </div>
              <input
                type="file"
                accept="image/*"
                :disabled="isSortMode"
                @change="onFileChange($event, index)"
              />
              <span class="btn btn-file">画像を選択</span>
            </div>
            <dl class="edit-item-data">
              <div class="edit-item-data__item">
                <dt>タイトル</dt>
                <dd>
                  <input
                    v-model="item.title"
                    class="input-title"
                    placeholder="タイトル"
                    @focus="selectAllText"
                    type="text"
                    :disabled="isSortMode"
                  />
                </dd>
              </div>
              <div class="edit-item-data__item">
                <dt>価格</dt>
                <dd>
                  <div class="input-with-unit">
                    <input
                      v-model.number="item.price"
                      type="number"
                      min="0"
                      inputmode="decimal"
                      @focus="selectAllText"
                      :disabled="isSortMode"
                    />
                    <span>円</span>
                  </div>
                </dd>
              </div>
              <div class="edit-item-data__item">
                <dt>在庫</dt>
                <dd>
                  <div class="edit-item-data__stock">
                    <input
                      v-model.number="item.stock"
                      type="number"
                      min="0"
                      inputmode="decimal"
                      @focus="selectAllText"
                      :disabled="isSortMode"
                    />
                    <label class="checkbox-label"
                      ><input type="checkbox" v-model="item.infinite_stock" />
                      無制限</label
                    >
                  </div>
                </dd>
              </div>
            </dl>
            <div class="edit-item__controls">
              <label class="edit-item__visibility toggle-btn">
                <i-octicon-eye-24 v-if="!item.hidden" aria-label="表示" />
                <i-octicon-eye-closed-24
                  v-if="item.hidden"
                  aria-label="非表示"
                />
                <input type="checkbox" v-model="item.hidden" @change="gtmTrackEvent('toggle_visibility')" />
              </label>
              <div class="edit-item__order">
                <button
                  class="btn-order"
                  @click="moveItem(index, 'up')"
                  :disabled="index === 0 || isSortMode"
                  aria-label="上に移動"
                >
                  <i-octicon-chevron-up-16 />
                </button>
                <button
                  class="btn-order"
                  @click="moveItem(index, 'down')"
                  :disabled="
                    index === (editableProducts?.length || 0) - 1 || isSortMode
                  "
                  aria-label="下に移動"
                >
                  <i-octicon-chevron-down-16 />
                </button>
              </div>
              <button
                @click="removeProduct(index)"
                class="btn btn-remove-item"
                aria-label="削除"
              >
                <i-octicon-trash-24 />
              </button>
            </div>
            <div class="edit-item-meta">
              <button
                class="edit-item-meta__open"
                :class="{ 'is-open': item.showMeta }"
                @click="toggleMeta(item.tempId, index)"
              >
                <i-octicon-plus-circle-16 /> 追加情報
              </button>
              <div
                :ref="(el) => setMetaRef(el, item.tempId)"
                class="edit-item-meta__content"
                :aria-hidden="(!item.showMeta).toString()"
                :inert="!item.showMeta"
              >
                <dl class="edit-item-meta-data">
                  <div class="edit-item-meta-data__item">
                    <dt>発行日</dt>
                    <dd>
                      <label class="input-date">
                        <span
                          ><input
                            v-model="item.pubdate"
                            type="date"
                            :disabled="isSortMode"
                        /></span>
                        <i-octicon-calendar-16 />
                      </label>
                    </dd>
                  </div>
                  <div class="edit-item-meta-data__item">
                    <dt>印刷費</dt>
                    <dd>
                      <div class="input-with-unit">
                        <input
                          v-model.number="item.cost"
                          type="number"
                          min="0"
                          inputmode="decimal"
                          @focus="selectAllText"
                          :disabled="isSortMode"
                        />
                        <span>円</span>
                      </div>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </template>
    </draggable>
  </div>

  <div class="page-control product-admin-control">
    <button @click="saveAll" class="btn btn-save" :disabled="isSaving">
      変更を保存する
    </button>
  </div>
</template>
