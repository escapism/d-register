<script setup lang="ts">
import { ref, useTemplateRef, nextTick } from "vue";

const props = defineProps<{
  showCheckoutDialog?: Boolean
}>();

const okBtn = useTemplateRef("okBtn");
const isOpen = ref(false);
let resolvePromise: Function;

const eraNameFormatter = new Intl.DateTimeFormat("ja-JP-u-ca-japanese", {
  era: "short",
  year: "numeric",
});

const show = () => {
  isOpen.value = true;

  // DOMが更新された後にフォーカスを当てる
  nextTick(() => {
    okBtn.value?.focus();
  });

  return new Promise((res) => {
    resolvePromise = res;
  });
};

const handleOk = () => {
  isOpen.value = false;
  resolvePromise(1);
};

const handleCancel = () => {
  isOpen.value = false;
  resolvePromise(0);
};

const handleClear = () => {
  isOpen.value = false;
  resolvePromise(-1);
}

const getBirthday = () => {
  const today = new Date();
  const birthyear = today.getFullYear() - 18;

  const eraName = eraNameFormatter.format(
    new Date(birthyear, today.getMonth(), today.getDate()),
  );
  return `${eraName}(${birthyear}年) ${today.getMonth() + 1}月 ${today.getDate()}日`;
};

defineExpose({ show });
</script>
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-show="isOpen" class="dialog-overlay" @click.self="handleCancel">
        <div role="dialog" class="confirm-dialog age-valification-dialog">
          <p>
            ⚠️18禁アイテムが含まれています。<br />年齢確認を行ってください。
          </p>
          <div class="birthday-check">{{ getBirthday() }} 生まで</div>
          <div class="button-area">
            <button @click="handleClear" class="btn btn-cancel">
              クリア
            </button>
            <button @click="handleCancel" class="btn btn-cancel">
              キャンセル
            </button>
            <button @click="handleOk" class="btn btn-confirm" ref="okBtn">
              {{ showCheckoutDialog ? "OK" : "確定" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
