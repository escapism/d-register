
<script setup lang="ts">
import { ref, useTemplateRef, nextTick } from "vue";

const okBtn = useTemplateRef("okBtn");

const isOpen = ref(false);
const message = ref("");
const type = ref("alert"); // 'alert' or 'confirm'
let resolvePromise;

const show = (opts: object | string) => {
  if (typeof opts === "string") {
    message.value = opts;
    type.value = "alert";
  } else {
    message.value = opts?.message || "";
    type.value = opts?.type || "alert";
  }
  isOpen.value = true;

  // DOMが更新された後にフォーカスを当てる
  nextTick(() => {
    if (okBtn.value) {
      okBtn.value.focus();
    }
  });

  return new Promise((res) => {
    resolvePromise = res;
  });
};

const handleOk = () => {
  isOpen.value = false;
  resolvePromise(true);
};

const handleCancel = () => {
  isOpen.value = false;
  resolvePromise(false);
};

// 外部から呼べるように公開
defineExpose({ show });
</script>
<template>
  <Transition name="fade">
    <div v-if="isOpen" class="dialog-overlay alert-overlay" @click.self="handleCancel">
      <div
        class="alert-dialog"
        role="alertdialog"
        aria-modal="true"
        tabindex="-1"
      >
        <div class="dialog-content">
          <p>
            <strong>{{ message }}</strong>
          </p>
        </div>
        <div class="dialog-actions">
          <button
            v-if="type === 'confirm'"
            @click="handleCancel"
          >
            キャンセル
          </button>
          <button ref="okBtn" @click="handleOk" class="dialog-ok">OK</button>
        </div>
      </div>
    </div>
  </Transition>
</template>