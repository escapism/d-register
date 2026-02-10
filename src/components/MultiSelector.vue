<script setup lang="ts">
import { ref, computed } from "vue";

// 汎用的な選択肢の型
interface SelectOption {
  id: number | string;
  name: string;
}

const props = defineProps<{
  modelValue: (number | string)[]; // 選択されたIDの配列
  options: SelectOption[]; // 選択肢のリスト
  placeholder?: string; // 未選択時の表示
  label?: string; // ダイアログ内のタイトル
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: (number | string)[]): void;
}>();

const active = ref(false);

// 選択されている名前をカンマ区切りで抽出
const selectedNames = computed(() => {
  return (
    props.modelValue
      .map((id) => props.options.find((opt) => opt.id === id)?.name)
      .filter(Boolean)
      .join(", ") ||
    props.placeholder ||
    "未選択"
  );
});

const togglePanel = () => (active.value = !active.value);
const closePanel = () => (active.value = false);

// チェックボックス操作時の処理
const handleCheck = (id: number | string, checked: boolean) => {
  const newValue = [...props.modelValue];
  if (checked) {
    if (!newValue.includes(id)) newValue.push(id);
  } else {
    const index = newValue.indexOf(id);
    if (index > -1) newValue.splice(index, 1);
  }
  
  // options の並び順に従ってソート
  const orderMap = props.options.map(opt => opt.id);
  newValue.sort((a, b) => {
    return orderMap.indexOf(a) - orderMap.indexOf(b);
  });

  emit("update:modelValue", newValue);
};
</script>

<template>
  <div class="multi-selector">
    <div
      class="selector-trigger"
      @click="togglePanel"
      :class="{ 'is-active': active }"
    >
      <input
        type="text"
        :value="selectedNames"
        readonly
        :placeholder="placeholder"
        :class="{ 'is-empty': !modelValue.length }"
      />
    </div>

    <Teleport to="body" :disabled="false">
      <div v-show="active" class="dialog-overlay" @click.self="closePanel">
        <div role="dialog" class="confirm-dialog" tabindex="-1">
          <h3 class="panel-header">{{ label || "項目を選択" }}</h3>
          <div class="panel-body">
            <ul class="option-list">
              <li v-for="opt in options" :key="opt.id">
                <label>
                  <input
                    type="checkbox"
                    :checked="modelValue.includes(opt.id)"
                    @change="
                      (e) =>
                        handleCheck(
                          opt.id,
                          (e.target as HTMLInputElement).checked,
                        )
                    "
                  />
                  <span class="option-check"><i-octicon-check-16 /></span>
                  <span class="option-name">{{ opt.name }}</span>
                </label>
              </li>
            </ul>
            <div v-if="options.length === 0" class="empty-msg">
              選択肢がありません
            </div>
            <div class="buttons">
              <button @click="closePanel" class="btn btn-close">確定</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>