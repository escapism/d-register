<script setup lang="ts">
import { useTemplateRef, provide } from "vue";
import { useObservable } from "@vueuse/rxjs";
import { liveQuery } from "dexie";
import { db } from "@/db";
import Header from "@/components/Header.vue";
import Popup from "@/components/Popup.vue";
import Loader from "./components/Loader.vue";
import CustomDialog from "./components/CustomDialog.vue";

const dialog = useTemplateRef("dialog")
const popup = useTemplateRef("popup")
const loader = useTemplateRef("loader")

// 設定テーブルからサークル名を取得（デフォルトは "名称未設定"）
const circleName : string = useObservable(
  liveQuery(async () => {
    const opt = await db.options.get("circleName");
    return opt ? opt.value : "名称未設定サークル";
  }),
);

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
  <Header :circleName="circleName" />
  <main>
    <router-view />
  </main>
  <CustomDialog ref="dialog" />
  <Popup ref="popup" />
  <Loader ref="loader" />
</template>
