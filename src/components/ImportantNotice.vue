<script setup lang="ts">
import { gtmTrackEvent } from "@/utils/gtm.ts";

const props = defineProps({
  first: {
    type: Boolean,
    default: false,
  }
})
</script>
<template>
  <section class="important-notice-box">
      <h3><strong>⚠️ 初めてご利用になる方へ</strong></h3>
      <p>
        使用前に必ず<router-link
          to="/about/notes"
          @click="props.first && gtmTrackEvent('first_confirm')"
          >「ご利用上の注意」</router-link
        >をご確認ください。
      </p>
    </section>
</template>