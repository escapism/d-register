<script setup lang="ts">
import { ref, useTemplateRef, computed, nextTick, watch } from "vue";

interface OrderSummaryItem {
  title: string;
  count: number;
}

const props = defineProps<{
  modelValue: boolean; // 開閉状態
  orderSummary: OrderSummaryItem[];
  totalPrice: number;
  showCalculator: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "confirm"): void;
  (e: "clear"): void;
  (e: "cancel"): void;
}>();

const dialog = useTemplateRef("dialog");
const confirmBtn = useTemplateRef("confirmBtn");
const receivedAmount = ref<number | null>(null);

// お釣りの計算
const changeAmount = computed(() => {
  if (receivedAmount.value === null) return 0;
  return receivedAmount.value - props.totalPrice;
});

// ダイアログが開いた時の処理
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      receivedAmount.value = null;
      nextTick(() => {
        confirmBtn.value?.focus();
        dialog.value?.scrollTo(0, 0);
      });
    }
  },
);

const close = (type: "cancel" | "clear" | "confirm") => {
  emit("update:modelValue", false);
  emit(type);
};

const addAmount = (num: number) => {
  receivedAmount.value = (receivedAmount.value || 0) + num;
};
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-show="modelValue"
        class="dialog-overlay"
        @click.self="close('cancel')"
      >
        <div role="dialog" class="confirm-dialog" ref="dialog">
          <div class="dialog-content">
            <h2>注文内容の確認</h2>

            <ul class="summary-list">
              <li v-for="item in orderSummary" :key="item.title">
                <span class="summary-title">{{ item.title }}</span>
                <span class="summary-count">× {{ item.count }}</span>
              </li>
            </ul>

            <div class="summary-total">
              合計: <strong>{{ totalPrice.toLocaleString() }}円</strong>
            </div>

            <div class="calculator" v-if="showCalculator">
              <div class="received-display">
                <span>お預かり：</span>
                <div class="input-with-unit">
                  <input
                    type="number"
                    v-model.number="receivedAmount"
                    inputmode="numeric"
                    @focus="$event.target.select()"
                  />
                  <span>円</span>
                </div>
                <button class="clear-btn" @click="receivedAmount = null">
                  <i-octicon-x-circle-fill-16 />
                </button>
              </div>

              <div class="quick-buttons">
                <button
                  v-for="val in [100, 500, 1000, 5000, 10000]"
                  :key="val"
                  @click="addAmount(val)"
                  class="btn"
                >
                  +{{ val.toLocaleString() }}
                </button>
              </div>

              <div
                class="change-display"
                :class="{
                  'has-change': changeAmount > 0,
                  'not-enough': changeAmount < 0,
                }"
              >
                <span>お釣り：</span>
                <strong>{{ changeAmount.toLocaleString() }}円</strong>
              </div>
            </div>

            <div class="button-area">
              <button @click="close('clear')" class="btn btn-cancel">
                クリア
              </button>
              <button @click="close('cancel')" class="btn btn-cancel">
                キャンセル
              </button>
              <button
                @click="close('confirm')"
                class="btn btn-confirm"
                ref="confirmBtn"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
