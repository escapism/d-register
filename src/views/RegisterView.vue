<script setup lang="ts">
import { ref, useTemplateRef, watch, onMounted, computed, inject, reactive } from "vue";
import { liveQuery } from "dexie";
import { useObservable } from "@vueuse/rxjs";
import { db, type Term } from "@/db";
import { ulid } from "ulid";
import { gtmTrackEvent, gtmTrackError } from "@/utils/gtm.ts";
import ProductRegisterItem from "@/components/ProductRegisterItem.vue";
import ImportantNotice from "@/components/ImportantNotice.vue"
import ProductFilter from "@/components/ProductFilter.vue";
import CheckoutDialog from "@/components/CheckoutDialog.vue";
import AgeVerificationDialog from "@/components/AgeVerificationDialog.vue";
import { SETTING_SCHEMA } from "@/const/setting";

const openDialog = inject("globalDialog");
const popped = inject("globalPopup");
const verificationDialog = useTemplateRef("verificationDialog");

// DBから商品をリアルタイム取得
const products = useObservable(
  liveQuery(() => db.products.where("hidden").equals(0).sortBy("sortOrder")),
  [],
);
const allCategories = ref<Term[]>([]);
const activeCategoryId = ref<number | "all">("all"); // カテゴリー選択状態
const order = ref<number[]>([]);

// 設定値
const settings = reactive<Record<string, any>>({});

// スキーマからデフォルト値を初期セット
SETTING_SCHEMA.forEach(s => {
  settings[s.key] = s.default;
});

const existsProduct = ref<boolean>(true);
const hasOrder = ref<boolean>(false);

const isOpenCheckoutDialog = ref(false);
const orderSummary = ref<{ title: string; count: number }[]>([]);

const confirmed = ref(localStorage.getItem("confirmed"));

onMounted(async () => {
  allCategories.value = await db.terms
    .where("taxonomy")
    .equals("category")
    .sortBy("sortOrder");

  // 設定取得
  const allOpts = await db.options.toArray();
  const optMap = Object.fromEntries(allOpts.map((o) => [o.key, o.value]));

  // DBの値があるものは上書き
  SETTING_SCHEMA.forEach(s => {
    if (optMap[s.key] !== undefined) {
      settings[s.key] = optMap[s.key];
    }
  });
});

// 商品リストが読み込まれたら注文用配列を初期化
watch(
  products,
  async (newProducts) => {
    if (!newProducts) return;

    if (order.value.length === 0) {
      order.value = new Array(newProducts.length).fill(0);
    }
    existsProduct.value = !!newProducts.length;
    if (existsProduct.value && !confirmed.value) {
      localStorage.setItem("confirmed", "1");
      confirmed.value = "1";
    }
  },
  { deep: true, immediate: true },
);

// カテゴリー絞り込み
const filteredProducts = computed(() => {
  if (activeCategoryId.value === "all") {
    return products.value;
  }
  // 数値形式の category ID と比較
  return products.value.filter((p) =>
    p.terms?.category?.includes(activeCategoryId.value as number),
  );
});

const addOrder = (index: number) => {
  if (!products.value) return;
  const item = products.value[index];
  if (item.infinite_stock) {
    order.value[index]++;
  } else {
    order.value[index] = Math.min(order.value[index] + 1, item.stock);
  }
  gtmTrackEvent("add_order");
};

const total = ref(0);

const subOrder = (index) => {
  order.value[index] = Math.max(order.value[index] - 1, 0);
  gtmTrackEvent("sub_order");
};

const zeroOrder = (index) => {
  order.value[index] = 0;
  gtmTrackEvent("zero_order");
};

const handleClear = () => {
  gtmTrackEvent("clear_total");
  clearTotal();
};

const clearTotal = () => {
  if (!hasOrder.value) return;
  order.value = new Array(products.value.length).fill(0);
};

const getTotal = () => {
  return total.value.toLocaleString("ja-JP");
};

const columns = computed(() => {
  if (settings.numCols !== 3) return
  return {
    "--columns": settings.numCols,
  };
});

