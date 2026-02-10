<script setup lang="ts">
import { ref, onMounted, inject } from "vue";
import { useRoute } from "vue-router";
import { db, type Term } from "@/db";
import draggable from "vuedraggable";
import { gtmTrackEvent, gtmTrackError } from "@/utils/gtm.ts";

const route = useRoute();
const openDialog = inject("globalDialog");
const popped = inject("globalPopup");

const categories = ref<Term[]>([]);
const newCategoryName = ref("");
const isSaving = ref(false); // 保存中フラグ

let tempId: number = 0;

onMounted(async () => {
  categories.value = await db.terms
    .where("taxonomy")
    .equals("category")
    .sortBy("sortOrder");

  if (categories.value.length) {
    const ids = categories.value.map((c) => c.id);
    tempId = Math.max(...ids);
  }
});

const addNewCategory = () => {
  if (!newCategoryName.value.trim()) return;

  categories.value.push({
    tempId: ++tempId,
    name: newCategoryName.value,
    taxonomy: "category",
    sortOrder: categories.value.length, // 末尾に追加
  });

  newCategoryName.value = "";
  gtmTrackEvent("add_category")
};

// ローカルリストから削除
const removeCategory = (index: number) => {
  categories.value.splice(index, 1);
  gtmTrackEvent("remove_category")
};

// DBへの一括保存処理
const saveCategories = async () => {
  isSaving.value = true;
  try {
    // 1. DB上の現在のカテゴリータームを一度特定（削除されたものを判別するため）
    const currentDbTerms = await db.terms
      .where("taxonomy")
      .equals("category")
      .toArray();
    const currentIds = categories.value
      .map((c) => c.id)
      .filter((id) => id !== undefined);

    // 2. リストから消えたIDをDBから物理削除
    const deleteIds = currentDbTerms
      .map((t) => t.id)
      .filter((id) => id !== undefined && !currentIds.includes(id)) as number[];

    await db.terms.bulkDelete(deleteIds);

    // クリーンアップ
    const affectedProducts = await db.products
        .where("terms.category")
        .anyOf(deleteIds)
        .toArray();

      if (affectedProducts.length > 0) {
        await db.transaction("rw", db.products, async () => {
          for (const product of affectedProducts) {
            // 削除されたIDを除去
            const newCategoryIds = product.terms.category.filter(
              id => !deleteIds.includes(id)
            );
            
            // 商品データを更新
            await db.products.update(product.id!, {
              "terms.category": newCategoryIds
            });
          }
        });
      }

    // 3. 現在のリストをソート順通りに保存（bulkPutはIDがあれば更新、なければ追加）
    const updateData = categories.value.map((cat, index) => ({
      id: cat.id,
      name: cat.name,
      taxonomy: cat.taxonomy,
      sortOrder: index, // 並び順を現在のインデックスで確定
    }));

    await db.terms.bulkPut(updateData);

    // 再ロードして最新状態にする
    const terms = await db.terms
      .where("taxonomy")
      .equals("category")
      .sortBy("sortOrder");
    categories.value = terms;

    gtmTrackEvent("save_category")
    popped("保存が完了しました");
  } catch (err) {
    console.error(err);
    gtmTrackError("save_category")
    await openDialog("保存に失敗しました。再読込してください。");
  } finally {
    isSaving.value = false;
  }
};
</script>
<template>
  <div class="container page-container">
    <h1 class="page-title">
      <i-octicon-file-directory-24 /> {{ route.meta.title }}
    </h1>
    <div class="pagination">
      <router-link to="/admin">
        <i-octicon-arrow-left-16 />
        頒布物登録
      </router-link>
    </div>
    <section class="add-category">
      <h3>カテゴリーを追加</h3>
      <input
        type="text"
        v-model="newCategoryName"
        placeholder="例：漫画、グッズ"
        @keypress.enter="addNewCategory"
      />
      <button class="btn" @click="addNewCategory" :disabled="!newCategoryName">
        追加
      </button>
    </section>
    <draggable
      v-model="categories"
      :item-key="item => item.id ?? item.tempId"
      handle=".drag-handle"
      tag="ul"
      class="category-list"
    >
      <template #item="{ element, index }">
        <li class="category-list__item">
          <div class="drag-handle">
            <i-octicon-grabber-16 />
          </div>
          <div class="category-list__name">
            <input v-model="element.name" type="text" class="inline-edit" />
          </div>
          <button
            class="btn btn-remove-item"
            aria-label="削除"
            @click="removeCategory(index)"
          >
            <i-octicon-trash-24 />
          </button>
        </li>
      </template>
    </draggable>
  </div>
  <div class="page-control product-admin-control">
    <button @click="saveCategories" class="btn btn-save" :disabled="isSaving">
      変更を保存する
    </button>
  </div>
</template>
