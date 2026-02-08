<script setup lang="ts">
import { useTemplateRef, provide } from "vue";
import Header from "@/components/Header.vue";
import Popup from "@/components/Popup.vue";
import Loader from "./components/Loader.vue";
import CustomDialog from "./components/CustomDialog.vue";

const dialog = useTemplateRef("dialog")
const popup = useTemplateRef("popup")
const loader = useTemplateRef("loader")

const openDialog = async (opts : object | undefined) => {
  if (!dialog.value) return false;
  return await dialog.value.show(opts);
}

const popped = (text: string) => {
  if (!popup.value) return
  popup.value.show(text)
};

const toggleLoader = (isLoading : boolean) => {
  if (!loader.value) return
  loader.value.show(isLoading)
}

provide('globalDialog', openDialog);
provide('globalPopup', popped);
provide('globalLoader', toggleLoader);
</script>

<template>
  <Header />
  <main>
    <router-view />
  </main>
  <CustomDialog ref="dialog" />
  <Popup ref="popup" />
  <Loader ref="loader" />
</template>