watch(
  order,
  () => {
    hasOrder.value = order.value.filter((n) => n).length > 0;
    total.value = order.value.reduce(
      (acc, current, index) => acc + current * products.value[index].price,
      0,
    );
  },
  { deep: true },
);

const openCheckoutDialog = async () => {
  if (!hasOrder.value || isOpenCheckoutDialog.valie) return;

  // 注文があるものだけをサマリーに抽出
  orderSummary.value = products.value
    .map((p, i) => ({ title: p.title, count: order.value[i], r18: p.r18 }))
    .filter((item) => item.count > 0);

  // 年齢確認ロジック
  if (settings.showAgeVerification && orderSummary.value.some((i) => i.r18)) {
    const verified = await verificationDialog.value.show();
    if (verified === -1) {
      clearTotal();
      gtmTrackEvent("clear_r18");
      return;
    } else if (verified === 0) {
      gtmTrackEvent("cancel_r18");
      return;
    }
    gtmTrackEvent("valid_r18");
  }

  // 設定でダイアログを表示しない場合は即精算
  if (!settings.showCheckoutDialog) {
    executeCheckout();
    return;
  }

  isOpenCheckoutDialog.value = true;
};

const executeCheckout = async () => {
  try {
    // ULIDを生成
    const transactionId = ulid();

    await db.transaction("rw", [db.products, db.sales], async () => {
      order.value.forEach(async (quantity, index) => {
        if (!quantity) return;
        const item = products.value[index];

        // 1. 商品マスターの更新（在庫減 + 売上加算）
        await db.products.update(item.id, {
          stock: Math.max(0, item.stock - quantity),
          total_sales_amount:
            (item.total_sales_amount || 0) + item.price * quantity,
        });

        // 2. 売上明細の記録
        await db.sales.add({
          productId: item.id, // ここで紐付け！
          transactionId: transactionId,
          productTitle: item.title,
          quantity: quantity,
          priceAtSale: item.price,
          timestamp: new Date(),
        });
      });
    });

    order.value = new Array(products.value.length).fill(0);
    gtmTrackEvent("complete_checkout");
    popped("精算完了しました");
  } catch (error) {
    gtmTrackError("checkout");
    await openDialog("精算エラーが発生しました。");
  }
};
</script>

<template>
  <div class="container register-container">
    <ImportantNotice v-if="!confirmed" :first="true" />
    <div class="notice" v-else-if="!existsProduct">
      <p><router-link to="/admin">頒布物を登録</router-link>してください。</p>
    </div>
    <div
      class="register-filter"
      v-if="existsProduct && settings.enableFiltering && allCategories.length"
    >
      <ProductFilter v-model="activeCategoryId" :categories="allCategories" slug="register" />
    </div>
    <ul class="product-list" :style="columns">
      <ProductRegisterItem
        v-for="(item, index) in filteredProducts"
        :key="item.id"
        :item="item"
        :order-count="order[products.indexOf(item)] || 0"
        :show-title="!!settings.showTitle"
        :show-stock="!!settings.showStock"
        :show-soldout-items="!!settings.showSoldoutItems"
        @add="addOrder(products.indexOf(item))"
        @sub="subOrder(products.indexOf(item))"
        @zero="zeroOrder(products.indexOf(item))"
      />
    </ul>
  </div>
  <div class="page-control checkout" v-if="existsProduct">
    <div class="total">{{ getTotal() }}円</div>
    <button
      class="checkout-btn"
      @click="openCheckoutDialog"
      :disabled="!hasOrder"
    >
      精算
    </button>
    <button
      class="clear-btn"
      @click="handleClear"
      aria-label="クリア"
      :disabled="!hasOrder"
    >
      <i-octicon-x-circle-fill-16 />
    </button>
  </div>
  <CheckoutDialog
    v-if="settings.showCheckoutDialog"
    v-model="isOpenCheckoutDialog"
    :order-summary="orderSummary"
    :total-price="total"
    :show-calculator="!!settings.showCalculator"
    @confirm="executeCheckout"
    @clear="handleClear"
    @cancel="gtmTrackEvent('cancel_checkout')"
  />
  <AgeVerificationDialog v-if="settings.showAgeVerification" ref="verificationDialog" :showCheckoutDialog="settings.showCheckoutDialog" />
</template>
