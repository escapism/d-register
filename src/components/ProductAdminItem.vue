<script setup lang="ts">
import { useTemplateRef, onMounted } from "vue";
import type { Term } from "@/db";
import { selectAllText } from "@/utils/productHelper";
import { gtmTrackEvent } from "@/utils/gtm.ts";
import MultiSelector from "@/components/MultiSelector.vue";
import { getResizedBase64 } from "@/utils/imageHelper";

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
  (e: "add:term", newTerm: Omit<Term, "id">): void;
  (e: "remove", index: number): void;
  (e: "move", index: number, direction: "up" | "down"): void;
  (
    e: "toggle-meta",
    tempId: number,
    index: number,
    el: HTMLElement | null,
  ): void;
  (e: "gtm-event", action: string): void;
}>();

const fileInput = useTemplateRef("fileInput");
const imageControls = useTemplateRef("imageControls");
const removeFileButton = useTemplateRef("removeFileButton");

let startX: number | null = null;
let touchmove = false;

onMounted(() => {
  fileInput.value?.addEventListener("click", (e) => {
    e.stopPropagation();
  });
})

const onImageTouchStart = (e: TouchEvent | MouseEvent) => {
  if (!props.item.image) return;
  if (e.touches) {
    startX = e.touches[0].clientX;
  } else {
    startX = e.clientX;
  }
};

const onImageTouchMove = (e: TouchEvent | MouseEvent) => {
  if (!props.item.image) return;
  if (startX !== null) {
    touchmove = true;
    const diffX = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
  
    if (diffX < -30) {
      // 左に大きくスワイプしたら
      imageControls.value.classList.add("is-swiping");
    } else if (diffX > 10) {
      imageControls.value.classList.remove("is-swiping");
    }
  }
}

const onImageTouchEnd = () => {
  if (!props.item.image) return;
  if (startX !== null) {
    startX = null;
    touchmove = false;
  }
}
const onImageClick = (e: MouseEvent) => {
  if (startX !== null && touchmove) {
    startX = null;
    touchmove = false;
    return;
  }
  if (
    e.target === imageControls.value ||
    e.target === removeFileButton.value ||
    removeFileButton.value?.contains(e.target as Node)
  ) {
    props.item.image = null;
    imageControls.value.classList.remove("is-swiping");
    gtmTrackEvent("remove_image");
  } else {
    fileInput.value?.click();
  }
};

const onFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  props.item.image = await getResizedBase64(file);
  gtmTrackEvent("select_image");
};

// メタトグル
const toggleMeta = () => {
  props.item.showMeta = !props.item.showMeta;
  gtmTrackEvent("toggle_meta");
};

const handleAddTerm = (newTerm: Omit<Term, "id">) => {
  emit("add:term", newTerm);
  gtmTrackEvent(`add_${newTerm.taxonomy}_in_selector`);
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
      <div
        class="edit-item-image"
        @click="onImageClick"
        @keydown.enter="onImageClick"
        tabindex="0"
      >
        <i-octicon-file-media-24
          class="edit-item-image-icon"
          aria-label="画像"
          v-if="!item.image"
        />
        <div class="edit-item-image-container">
          <img v-if="item.image" :src="item.image" />
          <i-octicon-plus-circle-24 v-else />
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          :disabled="isSortMode"
          @change="onFileChange"
        />
        <div class="edit-item-image-controls" ref="imageControls" @touchstart="onImageTouchStart" @touchmove="onImageTouchMove" @touchend="onImageTouchEnd" @mousedown="onImageTouchStart" @mousemove="onImageTouchMove">
          <div class="btn btn-file">{{
            item.image ? "画像を変更" : "画像を選択"
          }}</div>
          <button
            class="btn btn-remove-file"
            aria-label="画像を削除"
            ref="removeFileButton"
          >
            <i-octicon-trash-24 />
          </button>
        </div>
      </div>

      <dl class="edit-item-data">
        <div>
          <dt>タイトル</dt>
          <dd>
            <input
              v-model="item.title"
              class="input-title"
              placeholder="タイトル"
              type="text"
              :disabled="isSortMode"
            />
          </dd>
        </div>
        <div>
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
        <div>
          <dt>在庫</dt>
          <dd>
            <div class="edit-item-data-stock">
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

      <div class="edit-item-controls">
        <label class="edit-item-visibility toggle-btn">
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
        <div class="edit-item-order">
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
          class="edit-item-meta-open"
          :class="{ 'is-open': item.showMeta }"
          @click="toggleMeta"
        >
          <i-octicon-plus-circle-16 /> 追加情報
        </button>
        <div class="edit-item-meta-content" :inert="!item.showMeta">
          <dl class="edit-item-meta-data">
            <div class="edit-item-meta-data-item">
              <dt>発行日</dt>
              <dd>
                <label class="input-date">
                  <span>
                    <input
                      v-model="item.pubdate"
                      type="date"
                      :disabled="isSortMode"
                    />
                  </span>
                  <i-octicon-calendar-16 />
                </label>
              </dd>
            </div>
            <div class="edit-item-meta-data-item">
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
            <div class="edit-item-meta-data-item">
              <dt>カテゴリー</dt>
              <dd>
                <MultiSelector
                  v-model="item.terms.category"
                  taxonomy="category"
                  :options="allCategories"
                  :label="'カテゴリー＠' + item.title"
                  @add:term="handleAddTerm"
                />
              </dd>
            </div>
            <div class="edit-item-meta-data-item">
              <dt>ジャンル</dt>
              <dd>
                <MultiSelector
                  v-model="item.terms.genre"
                  taxonomy="genre"
                  :options="allGenres"
                  :label="'ジャンル＠' + item.title"
                  @add:term="handleAddTerm"
                />
              </dd>
            </div>
            <div v-if="enableR18" class="edit-item-meta-data-item">
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
