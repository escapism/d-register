<script setup lang="ts">
import { useRoute } from 'vue-router';
import ImportantNotice from "@/components/ImportantNotice.vue"
const router = useRoute()
</script>
<template>
  <div class="container page-container">
    <h1 class="page-title"><i-octicon-info-24 /> {{ router.meta.title }}</h1>
    <p>「Dレジ」は、主に同人誌即売会での利用を想定したレジアプリです。</p>
    <p>データはすべてデバイス上に保存されるので、サーバーとの通信を必要としません。<br>
      一度読み込んでおけば、オフラインでも動くため、電波の悪い会場でも使用できます。</p>
    <p>操作方法については、こちらの<a href="https://github.com/escapism/d-register/wiki" target="_blank" rel="noopener noreferrer">オンラインマニュアル</a>をご覧ください。</p>
    <p class="note">大量の頒布物情報を編集したいときは、専用ツール「<a href="https://escapism.github.io/d-regi-editor/" target="_blank" rel="noopener">Dレジエディター</a>」をご利用ください（パソコン・タブレット推奨）。</p>
    <ImportantNotice />
    <p>ご意見・ご要望等あれば、作者<a href="https://x.com/escapist_uco" target="_blank" rel="noopener noreferrer">X (Twitter)</a>か<a href="https://marshmallow-qa.com/escapist_uco" target="_blank" rel="noopener noreferrer">マシュマロ</a>までお願いします。</p>
      <p>実際に使ってみて良いと思ったら、是非お隣の人にもすすめてください。以下のQRコードからアクセスできます。</p>
      <div class="qr"><img src="@/assets/qr.svg" alt="" title="QRコード"></div>
  </div>
</template>