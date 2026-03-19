<template>
  <div
    class="h-screen w-screen flex flex-col md:flex-row bg-gray-100 dark:bg-gray-900 overflow-hidden text-gray-800 dark:text-gray-200"
  >
    <!-- 左侧控制面板 (Left Control Panel) -->
    <aside
      class="w-full md:w-80 flex-none flex flex-col bg-white dark:bg-gray-800 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 h-[50vh] md:h-screen z-10 transition-all duration-300"
    >
      <header
        class="p-4 border-b border-gray-200 dark:border-gray-700 flex-none"
      >
        <h1 class="text-xl font-bold flex items-center justify-between">
          <span>CodeMirror + Shiki</span>
          <a
            href="https://github.com/uxiew/codemirror-shiki"
            target="_blank"
            class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title="View on GitHub"
          >
            <svg height="24" width="24" fill="currentColor" viewBox="0 0 16 16">
              <path
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
              ></path>
            </svg>
          </a>
        </h1>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
          配置与实时预览 Playground
        </p>

        <!-- 基础配置面板 -->
        <div class="space-y-4">
          <!-- 运行时模式 -->
          <div>
            <div class="text-xs font-semibold mb-1.5 opacity-80">当前模式</div>
            <div
              class="flex rounded overflow-hidden shadow-sm border border-gray-300 dark:border-gray-600 text-xs font-medium"
            >
              <button
                class="flex-1 py-1.5 text-center transition-colors"
                :class="
                  cmProps.mode === 'editor'
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                "
                @click="setMode('editor')"
              >
                ShikiEditor
              </button>
              <button
                class="flex-1 py-1.5 text-center transition-colors border-l border-gray-300 dark:border-gray-600"
                :class="
                  cmProps.mode === 'shiki'
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                "
                @click="setMode('shiki')"
              >
                @cmshiki/shiki
              </button>
            </div>
          </div>
          <!-- RegExp 引擎 -->
          <div>
            <div class="text-xs font-semibold mb-1.5 opacity-80">正则引擎</div>
            <div
              class="flex rounded overflow-hidden shadow-sm border border-gray-300 dark:border-gray-600 text-xs font-medium"
            >
              <button
                class="flex-1 py-1.5 text-center transition-colors"
                :class="
                  cmProps.engine === 'oniguruma'
                    ? 'bg-teal-600 text-white dark:bg-teal-500'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                "
                @click="setEngine('oniguruma')"
              >
                Oniguruma
              </button>
              <button
                class="flex-1 py-1.5 text-center transition-colors border-l border-gray-300 dark:border-gray-600"
                :class="
                  cmProps.engine === 'javascript'
                    ? 'bg-teal-600 text-white dark:bg-teal-500'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                "
                @click="setEngine('javascript')"
              >
                JavaScript
              </button>
            </div>
          </div>
          <!-- 性能耗时 -->
          <div
            class="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-900 rounded p-2.5 border border-gray-200 dark:border-gray-700 shadow-inner"
          >
            <span class="opacity-70 font-medium">渲染耗时</span>
            <span class="font-mono font-bold" :class="getPerfColor(perfMs)"
              >{{ perfMs.toFixed(2) }} ms</span
            >
          </div>
        </div>
      </header>

      <!-- Grammar & Theme 选择器 -->
      <div
        class="flex-auto flex flex-row md:flex-col overflow-hidden divide-x md:divide-x-0 md:divide-y divide-gray-200 dark:divide-gray-700"
      >
        <!-- Grammar -->
        <section class="flex-1 min-h-0 flex flex-col md:h-1/2">
          <div
            class="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
          >
            <input
              v-model="searchGrammar"
              type="text"
              placeholder="搜索语法..."
              class="w-full text-xs px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
            />
          </div>
          <div
            class="flex-auto overflow-auto relative custom-scrollbar bg-white dark:bg-gray-850"
          >
            <button
              v-for="g in filteredGrammars"
              :key="g.name"
              class="w-full px-3 py-2 text-left text-xs border-b border-gray-100 dark:border-gray-800/50 truncate transition-colors"
              :class="
                g.name === grammar
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-semibold border-l-2 border-l-blue-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-l-transparent text-gray-700 dark:text-gray-300'
              "
              @click="selectGrammar(g.name)"
            >
              {{ g.displayName }}
            </button>
          </div>
        </section>

        <!-- Theme -->
        <section class="flex-1 min-h-0 flex flex-col md:h-1/2">
          <div
            class="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
          >
            <input
              v-model="searchTheme"
              type="text"
              placeholder="搜索主题..."
              class="w-full text-xs px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-400"
            />
          </div>
          <div
            class="flex-auto overflow-auto relative custom-scrollbar bg-white dark:bg-gray-850"
          >
            <button
              v-for="t in filteredThemes"
              :key="t.name"
              class="w-full px-3 py-2 text-left text-xs border-b border-gray-100 dark:border-gray-800/50 truncate transition-colors"
              :class="
                t.name === theme
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-semibold border-l-2 border-l-purple-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-l-transparent text-gray-700 dark:text-gray-300'
              "
              @click="selectTheme(t.name)"
            >
              {{ t.displayName }}
            </button>
          </div>
        </section>
      </div>
    </aside>

    <!-- 右侧主区域 (Right Main Area) -->
    <main
      class="flex-auto flex flex-col h-[50vh] md:h-screen min-w-0 bg-[#0d1117] relative"
    >
      <!-- 实际编辑器展示区 -->
      <section
        class="flex-[3] min-h-0 relative border-b border-gray-800 flex flex-col group"
      >
        <div
          class="absolute right-3 top-3 z-10 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase bg-gray-800/80 text-gray-300 rounded shadow backdrop-blur transition-opacity opacity-50 group-hover:opacity-100 pointer-events-none"
        >
          Live Editor
        </div>
        <CodeMirror class="flex-auto" v-bind="cmProps" @perf="onPerf" />
      </section>

      <!-- 配置代码展示区 -->
      <section class="flex-[2] min-h-0 relative flex flex-col bg-[#161b22]">
        <div
          class="p-2.5 bg-[#21262d] flex items-center justify-between border-b mx-0 border-gray-700 text-xs font-mono text-gray-300 flex-none shadow-sm"
        >
          <div class="flex items-center gap-2">
            <span
              class="w-2.5 h-2.5 rounded-full bg-blue-500 opacity-80"
            ></span>
            <span class="font-semibold">{{ currentCodeTitle }}</span>
          </div>
        </div>
        <div class="flex-auto min-h-0 relative">
          <CodeMirror class="absolute inset-0 text-sm" v-bind="configCmProps" />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from "vue";
