<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
    <header class="flex-none p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-start gap-4">
        <div>
          <h1 class="text-xl font-bold">
            CodeMirror + Shiki Playground
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
            选择 Shiki 的 grammar / theme，并联动展示我们项目的渲染结果。
          </p>
        </div>
        <div class="flex-auto" />
        <div class="text-xs text-gray-500 dark:text-gray-400">
          当前语法: <code>{{ cmProps.lang.name }}</code>
          · 主题: <code>{{ cmProps.theme.name }}</code>
          · 引擎: <code>{{ cmProps.engine }}</code>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <div class="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700">
          <div class="text-xs opacity-70">
            CodeMirror 更新耗时
          </div>
          <div :class="getPerfColor(perfMs)" class="font-semibold">
            {{ perfMs.toFixed(2) }}ms
          </div>
        </div>

        <div class="px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center gap-1">
          <span class="text-xs opacity-70 px-1">引擎模式</span>
          <button
            class="px-2 py-1 rounded text-xs"
            :class="cmProps.engine === 'oniguruma' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'"
            @click="setEngine('oniguruma')"
          >
            Oniguruma
          </button>
          <button
            class="px-2 py-1 rounded text-xs"
            :class="cmProps.engine === 'javascript' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'"
            @click="setEngine('javascript')"
          >
            JavaScript
          </button>
        </div>
      </div>
    </header>

    <main class="flex-auto grid grid-cols-1 xl:grid-cols-[260px_260px_1fr] gap-0 overflow-hidden divide-y xl:divide-y-0 xl:divide-x divide-gray-200 dark:divide-gray-700">
      <section class="min-h-0 flex flex-col">
        <div class="p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-bold text-center flex-none">
          Grammar
        </div>
        <div class="p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <input
            v-model="searchGrammar"
            type="text"
            placeholder="搜索语法..."
            class="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent"
          >
        </div>
        <div class="flex-auto min-h-0 overflow-auto bg-white dark:bg-gray-900">
          <button
            v-for="g in filteredGrammars"
            :key="g.name"
            class="w-full px-3 py-1.5 text-left text-sm border-b border-gray-100 dark:border-gray-800"
            :class="g.name === grammar ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200' : 'hover:bg-gray-50 dark:hover:bg-gray-800'"
            @click="selectGrammar(g.name)"
          >
            {{ g.displayName }}
          </button>
        </div>
      </section>

      <section class="min-h-0 flex flex-col">
        <div class="p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-bold text-center flex-none">
          Theme
        </div>
        <div class="p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <input
            v-model="searchTheme"
            type="text"
            placeholder="搜索主题..."
            class="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent"
          >
        </div>
        <div class="flex-auto min-h-0 overflow-auto bg-white dark:bg-gray-900">
          <button
            v-for="t in filteredThemes"
            :key="t.name"
            class="w-full px-3 py-1.5 text-left text-sm border-b border-gray-100 dark:border-gray-800"
            :class="t.name === theme ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-200' : 'hover:bg-gray-50 dark:hover:bg-gray-800'"
            @click="selectTheme(t.name)"
          >
            {{ t.displayName }}
          </button>
        </div>
      </section>

      <section class="min-h-0 flex flex-col">
        <div class="p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-bold text-center flex-none">
          CodeMirror + @cmshiki/shiki 展示区
        </div>
        <div class="flex-auto min-h-0 relative overflow-hidden bg-white dark:bg-[#0d1117]">
          <CodeMirror
            class="h-full w-full"
            v-bind="cmProps"
            @perf="onPerf"
          />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { grammars } from "tm-grammars";
import { themes } from "tm-themes";
import type { CMProps } from "./types";
import CodeMirror from "./CodeMirror.vue";

type EngineMode = CMProps["engine"];

const theme = useStorage("tm-theme", "github-light");
const grammar = useStorage("tm-grammar", "javascript");
const engine = useStorage<EngineMode>("tm-engine", "oniguruma");

const searchGrammar = ref("");
const searchTheme = ref("");
const perfMs = ref(0);

const cmProps = reactive<CMProps>({
  lang: {
    name: grammar.value,
    value: "",
    grammar: grammar.value,
  },
  theme: {
    name: theme.value,
    value: theme.value,
  },
  engine: engine.value,
});

const filteredGrammars = computed(() => {
  const keyword = searchGrammar.value.trim().toLowerCase();
  return grammars.filter((g) => g.displayName.toLowerCase().includes(keyword));
});

const filteredThemes = computed(() => {
  const keyword = searchTheme.value.trim().toLowerCase();
  return themes.filter((t) => t.displayName.toLowerCase().includes(keyword));
});

async function loadSample(name: string) {
  cmProps.lang.value = await import(`../../samples/${name}.sample?raw`)
    .then((m) => m.default)
    .catch(() => `// No sample available for ${name}`);
}

function selectGrammar(name: string) {
  grammar.value = name;
  cmProps.lang.name = name;
  cmProps.lang.grammar = name;
  loadSample(name);
}

function selectTheme(name: string) {
  theme.value = name;
  cmProps.theme.name = name;
  cmProps.theme.value = name;
}

function setEngine(mode: EngineMode) {
  engine.value = mode;
  cmProps.engine = mode;
}

function onPerf(ms: number) {
  perfMs.value = ms;
}

function getPerfColor(time: number) {
  if (time < 50) return "text-green-600 dark:text-green-400";
  if (time < 150) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

onMounted(() => {
  loadSample(grammar.value);
});
</script>

<style>
body {
  margin: 0;
  padding: 0;
}
</style>
