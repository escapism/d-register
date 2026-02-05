<script setup lang="ts">
import { ref } from "vue";

const isActive = ref(false)

const show = (val : boolean) => {
  isActive.value = val
};

defineExpose({ show });
</script>
<template>
  <div
    class="overlay full"
    aria-hidden="true"
    :class="{ 'is-active': isActive }"
  >
    <div class="loader">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  </div>
</template>
