<script setup lang="ts">
import type { Product } from "@/db";

const props = defineProps<{
  item: Product;
  orderCount: number;
  showTitle: boolean;
  showStock: boolean;
  showSoldoutItems: boolean;
}>();

const emit = defineEmits<{
  (e: 'add'): void;
  (e: 'sub'): void;
  (e: 'zero'): void;
}>();

const isSoldOut = (item: Product) => !item.infinite_stock && item.stock == 0;
</script>

<template>
  <li
    class="product-item"
    :class="{ 'is-sold-out': isSoldOut(item) }"
    v-show="showSoldoutItems || item.infinite_stock || item.stock > 0"
  >
    <div class="product-item-inner">
      <div class="sold-out-label" v-if="isSoldOut(item)"><span>完売</span></div>
      <div class="add-order" @click="emit('add')">
        <div class="product-item__title" v-if="showTitle && item.title && item.image">
          {{ item.title }}
        </div>
        <img src="@/assets/r18.svg" alt="R18" class="r18" v-if="item?.r18" />
        <div class="product-item__image">
          <div class="check" v-if="orderCount">
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
        <div class="product-item__order" :class="{ ordered: orderCount }">
          <span>{{ orderCount }}</span>
          <span v-if="showStock && !item.infinite_stock">
            / {{ item.stock }}
          </span>
        </div>
        <button class="sub" aria-label="1つ減らす" @click="emit('sub')">
          <i-octicon-dash-16 />
        </button>
        <button class="trash" aria-label="0にする" @click="emit('zero')">
          <i-octicon-trash-24 />
        </button>
      </div>
    </div>
  </li>
</template>