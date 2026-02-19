<script setup lang="ts">
import { ref, computed, inject, watch, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { db, type Term } from "@/db";
import draggable from "vuedraggable";
import { gtmTrackEvent, gtmTrackError } from "@/utils/gtm.ts";
import { TAXONOMY_DEFINITIONS, type TaxonomyName } from "@/const/taxonomy";
import { fetchTerms } from "@/composables/useTerms";
import { addTerm } from "@/utils/termHelper";

const route = useRoute();
const terms = ref<Term[]>([]);
const taxonomy = computed(() => route.params.tax as TaxonomyName);
const definition = computed(() => TAXONOMY_DEFINITIONS[taxonomy.value]);

const openDialog = inject("globalDialog");
const popped = inject("globalPopup");

const newTermName = ref("");

// データの読み込み
const loadData = async () => {
  terms.value = (await fetchTerms(taxonomy.value)).map(term => {
    return {
      ...term,
      current_name: term.name
    }
  })
  newTermName.value = ""
};

// URLパラメータが変わったら再読み込み
watch(() => route.params.tax, loadData, { immediate: true });

// <title>を動的に変更
watchEffect(() => {
  const title = `${definition.value.label}管理`;
  document.title = title;
});

// 項目の追加
const handleAddTerm = async (event?: KeyboardEvent) => {
  // IME変換中のEnterキー入力を無視する
  if (event && event.isComposing) return;

  const name = newTermName.value.trim()
  if (!name) return;

  // 重複チェック
  const id = await addTerm(taxonomy.value, name, terms.value.length);
  if (id.id) {
    await openDialog(`その${definition.value.label}名は既に登録されています`);
    return;
  } else if (id === -1) {
    await openDialog("保存に失敗しました。再読込してください。");
  } else {
    terms.value.push({ id, name: name, taxonomy: taxonomy.value, sortOrder: terms.value.length, current_name: name } as Term);
    newTermName.value = ""
    gtmTrackEvent("add_" + taxonomy.value);
  }
};

// 並び替えの保存
const saveOrder = async () => {
  const updates = terms.value.map((term, index) => {
    term.sortOrder = index;
    return db.terms.update(term.id!, { sortOrder: index });
  });
  await Promise.all(updates);
};

// 名前の更新
const updateName = async (term: Term, event?: KeyboardEvent) => {
  // IME変換中のEnterキー入力を無視する
  if (event && event.isComposing) return;

  const newName = term.name.trim();
  if (!newName) return;

  // 自身以外の同名タームをチェック
  const exists = await db.terms
    .where({ taxonomy: taxonomy.value, name: newName })
    .filter(t => t.id !== term.id)
    .count();
  
  if (exists > 0) {
    openDialog(`その${definition.value.label}名は既に登録されています`);
    term.name = term.current_name
    return;
  }

  try {
    await db.terms.update(term.id!, { name: newName });
    term.current_name = term.name
    gtmTrackEvent("change_" + taxonomy.value + "_name");
    popped("更新しました");
  } catch (err) {
    console.error(err);
    gtmTrackError("change_" + taxonomy.value + "_name");
    await openDialog("保存に失敗しました。再読込してください。");
  }
};

// 項目の削除
const deleteTerm = async (id: number) => {
  if (
    !(await openDialog({
      message: "この項目を削除してもよろしいですか？",
      type: "confirm",
    }))
  )
    return;

  try {
    await db.transaction("rw", db.terms, db.products, async () => {
      // ターム削除
      await db.terms.delete(id);

      // 該当するIDを配列に持っている商品を抽出
      const productsToUpdate = await db.products
        .filter((p) => p.terms?.[taxonomy.value]?.includes(id))
        .toArray();

      if (productsToUpdate.length) {
        // 各商品の配列から該当IDを除去して更新
        const updatePromises = productsToUpdate.map((p) => {
          const newTermIds = p.terms[taxonomy.value].filter(
            (termId: number) => termId !== id,
          );
          return db.products.update(p.id!, {
            [`terms.${taxonomy.value}`]: newTermIds,
          });
        });

        await Promise.all(updatePromises);
      }
    });

    // リストを更新
    terms.value = terms.value.filter((t) => t.id !== id);
    gtmTrackEvent("delete_" + taxonomy.value);
    popped("削除しました");
  } catch (err) {
    console.error(err);
    gtmTrackError("delete_" + taxonomy.value);
    await openDialog("削除に失敗しました。");
  }
};

const ariaCurrent = computed(() => (tax) => {
  return route.params.tax === tax ? "page": false
})
</script>
<template>
  <div class="container page-container">
    <h1 class="page-title">
      <component :is="definition.icon" />{{ definition.label }}管理
    </h1>
    <div class="pagination">
      <router-link to="/admin">
        <i-octicon-arrow-left-16 />
        頒布物登録
      </router-link>
    </div>
    <ul class="sub-menu">
      <li>
        <router-link to="/admin/terms/category" :aria-current="ariaCurrent('category')">
          <i-octicon-chevron-right-24 /> カテゴリー管理
        </router-link>
      </li>
      <li>
        <router-link to="/admin/terms/genre" :aria-current="ariaCurrent('genre')">
          <i-octicon-chevron-right-24 /> ジャンル管理
        </router-link>
      </li>
    </ul>
    <section class="add-term">
      <h3>{{ definition.label }}を追加</h3>
      <input
        type="text"
        v-model="newTermName"
        :placeholder="definition.placeholder"
        @keydown.enter="handleAddTerm($event)"
      />
      <button class="btn" @click="handleAddTerm" :disabled="!newTermName.trim()">
        追加
      </button>
    </section>
    <draggable
      v-model="terms"
      item-key="id"
      handle=".drag-handle"
      @end="saveOrder"
      tag="ul"
      class="term-list"
    >
      <template #item="{ element }">
        <li class="term-list-item">
          <div class="drag-handle">
            <i-octicon-grabber-16 />
          </div>
          <div class="term-list-name">
            <input
              v-model="element.name"
              @keydown.enter="updateName(element, $event)"
              type="text"
            />
          </div>
          <button
            @click="updateName(element)"
            class="btn btn-update"
            :disabled="!element.name.trim()"
            :title="definition.label + '名を更新'"
          >
            更新
          </button>
          <button
            class="btn btn-remove-item"
            aria-label="削除"
            @click="deleteTerm(element.id)"
          >
            <i-octicon-trash-24 />
          </button>
        </li>
      </template>
    </draggable>
  </div>
</template>