import { grammars } from "tm-grammars";
import { themes } from "tm-themes";
import { useStorage } from "@vueuse/core";
import type { CMProps } from "./types";
import CodeMirror from "./CodeMirror.vue";

type EngineMode = CMProps["engine"];
type AppMode = CMProps["mode"];
const DEFAULT_GRAMMAR = "javascript";

const theme = useStorage("tm-theme", "github-light");
const grammar = useStorage("tm-grammar", DEFAULT_GRAMMAR);
const engine = useStorage<EngineMode>("tm-engine", "oniguruma");
const appMode = useStorage<AppMode>("tm-mode", "editor");

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
  mode: appMode.value,
});

const filteredGrammars = computed(() => {
  const keyword = searchGrammar.value.trim().toLowerCase();
  return grammars.filter((g) => g.displayName.toLowerCase().includes(keyword));
});

const filteredThemes = computed(() => {
  const keyword = searchTheme.value.trim().toLowerCase();
  return themes.filter((t) => t.displayName.toLowerCase().includes(keyword));
});

const currentCodeTitle = computed(() => {
  if (cmProps.mode === "shiki") return "使用 @cmshiki/shiki 的底层使用方式";
  return "使用 @cmshiki/editor 的开箱即用方式";
});

const currentCodeDisplay = computed(() => {
  if (cmProps.mode === "shiki") {
    return `import { EditorView } from '@codemirror/view';
import { shikiToCodeMirror, updateEffect } from '@cmshiki/shiki';

// 初始化 Shiki 并转换为 CodeMirror Extension
const { shiki, getTheme } = await shikiToCodeMirror({
  lang: '${cmProps.lang.name}',
  theme: '${cmProps.theme.name}',
  engine: '${cmProps.engine}'
});

const view = new EditorView({
  doc: '...',
  parent: document.getElementById('editor'),
  extensions: [
    shiki // 将 shiki 扩展注入
  ]
});

// 后续动态更新配置
view.dispatch({
  effects: updateEffect.of({
    lang: '...',
    theme: '...',
    engine: '...'
  })
});`;
  } else {
    return `import { ShikiEditor } from '@cmshiki/editor';

// 使用封装更友好的 ShikiEditor
const editor = await ShikiEditor.create({
  parent: document.getElementById('editor'),
  doc: '...',
  lang: '${cmProps.lang.name}',
  themes: {
    light: '${cmProps.theme.name}', // 可配置多主题
    dark: 'github-dark',
  },
  defaultColor: 'light', // 当前默认颜色
  themeStyle: 'cm', // 使用 cm 的样式方式
  engine: '${cmProps.engine}'
});

// 后续动态更新配置，它会自动帮你 dispatch updateEffect
editor.update({
  lang: '...',
  theme: '...',
  engine: '...'
});`;
  }
});

const configCmProps = computed<CMProps>(() => ({
  lang: {
    name: "typescript",
    value: currentCodeDisplay.value,
    grammar: "typescript",
  },
  theme: cmProps.theme,
  engine: cmProps.engine,
  mode: cmProps.mode,
}));

async function loadSample(name: string) {
  cmProps.lang.value = await import(`../../samples/${name}.sample?raw`)
    .then((m) => m.default)
    .catch(async () => {
      if (name !== DEFAULT_GRAMMAR) {
        return import(`../../samples/${DEFAULT_GRAMMAR}.sample?raw`)
          .then((m) => m.default)
          .catch(() => `// No sample available for ${DEFAULT_GRAMMAR}`);
      }
      return `// No sample available for ${name}`;
    });
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

function setMode(mode: AppMode) {
  appMode.value = mode;
  cmProps.mode = mode;
}

function onPerf(ms: number) {
  perfMs.value = ms;
}

function getPerfColor(time: number) {
  if (time < 50) return "text-green-600 dark:text-green-400";
  if (time < 150) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

onMounted(() => {
  if (!grammar.value || !grammars.some((g) => g.name === grammar.value)) {
    selectGrammar(DEFAULT_GRAMMAR);
    return;
  }
  selectGrammar(grammar.value);
});
</script>

<style>
body {
  padding: 0;
}
</style>
