<script setup lang="ts">
import type { Term } from "@/db";
import { gtmTrackEvent } from "@/utils/gtm.ts";

const props = defineProps<{
  modelValue: number | "all";
  categories: Term[];
  disabled?: boolean;
  slug?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number | "all"): void;
}>();

const handleChange = (event) => {
  emit(
    "update:modelValue",
    (event.target as HTMLSelectElement).value === "all"
      ? "all"
      : Number((event.target as HTMLSelectElement).value),
  );
  if (props.slug && !props.disabled) {
    gtmTrackEvent("change_category_" + props.slug)
  }
};

const handleClear = () => {
  emit('update:modelValue', 'all')
  if (props.slug) {
    gtmTrackEvent("clear_category_" + props.slug)
  }
};
</script>

<template>
  <div class="filter-group">
    <i-octicon-file-directory-24 aria-label="カテゴリー" />
    <select
      :value="modelValue"
      @change="handleChange"
      :disabled="disabled"
      :class="{ 'is-disabled': disabled }"
    >
      <option value="all">すべてのカテゴリー</option>
      <option v-for="cat in categories" :key="cat.id" :value="cat.id">
        {{ cat.name }}
      </option>
    </select>
    <button
      aria-label="絞り込み解除"
      @click="handleClear"
      :disabled="modelValue === 'all'"
    >
      <i-octicon-x-24 />
    </button>
  </div>
</template>
