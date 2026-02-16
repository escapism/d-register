<script setup lang="ts">
import { ref, computed, useTemplateRef, onMounted } from "vue";
import { useObservable } from "@vueuse/rxjs";
import { liveQuery } from "dexie";
import { db } from "@/db";
import { gtmTrackEvent } from "@/utils/gtm.ts";

// サークル名取得
const circleName = useObservable(
  liveQuery(async () => {
    const opt = await db.options.get("circleName");
    return opt ? opt.value : undefined;
  })
);

const header = useTemplateRef("header");
const globalNav = useTemplateRef("globalNav");
const activeMenu = ref(false);
const appVersion = APP_VERSION;

let touchStartX = 0;
let resizeTimer;

onMounted(() => {
  globalNav.value.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  globalNav.value.addEventListener("touchmove", (e) => {
    const swipeDistance = touchStartX - e.changedTouches[0].screenX;
    globalNav.value.style.transition = "nune";
    globalNav.value.style.translate = `-${swipeDistance}px 0`;
  });

  globalNav.value.addEventListener("touchend", (e) => {
    const swipeDistance = touchStartX - e.changedTouches[0].screenX;
    if (swipeDistance > globalNav.value.clientWidth * 0.25) {
      closeMenu();
    }
    globalNav.value.style.transition = null;
    globalNav.value.style.translate = null;
  });

  updateHeight();
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    setTimeout(updateHeight, 200);
  });
});

const updateHeight = () => {
  const height = header.value?.offsetHeight;
  document.documentElement.style.setProperty("--header-height", `${height}px`);
};

const toggleMenu = () => {
  if (activeMenu.value) {
    closeMenu();
  } else {
    openMenu();
  }
  gtmTrackEvent("toggle_menu");
};

const openMenu = () => {
  activeMenu.value = true;
  document.body.classList.add("is-menu-open");
};

const closeMenu = () => {
  activeMenu.value = false;
  document.body.classList.remove("is-menu-open");
};

const reload = () => {
  window.location.reload();
};

const handleHeaderBtn = (event: string) => {
  if (event) {
    gtmTrackEvent(event);
  }
  closeMenu();
};
const showCirclName = computed(() => {
  if (circleName.value === undefined) {
    return "名称未設定サークル";
  }
  return circleName.value;
});
</script>
<template>
  <header class="site-header" ref="header">
    <h1 class="circle-name" :class="{ anonymous: circleName === undefined }">
      {{ showCirclName }}
    </h1>
    <button
      class="header-btn menu-btn"
      aria-label="メニューを開く"
      @click="toggleMenu"
      aria-controls="globalNav"
      :aria-expanded="activeMenu ? 'true' : 'false'"
    >
      <svg viewBox="0 0 16 16" fill="currentColor">
        <path
          d="M1,2.75c0-.41.34-.75.75-.75h12.5c.41,0,.75.34.75.75s-.34.75-.75.75H1.75c-.41,0-.75-.34-.75-.75"
        />
        <path
          d="M1,7.75c0-.41.34-.75.75-.75h12.5c.41,0,.75.34.75.75s-.34.75-.75.75H1.75c-.41,0-.75-.34-.75-.75"
        />
        <path
          d="M1.75,12h12.5c.41,0,.75.34.75.75s-.34.75-.75.75H1.75c-.41,0-.75-.34-.75-.75s.34-.75.75-.75"
        />
      </svg>
    </button>
    <router-link
      to="/"
      @click="handleHeaderBtn('header_home_button')"
      class="header-btn home-btn"
      aria-label="レジスター"
      ><i-octicon-apps-24
    /></router-link>
    <router-link
      to="/admin"
      @click="handleHeaderBtn('header_admin_button')"
      class="header-btn admin-btn"
      aria-label="頒布物登録"
      ><i-octicon-file-added-24
    /></router-link>
  </header>
  <nav
    class="global-nav"
    ref="globalNav"
    :class="{ 'is-active': activeMenu }"
    :inert="!activeMenu"
  >
    <ul class="menu-list">
      <li>
        <router-link to="/" @click="closeMenu"
          ><i-octicon-apps-24 /> レジスター</router-link
        >
      </li>
      <li>
        <router-link to="/admin" @click="closeMenu"
          ><i-octicon-file-added-24 /> 頒布物登録</router-link
        >
      </li>
      <li>
        <router-link to="/sales" @click="closeMenu"
          ><i-octicon-archive-24 /> 売上確認
        </router-link>
      </li>
      <li>
        <router-link to="/settings" @click="closeMenu"
          ><i-octicon-gear-24 /> 設定
        </router-link>
      </li>
      <li>
        <router-link to="/about" @click="closeMenu"
          ><i-octicon-info-24 /> このアプリについて
        </router-link>
      </li>
    </ul>
    <a href="https://x.com/escapist_uco" class="x-link" target="_blank" rel="noopener">
      <svg viewBox="0 0 1200 1227">
        <path
          d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
          fill="currentColor"
        />
      </svg>
      <span>@escapist_uco</span>
    </a>

    <button class="reload-btn" @click="reload">
      <i-octicon-sync-24 />
      リロード
    </button>
    <div class="version">v{{ appVersion }}</div>
  </nav>
  <div
    class="overlay"
    :class="{ 'is-active': activeMenu }"
    aria-hidden="true"
    @click="closeMenu"
  ></div>
</template>
