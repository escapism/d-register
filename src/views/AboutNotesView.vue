<script setup lang="ts">
import { useRoute } from 'vue-router';
const router = useRoute()

if (!localStorage.getItem("confirmed")) {
  localStorage.setItem("confirmed", "1");
}
</script>
<template>
  <div class="container page-container about-container">
    <h1 class="page-title"><i-octicon-alert-24 /> {{ router.meta.title }}</h1>
    <p>このアプリを利用するにあたって、あらかじめ「ホーム画面に追加」や「アプリのインストール」を行うことをおすすめします。</p>

      <ul class="haw-to-install">
        <li>iOS Safari：「共有」ボタンから「ホーム画面に追加」（iOS 26移行なら「Webアプリとして開く」にチェック）。</li>
        <li>Android Chrome：メニューから「ホーム画面に追加」で「インストール」を選択。</li>
      </ul>

    <p>「シークレットモード」や「プライベートブラウズ」など、履歴を残さないモードではデータが保存されません。必ず通常モードで利用してください。</p>
    <section>
      <h2>🍎 Appleユーザーの方へ</h2>
      <p>iPhoneとiPadのブラウザ、およびMac Safariは、このアプリで利用しているIndexedDBに制約があり、7日間程度利用がないとデータが削除される可能性があります。</p>
      <p>後述の通り、即売会終了後にはデータのバックアップを行ってください。</p>
      <p>また、ブラウザから開いた場合と、ホーム画面に追加した場合とで、データが別扱いになります。</p>
    </section>
    <section>
      <h2>🤖 Androidユーザーの方へ</h2>
      <p>Androidではブラウザとホーム画面に追加した場合とで、データは共通です。ただし、ブラウザ毎に別データとなります。</p>
      <p>エクスポートしたJSONファイルをDropboxに保存した場合、インポートから選択できない不具合を確認しています。その場合は別のストレージに移してインポートしてください。</p>
    </section>
    <section>
      <h2>💾 バックアップ推奨</h2>
      <p>ブラウザのキャッシュクリアや履歴の削除、デバイスのストレージ不足などでデータが消去される可能性があります。</p>
      <p>「<router-link to="/admin">頒布物登録</router-link>」や「<router-link to="/settings">設定</router-link>」からデータのエクスポートを行い、バックアップを取るようにしてください。</p>
      <p>頒布物登録からのエクスポート・インポートは頒布物情報のみです。また、インポートしても保存ボタンを押すまでは保存されません。<br>
        <small>※頒布物登録から設定を含むJSONをインポートした場合も、頒布物情報だけを読み込みます。</small>
      </p>
      <p>設定からのエクスポート・インポートは売上情報を除いたすべてのデータです（オプションで売上も含めることができます）。<br>
        <strong>インポートしたデータは即座に保存されるため、注意してください。</strong><br>
        <small>※設定から頒布物情報のみのJSONをインポートすると、頒布物情報以外のデータはリセットされます。</small></p>
    </section>
    <section>
      <h2>💰️ 売上データについて</h2>
      <p>売上情報はデータ量が大きくなりがちなので、イベント終了後はCSVをダウンロードしてからの削除をおすすめします。</p>
    </section>
    <section>
      <h2>🔧 専用ツール</h2>
      <p>パソコンなどの大きな画面で一括で頒布物を編集したい方のために、外部ツール「<a href="https://escapism.github.io/d-regi-editor/" target="_blank">Dレジエディター</a>」を用意しています。</p>
      <p>一から頒布物情報を作成、またはエクスポートしたJSONファイルを読み込んで、表計算ライクな画面で編集ができます。</p>
    </section>
    <section>
      <h2>📈 アクセス解析</h2>
      <p>このアプリでは、利用状況の把握のため、Google Analytics を使用して情報の収集・分析を行っています。これらの情報には、アプリ内に保存されたデータや、個人を特定できるような情報は一切含みません。</p>
    </section>
    <section>
      <h2>⚖️ 免責事項</h2>
      <p>
        本アプリの利用により発生した損害について、開発者は一切の責任を負いません。必ず事前にテスト入力を行い、動作を確認した上で自己責任においてご利用ください。
      </p>
    </section>
    <div class="back-link">
      <router-link to="/about">
        <i-octicon-reply-16 />
        このアプリについて
      </router-link>
    </div>
  </div>
</template>