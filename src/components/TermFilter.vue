<script setup lang="ts">
import type { Term } from "@/db";
import { gtmTrackEvent } from "@/utils/gtm.ts";
import { TAXONOMY_DEFINITIONS, type TaxonomyName } from "@/const/taxonomy";

const props = defineProps<{
  modelValue: number | "all";
  taxonomy: TaxonomyName;
  terms: Term[];
  disabled?: boolean;
  slug?: string;
}>();

const taxName = TAXONOMY_DEFINITIONS[props.taxonomy].label;
const icon = TAXONOMY_DEFINITIONS[props.taxonomy].icon;

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
    gtmTrackEvent(`change_${props.taxonomy}_${props.slug}`);
  }
};
</script>

<template>
  <div class="filter" :class="{ 'is-disabled': disabled }">
    <component :is="icon" :aria-label="taxName" />
    <select :value="modelValue" @change="handleChange" :disabled="disabled">
      <option value="all">すべての{{ taxName }}</option>
      <option v-for="term in terms" :key="term.id" :value="term.id">
        {{ term.name }}
      </option>
    </select>
  </div>
</template>
