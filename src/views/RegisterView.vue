<script setup lang="ts">
import { ref, watch, onMounted, computed, inject } from "vue";
import { liveQuery } from "dexie";
import { useObservable } from "@vueuse/rxjs";
import { db } from "@/db";
import { ulid } from "ulid";
import { gtmTrackEvent, gtmTrackError } from "@/utils/gtm.ts"

const openDialog = inject('globalDialog');
const popped = inject('globalPopup');

// DBから商品をリアルタイム取得
const products = useObservable(
  liveQuery(() => db.products.orderBy("sortOrder").toArray()),
  [],
);
const order = ref<number[]>([]);

// 設定値
const showStock = ref<boolean>(true);
const showSoldoutItems = ref<boolean>(true);
const showCheckoutDialog = ref<boolean>(true);
const showCalculator = ref<boolean>(true);
const existsProduct = ref<boolean>(true);
const hasOrder = ref<boolean>(false);
const numCols = ref(2)

const isOpenCheckoutDialog = ref(false)
const confirmed = ref(localStorage.getItem("confirmed"));

onMounted(async () => {
  const stockOpt = await db.options.get("showStock");
  if (stockOpt !== undefined) showStock.value = stockOpt.value;

  const soldoutOpt = await db.options.get("showSoldoutItems");
  if (soldoutOpt !== undefined) showSoldoutItems.value = soldoutOpt.value;

  const dialogOpt = await db.options.get("showCheckoutDialog");
  if (dialogOpt !== undefined) showCheckoutDialog.value = dialogOpt.value;

  const calcOpt = await db.options.get("showCalculator");
  if (calcOpt !== undefined) showCalculator.value = calcOpt.value;

  const columnsOpt = await db.options.get("numCols");
  if (columnsOpt !== undefined) numCols.value = columnsOpt.value;
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

const addOrder = (index: number) => {
  if (!products.value) return;
  const item = products.value[index];
  if (item.infinite_stock) {
    order.value[index]++;
  } else {
    order.value[index] = Math.min(order.value[index] + 1, item.stock);
  }
  gtmTrackEvent("add_order")
};

const total = ref(0);

const subOrder = (index) => {
  order.value[index] = Math.max(order.value[index] - 1, 0);
  gtmTrackEvent("sub_order")
};

const zeroOrder = (index) => {
  order.value[index] = 0;
  gtmTrackEvent("zero_order")
};

const handleClear = () => {
  gtmTrackEvent("clear_total")
  clearTotal()
}

const clearTotal = () => {
  if (!hasOrder.value) return;
  order.value = new Array(products.value.length).fill(0);
};

const getTotal = () => {
  return total.value.toLocaleString("ja-JP");
};

const soldOut = computed(() => {
  return (item) => !item.infinite_stock && item.stock == 0
});

const columns = computed(() => {
  return {
    "--columns": numCols.value
  }
})

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

// 注文ダイアログ
const receivedAmount = ref<number | null>(null);

// 注文の内訳（個数が1以上のものだけ抽出）
const orderSummary = ref<{ title: string; count: number }[]>([]);

const openCheckoutDialog = () => {
  if (!hasOrder.value || isOpenCheckoutDialog.valie) return;
  receivedAmount.value = null; // お釣りリセット

  // 注文があるものだけをサマリーに抽出
  orderSummary.value = products.value
    .map((p, i) => ({ title: p.title, count: order.value[i] }))
    .filter((item) => item.count > 0);

  if (orderSummary.value.length === 0) return;

  // 設定でダイアログを表示しない場合は即精算
  if (!showCheckoutDialog.value) {
    executeCheckout();
    return;
  }

  isOpenCheckoutDialog.value = true
};

const closeCheckoutDialog = (status : number) => {  
  isOpenCheckoutDialog.value = false
  if (status === 1) { // clear
    clearTotal()
    gtmTrackEvent("clear_checkout")
  } else if (status === 0) { // cancel
    gtmTrackEvent("cancel_checkout")
  }
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
    gtmTrackEvent("complete_checkout")
    closeCheckoutDialog(-1);
    popped("精算完了しました");
  } catch (error) {
    closeCheckoutDialog(-1);
    gtmTrackError("error_checkout")
    await openDialog("精算エラーが発生しました。");
  }
};

// お釣りの計算（マイナスの場合は0を表示）
const changeAmount = computed(() => {
  if (receivedAmount.value === null) return 0;

  const change = receivedAmount.value - total.value;
  return change;
});

// 金額入力用の関数
const addReceivedAmount = (num: number) => {
  if (receivedAmount.value === null) receivedAmount.value = 0;
  receivedAmount.value += num;
};

const clearReceivedAmount = () => {
  receivedAmount.value = null;
};
</script>

<template>
  <div class="container register-container">
    <section class="important-notice-box" v-if="!confirmed">
      <h3><strong>⚠️ 初めてご利用になる方へ</strong></h3>
      <p>
        使用前に必ず<router-link to="/about/notes" @click="gtmTrackEvent('first_confirm')"
          >「ご利用上の注意」</router-link
        >をご確認ください。
      </p>
    </section>
    <div class="notice" v-else-if="!existsProduct">
      <p><router-link to="/admin">頒布物を登録</router-link>してください。</p>
    </div>
    <ul class="product-list" :style="columns">
      <li
        class="product-item"
         :class="{'is-sold-out': soldOut(item)}"
        v-for="(item, index) in products"
        :key="item.id"
        v-show="
          !item.hidden &&
          (showSoldoutItems || item.infinite_stock || item.stock > 0)
        "
      >
        <div class="product-item-inner">
          <div class="sold-out" v-if="soldOut(item)">完売</div>
          <div class="add-order" @click="addOrder(index)">
            <div class="product-item__title" v-if="item.title && item.image">
              {{ item.title }}
            </div>
            <div class="product-item__image">
              <div class="check" v-if="order[index]">
                <i-octicon-check-16 />
              </div>
              <img :src="item.image" alt="" v-if="item.image" />
              <div class="product-item__alt" v-else>
                <span>{{ item.title }}</span>
              </div>
              <div class="product-item__price">{{ item.price }}円</div>
            </div>
          </div>
          <div class="product-item__control">
            <div
              class="product-item__order"
              v-bind:class="{ ordered: order[index] }"
            >
              <span>{{ order[index] }}</span
              ><span v-if="showStock && !item.infinite_stock">
                / {{ item.stock }}</span
              >
            </div>
            <button class="sub" aria-label="1つ減らす" @click="subOrder(index)">
              <i-octicon-dash-16 />
            </button>
            <button
              class="trash"
              aria-label="0にする"
              @click="zeroOrder(index)"
            >
              <i-octicon-trash-24 />
            </button>
          </div>
        </div>
      </li>
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
  <Transition name="fade">
    <div v-if="isOpenCheckoutDialog" class="dialog-overlay" @click.self="closeCheckoutDialog(0)">
  <div
    role="dialog"
    class="confirm-dialog"
  >
    <div class="dialog-content" @click.stop>
      <h2 tabindex="0">注文内容の確認</h2>
      <ul class="summary-list">
        <li v-for="item in orderSummary" :key="item.title">
          <span class="summary-title">{{ item.title }}</span>
          <span class="summary-count">× {{ item.count }}</span>
        </li>
      </ul>
      <div class="summary-total">
        合計: <strong>{{ getTotal() }}円</strong>
      </div>

      <div class="calculator" v-if="showCalculator">
        <div class="received-display">
          <span>お預かり：</span>
          <div class="input-with-unit">
            <input
              type="number"
              v-model.number="receivedAmount"
              inputmode="numeric"
              @focus="$event.target.select()"
            />
            <span>円</span>
          </div>
          <button class="clear-btn" @click="clearReceivedAmount" aria-label="預かり金クリア">
            <i-octicon-x-circle-fill-16 />
          </button>
        </div>

        <div class="quick-buttons">
          <button class="btn" @click="addReceivedAmount(100)">+100</button>
          <button class="btn" @click="addReceivedAmount(500)">+500</button>
          <button class="btn" @click="addReceivedAmount(1000)">+1,000</button>
          <button class="btn" @click="addReceivedAmount(5000)">+5,000</button>
          <button class="btn" @click="addReceivedAmount(10000)">+10,000</button>
        </div>

        <div
          class="change-display"
          :class="{
            'has-change': changeAmount > 0,
            'not-enough': changeAmount < 0,
          }"
        >
          <span>お釣り：</span>
          <strong>{{ changeAmount.toLocaleString("ja-JP") }}円</strong>
        </div>
      </div>
      <div class="button-area">
        <button @click="closeCheckoutDialog(1)" class="btn btn-cancel">クリア</button>
        <button @click="closeCheckoutDialog(0)" class="btn btn-cancel">キャンセル</button>
        <button @click="executeCheckout" class="btn btn-confirm">確定</button>
      </div>
    </div>
  </div>
  </div>
  </Transition>
</template>
