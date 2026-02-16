<script setup lang="ts">
import { ref, onBeforeMount, computed, inject } from "vue";
import { useRoute } from 'vue-router';
import { db } from "@/db";
import { gtmTrackEvent, gtmTrackError } from "@/utils/gtm.ts";

const router = useRoute()
const openDialog = inject("globalDialog");
const sales = ref<any[]>([]);

const loadSales = async () => {
  sales.value = await db.sales.toArray();
};

onBeforeMount(loadSales);

// 精算IDごとにグループ化（新しい順）
const historyGroups = computed(() => {
  const groups: Record<string, any> = {};
  sales.value.forEach((s) => {
    const id = s.transactionId || "Unknown";
    if (!groups[id]) {
      groups[id] = { id, timestamp: s.timestamp, items: [], total: 0 };
    }
    groups[id].items.push(s);
    groups[id].total += s.priceAtSale * s.quantity;
  });
  // ULIDでソート
  return Object.values(groups).sort((a: any, b: any) => {
    return b.id.localeCompare(a.id);
  });
});

// 取消処理
const voidTransaction = async (tx: any) => {
  const message = `精算ID: ${tx.id}\n合計: ${tx.total}円\n\nこの売上を取り消し、在庫を戻しますか？`;
  if (!(await openDialog({ message, type: "confirm" }))) return;

  try {
    await db.transaction("rw", [db.products, db.sales], async () => {
      for (const sale of tx.items) {
        const p = await db.products.get(sale.productId);
        if (p) {
          await db.products.update(p.id, {
            stock: p.infiniteStock ? p.stock : p.stock + sale.quantity,
            totalSalesAmount:
              p.totalSalesAmount - sale.priceAtSale * sale.quantity,
          });
        }
      }
      // salesテーブルからこの transactionId のレコードを削除
      await db.sales.where("transactionId").equals(tx.id).delete();
    });

    gtmTrackEvent("void_transaction")
    await openDialog("取り消しました。");
    await loadSales();
  } catch (e) {
    gtmTrackError("void_transaction")
    await openDialog("エラーが発生しました。");
  }
};
</script>

<template>
  <div class="container page-container">
    <h1 class="page-title"><i-octicon-history-24 /> {{ router.meta.title }}</h1>
    <p class="description">
      直近の精算から順に表示しています。ミスがあった場合は「取消」ボタンで在庫を戻せます。
    </p>

    <div class="history-list">
      <div v-for="tx in historyGroups" :key="tx.id" class="history-card">
        <div class="history-header">
          <span class="tx-id" :title="tx.id">ID: ...{{ tx.id.slice(-8) }}</span>
          <span class="tx-time">{{
            new Date(tx.timestamp).toLocaleString("ja-JP")
          }}</span>
          <button @click="voidTransaction(tx)" class="btn btn-void">
            この精算を取消
          </button>
        </div>
        <ul class="tx-items">
          <li v-for="item in tx.items" :key="item.id">
            <template v-if="item.productTitle">{{ item.productTitle }}</template>
            <span v-else class="untitled">名称未設定</span> × {{ item.quantity }}
          </li>
        </ul>
        <div class="tx-footer">計 {{ tx.total.toLocaleString("ja-JP") }}円</div>
      </div>
    </div>
    <div class="back-link">
      <router-link to="/sales">
        <i-octicon-reply-16 />
        売上確認に戻る
      </router-link>
    </div>
  </div>
</template>
