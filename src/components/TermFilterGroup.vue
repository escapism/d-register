<script setup lang="ts">
import { computed } from "vue";
import type { Term } from "@/db";
import TermFilter from "./TermFilter.vue";
import { gtmTrackEvent } from "@/utils/gtm.ts";

const props = defineProps<{
  // 各タクソノミーの選択状態（親から v-model で受け取る）
  activeCategory: number | "all";
  activeGenre: number | "all";
  // マスターデータ
  categories: Term[];
  genres: Term[];
  disabled?: boolean;
  slug?: string;
}>();

const emit = defineEmits<{
  "update:activeCategory": [value: number | "all"];
  "update:activeGenre": [value: number | "all"];
}>();

const isDisabled = computed(() => {
  return ![props.activeCategory, props.activeGenre].some(val => val !== "all");
})

// 全て解除する処理
const clearAll = () => {
  emit("update:activeCategory", "all");
  emit("update:activeGenre", "all");

  if (props.slug) {
    gtmTrackEvent("clear_filter_" + props.slug)
  }
};
</script>

<template>
  <div class="filter-block" :class="{ [slug + '-filter']: slug }">
    <div class="filter-container">
      <TermFilter
        v-if="categories.length"
        :model-value="activeCategory"
        @update:model-value="emit('update:activeCategory', $event)"
        :terms="categories"
        taxonomy="category"
        :disabled="disabled"
        :slug="slug"
      />

      <TermFilter
        v-if="genres.length"
        :model-value="activeGenre"
        @update:model-value="emit('update:activeGenre', $event)"
        :terms="genres"
        taxonomy="genre"
        :disabled="disabled"
        :slug="slug"
      />
    </div>

    <button
      class="clear-filter"
      aria-label="絞り込み解除"
      @click="clearAll"
      :disabled="isDisabled"
    >
      <i-octicon-x-24 />
    </button>
  </div>
</template>
