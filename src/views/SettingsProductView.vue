<script setup lang="ts">
import { ref, onBeforeMount, watch, inject } from "vue";
import { useRoute } from "vue-router";
import { db, type Term } from "@/db";
import { selectAllText } from "@/utils/productHelper";
import { PRODUCT_DEFAULT } from "@/const/setting";
import { gtmTrackEvent, gtmTrackError } from "@/utils/gtm.ts";
import { SAVING_DELAY } from "@/const/number";
import MultiSelector from "@/components/MultiSelector.vue";
import { fetchTerms } from "@/composables/useTerms";

const route = useRoute();
const openDialog = inject("globalDialog") as any;
const popped = inject("globalPopup") as any;
const loader = inject("globalLoader") as any;

const productDefault = ref<any>({ ...PRODUCT_DEFAULT });
const allCategories = ref<Term[]>([]);
const allGenres = ref<Term[]>([]);
const isSaving = ref(false);
let saved = false;

// ローダーとポップアップの連動
watch(isSaving, (val) => {
  loader(val);
  if (val === false && saved) {
    popped("デフォルト設定を保存しました");
    saved = false;
  }
});

onBeforeMount(async () => {
  const opt = await db.options.get("productDefault");
  if (opt && opt.value) {
    productDefault.value = { ...PRODUCT_DEFAULT, ...opt.value };
  }

  allCategories.value = await fetchTerms("category");
  allGenres.value = await fetchTerms("genre");
});

const saveSettings = async () => {
  if (isSaving.value) return;
  isSaving.value = true;

  try {
    // オブジェクトそのまま db.options に保存
    await db.options.put({
      key: "productDefault",
      value: JSON.parse(JSON.stringify(productDefault.value)),
    });
    saved = true;
    gtmTrackEvent("save_product_default_settings");
  } catch (e) {
    console.error(e);
    gtmTrackError("save_product_default_settings");
    await openDialog("保存に失敗しました。");
  } finally {
    setTimeout(() => {
      isSaving.value = false;
    }, SAVING_DELAY);
  }
};
</script>
<template>
  <div class="container page-container">
    <h1 class="page-title"><i-octicon-gear-24 /> {{ route.meta.title }}</h1>
    <div class="pagination">
      <router-link to="/settings">
        <i-octicon-arrow-left-16 />
        設定
      </router-link>
    </div>
    <h2>デフォルト設定</h2>
    <div class="edit-item edit-item-default">
      <div class="edit-item-inner">
        <div class="edit-item-image" aria-hidden="true">
          <div class="edit-item-image-container"></div>
        </div>

        <dl class="edit-item-data">
          <div>
            <dt>タイトル</dt>
            <dd>
              <input
                v-model="productDefault.title"
                class="input-title"
                placeholder="タイトル"
                type="text"
              />
            </dd>
          </div>
          <div>
            <dt>価格</dt>
            <dd>
              <div class="input-with-unit">
                <input
                  v-model="productDefault.price"
                  type="number"
                  min="0"
                  inputmode="decimal"
                  @focus="selectAllText"
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
                  v-model="productDefault.stock"
                  type="number"
                  min="0"
                  inputmode="decimal"
                  @focus="selectAllText"
                />
                <label class="checkbox-label"
                  ><input
                    type="checkbox"
                    v-model="productDefault.infiniteStock"
                    :true-value="1"
                    :false-value="0"
                  />
                  無制限</label
                >
              </div>
            </dd>
          </div>
        </dl>
        <div class="edit-item-controls">
          <label class="edit-item-visibility toggle-btn">
            <i-octicon-eye-24
              v-show="!productDefault.hidden"
              aria-label="表示"
            />
            <i-octicon-eye-closed-24
              v-show="productDefault.hidden"
              aria-label="非表示"
            />
            <input
              type="checkbox"
              v-model="productDefault.hidden"
              :true-value="1"
              :false-value="0"
            />
          </label>
          <div class="edit-item-order" aria-hidden="true">
            <button class="btn-order" disabled>
              <i-octicon-chevron-up-16 />
            </button>
            <button class="btn-order" disabled>
              <i-octicon-chevron-down-16 />
            </button>
          </div>
        </div>
        <div class="edit-item-meta">
          <div class="edit-item-meta-open is-open">追加情報</div>
          <div class="edit-item-meta-content">
            <dl class="edit-item-meta-data">
              <div class="edit-item-meta-data-item">
                <dt>発行日</dt>
                <dd>
                  <label class="checkbox-label"
                    ><input
                      type="checkbox"
                      v-model="productDefault.pubdate"
                      true-value="today"
                    />
                    当日</label
                  >
                </dd>
              </div>
              <div class="edit-item-meta-data-item">
                <dt>印刷費</dt>
                <dd>
                  <div class="input-with-unit">
                    <input
                      v-model="productDefault.cost"
                      type="number"
                      min="0"
                      inputmode="decimal"
                      @focus="selectAllText"
                    />
                    <span>円</span>
                  </div>
                </dd>
              </div>
              <div class="edit-item-meta-data-item">
                <dt>カテゴリー</dt>
                <dd>
                  <MultiSelector
                    v-if="allCategories.length"
                    v-model="productDefault.terms.category"
                    :options="allCategories"
                    label="デフォルトカテゴリー"
                  />
                  <div v-else class="no-terms">選択肢がありません</div>
                </dd>
              </div>
              <div class="edit-item-meta-data-item">
                <dt>ジャンル</dt>
                <dd>
                  <MultiSelector
                    v-if="allGenres.length"
                    v-model="productDefault.terms.genre"
                    :options="allGenres"
                    label="デフォルトジャンル"
                  />
                  <div v-else class="no-terms">選択肢がありません</div>
                </dd>
              </div>
              <div class="edit-item-meta-data-item">
                <dt>R18</dt>
                <dd>
                  <input
                    v-model="productDefault.r18"
                    :true-value="1"
                    :false-value="0"
                    type="checkbox"
                  />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <table class="setting-table">
      <tbody>
        <tr>
          <th>追加情報を開いておく</th>
          <td>
            <input
              type="checkbox"
              v-model="productDefault.showMeta"
              :true-value="1"
              :false-value="0"
            />
          </td>
        </tr>
        <tr>
          <th>R18選択を表示</th>
          <td>
            <input
              type="checkbox"
              v-model="productDefault.enableR18"
              :true-value="1"
              :false-value="0"
            />
          </td>
        </tr>
      </tbody>
    </table>
    <div class="button-area">
      <button @click="saveSettings" class="btn btn-save">設定を保存する</button>
    </div>
  </div>
</template>
