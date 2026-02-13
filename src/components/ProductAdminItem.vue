<script setup lang="ts">
import { useTemplateRef } from "vue";
import type { Term } from "@/db";
import { selectAllText } from "@/utils/productHelper";
import { gtmTrackEvent } from "@/utils/gtm.ts";
import MultiSelector from "@/components/MultiSelector.vue";

const props = defineProps<{
  item: any; // EditableProduct
  index: number;
  isSortMode: boolean;
  allCategories: Term[];
  allGenres: Term[];
  totalProducts: number;
  enableR18: boolean;
}>();

const emit = defineEmits<{
  (e: 'file-change', event: Event, index: number): void;
  (e: 'remove', index: number): void;
  (e: 'move', index: number, direction: 'up' | 'down'): void;
  (e: 'toggle-meta', tempId: number, index: number, el: HTMLElement | null): void;
  (e: 'gtm-event', action: string): void;
}>();

const onImageClick = (e: MouseEvent) => {
  fileInput.value?.click();
};

const fileInput = useTemplateRef("fileInput")

// メタトグル
const toggleMeta = () => {
  props.item.showMeta = !props.item.showMeta;
  gtmTrackEvent("toggle_meta");
};
</script>

<template>
  <div class="edit-item">
    <div
      v-show="isSortMode"
      class="drag-handle"
      :class="{ 'no-image': !item.image }"
      :aria-label="item.title"
    ></div>

    <div class="edit-item-inner">
      <div class="edit-item__image" @click="onImageClick">
        <i-octicon-file-media-24
          class="edit-item__image-icon"
          aria-label="画像"
          v-if="!item.image"
        />
        <div class="edit-item__image-container">
          <img v-if="item.image" :src="item.image" />
          <i-octicon-plus-circle-24 v-else />
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          :disabled="isSortMode"
          @change="emit('file-change', $event, index)"
        />
        <span class="btn btn-file">画像を選択</span>
      </div>

      <dl class="edit-item-data">
        <div class="edit-item-data__item">
          <dt>タイトル</dt>
          <dd>
            <input
              v-model="item.title"
              class="input-title"
              placeholder="タイトル"
              @focus="selectAllText"
              type="text"
              :disabled="isSortMode"
            />
          </dd>
        </div>
        <div class="edit-item-data__item">
          <dt>価格</dt>
          <dd>
            <div class="input-with-unit">
              <input
                v-model.number="item.price"
                type="number"
                min="0"
                inputmode="decimal"
                @focus="selectAllText"
                :disabled="isSortMode"
              />
              <span>円</span>
            </div>
          </dd>
        </div>
        <div class="edit-item-data__item">
          <dt>在庫</dt>
          <dd>
            <div class="edit-item-data__stock">
              <input
                v-model.number="item.stock"
                type="number"
                min="0"
                inputmode="decimal"
                @focus="selectAllText"
                :disabled="isSortMode"
              />
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="item.infiniteStock"
                  :true-value="1"
                  :false-value="0"
                />
                無制限
              </label>
            </div>
          </dd>
        </div>
      </dl>

      <div class="edit-item__controls">
        <label class="edit-item__visibility toggle-btn">
          <i-octicon-eye-24 v-show="!item.hidden" aria-label="表示" />
          <i-octicon-eye-closed-24 v-show="item.hidden" aria-label="非表示" />
          <input
            type="checkbox"
            v-model="item.hidden"
            :true-value="1"
            :false-value="0"
                  @change="gtmTrackEvent('toggle_visibility')"
          />
        </label>
        <div class="edit-item__order">
          <button
            class="btn-order"
            @click="emit('move', index, 'up')"
            :disabled="index === 0 || isSortMode"
            aria-label="上に移動"
          >
            <i-octicon-chevron-up-16 />
          </button>
          <button
            class="btn-order"
            @click="emit('move', index, 'down')"
            :disabled="index === totalProducts - 1 || isSortMode"
            aria-label="下に移動"
          >
            <i-octicon-chevron-down-16 />
          </button>
        </div>
        <button
          @click="emit('remove', index)"
          class="btn btn-remove-item"
          aria-label="削除"
        >
          <i-octicon-trash-24 />
        </button>
      </div>

      <div class="edit-item-meta">
        <button
          class="edit-item-meta__open"
          :class="{ 'is-open': item.showMeta }"
          @click="toggleMeta"
        >
          <i-octicon-plus-circle-16 /> 追加情報
        </button>
        <div
          class="edit-item-meta__content"
          :inert="!item.showMeta"
        >
          <dl class="edit-item-meta-data">
            <div class="edit-item-meta-data__item">
              <dt>発行日</dt>
              <dd>
                <label class="input-date">
                  <span>
                    <input v-model="item.pubdate" type="date" :disabled="isSortMode" />
                  </span>
                  <i-octicon-calendar-16 />
                </label>
              </dd>
            </div>
            <div class="edit-item-meta-data__item">
              <dt>印刷費</dt>
              <dd>
                <div class="input-with-unit">
                  <input
                    v-model.number="item.cost"
                    type="number"
                    min="0"
                    inputmode="decimal"
                    @focus="selectAllText"
                    :disabled="isSortMode"
                  />
                  <span>円</span>
                </div>
              </dd>
            </div>
            <div class="edit-item-meta-data__item" v-if="allCategories.length">
              <dt>カテゴリー</dt>
              <dd>
                <MultiSelector
                  v-model="item.terms.category"
                  :options="allCategories"
                  :label="'カテゴリー＠' + item.title"
                />
              </dd>
            </div>
            <div class="edit-item-meta-data__item" v-if="allGenres.length">
              <dt>ジャンル</dt>
              <dd>
                <MultiSelector
                  v-model="item.terms.genre"
                  :options="allGenres"
                  :label="'ジャンル＠' + item.title"
                />
              </dd>
            </div>
            <div v-if="enableR18" class="edit-item-meta-data__item">
              <dt>R18</dt>
              <dd>
                <input
                  v-model.number="item.r18"
                  :true-value="1"
                  :false-value="0"
                  type="checkbox"
                  :disabled="isSortMode"
                />
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </div>
</template>