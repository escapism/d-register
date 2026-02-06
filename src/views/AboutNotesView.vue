<script setup lang="ts">
if (!localStorage.getItem("confirmed")) {
  localStorage.setItem("confirmed", "1");
}
</script>
<template>
  <div class="container page-container">
    <h1 class="page-title"><i-octicon-alert-24 /> ご利用上の注意</h1>
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
      <h2>💾 バックアップ推奨</h2>
      <p>ブラウザのキャッシュクリアや履歴の削除、デバイスのストレージ不足などでデータが消去される可能性があります。</p>
      <p>「<router-link to="/admin">頒布物登録</router-link>」や「<router-link to="/settings">設定</router-link>」からデータのエクスポートを行い、バックアップを取るようにしてください。</p>
      <p></p>
    </section>
    <section>
      <h2>📈 アクセス解析</h2>
      <p>このアプリでは、利用状況の把握のため、Google Analytics を使用してアクセスログを収集しています。これはアプリ内のデータや個人を特定できるような情報は含みません。</p>
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