<script setup lang="ts">
import { ref, useTemplateRef, watch, onMounted } from "vue";

const popup = useTemplateRef("popup");
const popupText = ref<String>();
const active = ref(false);
let popupTimer : number | undefined = undefined;

onMounted(() => {
  popup.value.addEventListener("transitionend", (e) => {
    if (e.propertyName !== "height") return;

    if (active.value) {
      clearTimeout(popupTimer);
      popupTimer = setTimeout(() => {
        active.value = false;
      }, 500);
    } else {
      popupText.value = ""
    }
  });
});

const show = (message : string) => {
  popupText.value = message
  active.value = true;
}

defineExpose({ show });
</script>
<template>
  <div
    ref="popup"
    class="popup"
    :class="{ 'is-active': active }"
    aria-live="polite"
    aria-atomic="true"
  >
    {{ popupText }}
  </div>
</template>
