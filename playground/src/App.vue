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
          <span>
            <a
              href="https://github.com/uxiew/codemirror-shiki"
              style="text-decoration: underline"
              target="_blank"
              >@cmshiki</a
            >
            (<a
              style="color: red"
              target="_blank"
              href="https://codemirror.net/"
              >CodeMirror</a
            >
            +
            <a
              style="color: blue"
              target="_blank"
              href="https://textmate-grammars-themes.netlify.app"
              >Shiki</a
            >
            )</span
          >
        </h1>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
          TextMate grammar and theme playground
        </p>

        <!-- 基础配置面板 -->
        <div class="space-y-4">
          <!-- 运行时模式 -->
          <div>
            <div class="text-xs font-semibold mb-1.5 opacity-80">Integration</div>
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
            <div class="text-xs font-semibold mb-1.5 opacity-80">Regex engine</div>
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
            <span class="opacity-70 font-medium">Render time</span>
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
        <section class="flex-1 min-h-0 flex flex-col md:h-1/2" aria-labelledby="language-label">
          <div
            class="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
          >
            <label id="language-label" for="language-search" class="mb-1 flex justify-between px-1 text-xs font-semibold">
              Language <span class="font-normal opacity-70">{{ languages.length }}</span>
            </label>
            <input
              id="language-search"
              v-model="searchGrammar"
              type="search"
              placeholder="Filter languages…"
              class="w-full text-xs px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
            />
          </div>
          <div
            class="flex-auto overflow-auto relative custom-scrollbar bg-white dark:bg-gray-850"
          >
            <button
              v-for="g in filteredGrammars"
              :key="g.id"
              :aria-pressed="g.id === grammar"
              class="w-full px-3 py-2 text-left text-xs border-b border-gray-100 dark:border-gray-800/50 truncate transition-colors"
              :class="
                g.id === grammar
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-semibold border-l-2 border-l-blue-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-l-transparent text-gray-700 dark:text-gray-300'
              "
              @click="grammar = g.id"
            >
              {{ g.name }}
            </button>
            <p v-if="!filteredGrammars.length" class="px-3 py-2 text-xs opacity-70">No matching languages</p>
          </div>
        </section>

        <!-- Theme -->
        <section class="flex-1 min-h-0 flex flex-col md:h-1/2" aria-labelledby="theme-label">
          <div
            class="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
          >
            <label id="theme-label" for="theme-search" class="mb-1 flex justify-between px-1 text-xs font-semibold">
              Theme <span class="font-normal opacity-70">{{ themes.length }}</span>
            </label>
            <input
              id="theme-search"
              v-model="searchTheme"
              type="search"
              placeholder="Filter themes…"
              class="w-full text-xs px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-400"
            />
          </div>
          <div
            class="flex-auto overflow-auto relative custom-scrollbar bg-white dark:bg-gray-850"
          >
            <button
              v-for="t in filteredThemes"
              :key="t.id"
              :aria-pressed="t.id === theme"
              class="w-full px-3 py-2 text-left text-xs border-b border-gray-100 dark:border-gray-800/50 truncate transition-colors"
              :class="
                t.id === theme
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-semibold border-l-2 border-l-purple-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-l-transparent text-gray-700 dark:text-gray-300'
              "
              @click="theme = t.id"
            >
              {{ t.displayName }}
            </button>
            <p v-if="!filteredThemes.length" class="px-3 py-2 text-xs opacity-70">No matching themes</p>
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
        class="flex-[3] min-h-0 relative border-b border-gray-800 flex flex-col"
      >
        <div class="flex items-center justify-between gap-4 border-b border-gray-700 bg-[#21262d] px-3 py-2.5 text-xs text-gray-300">
          <h2 class="font-semibold">Language sample</h2>
          <p class="truncate">{{ selectedLanguageName }} · {{ currentThemeDisplayName }}</p>
        </div>
        <p v-if="sampleStatus !== 'ready'" role="status" class="p-4 text-sm text-gray-300">
          {{ sampleStatus === "loading" ? "Loading sample…" : "Could not load the sample." }}
        </p>
        <div v-show="sampleStatus === 'ready'" class="flex-1 min-h-0">
          <CodeMirror v-if="cmProps.lang.value" v-bind="cmProps" @perf="onPerf" />
        </div>
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
          <button
            class="rounded border border-gray-600 px-2 py-1 text-[11px] font-medium text-gray-200 transition-colors hover:border-gray-400 hover:bg-gray-700/60"
            @click="copyCurrentCode"
          >
            {{ isCodeCopied ? "Copied" : "Copy setup" }}
          </button>
        </div>
        <div
          class="flex flex-wrap items-center gap-2 border-b border-gray-800 bg-[#1b222c] px-3 py-2 text-[11px] text-gray-300"
        >
          <span
            v-for="item in currentCodeMeta"
            :key="item.label"
            class="rounded-full border border-gray-700 bg-gray-800/80 px-2.5 py-1 font-medium"
          >
            {{ item.label }}: {{ item.value }}
          </span>
          <span class="text-gray-400">
            Recreate the highlighter when switching engines.
          </span>
        </div>
        <div class="flex-auto min-h-0 relative">
          <CodeMirror class="absolute inset-0 text-sm" v-bind="configCmProps" />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch } from "vue";
import { bundledLanguagesInfo as languages } from "shiki/langs";
import { bundledThemesInfo as themes } from "shiki/themes";
import { useStorage } from "@vueuse/core";
import type { CMProps } from "./types";
import CodeMirror from "./CodeMirror.vue";
import { loadSample } from "./samples";

type EngineMode = CMProps["engine"];
type AppMode = CMProps["mode"];
const DEFAULT_GRAMMAR = "javascript";
const DEFAULT_THEME = "github-light";

const theme = useStorage("tm-theme", DEFAULT_THEME);
const grammar = useStorage("tm-grammar", DEFAULT_GRAMMAR);
const engine = useStorage<EngineMode>("tm-engine", "oniguruma");
const appMode = useStorage<AppMode>("tm-mode", "editor");

const searchGrammar = ref("");
const searchTheme = ref("");
const perfMs = ref(0);
const isCodeCopied = ref(false);
const sampleStatus = ref<"loading" | "ready" | "error">("loading");

if (!languages.some(({ id }) => id === grammar.value)) {
  grammar.value = DEFAULT_GRAMMAR;
}
if (!themes.some(({ id }) => id === theme.value)) {
  theme.value = DEFAULT_THEME;
}

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
  return languages.filter(({ id, name, aliases }) =>
    [id, name, ...(aliases ?? [])].some((value) =>
      value.toLowerCase().includes(keyword),
    ),
  );
});

const filteredThemes = computed(() => {
  const keyword = searchTheme.value.trim().toLowerCase();
  return themes.filter(({ id, displayName }) =>
    [id, displayName].some((value) => value.toLowerCase().includes(keyword)),
  );
});

const currentCodeTitle = computed(() => {
  if (cmProps.mode === "shiki") return "Setup with @cmshiki/shiki";
  return "Setup with @cmshiki/editor";
});

const currentGrammarDisplayName = computed(
  () =>
    languages.find(({ id }) => id === cmProps.lang.name)?.name ||
    cmProps.lang.name,
);

const selectedLanguageName = computed(
  () => languages.find(({ id }) => id === grammar.value)?.name || grammar.value,
);

const currentThemeDisplayName = computed(
  () => themes.find(({ id }) => id === theme.value)?.displayName || theme.value,
);

const currentEngineFactory = computed(() =>
  cmProps.engine === "javascript"
    ? "createJavaScriptRegexEngine()"
    : "createOnigurumaEngine(() => import('shiki/wasm'))",
);

const currentCodeMeta = computed(() => [
  { label: "Integration", value: cmProps.mode === "editor" ? "ShikiEditor" : "shiki" },
  { label: "Language", value: currentGrammarDisplayName.value },
  { label: "Theme", value: currentThemeDisplayName.value },
  { label: "Engine", value: cmProps.engine },
]);

const currentCodeDisplay = computed(() => {
  if (cmProps.mode === "shiki") {
    return `import { EditorView } from '@codemirror/view';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { shikiToCodeMirror } from '@cmshiki/shiki';

const highlighter = await createHighlighterCore({
  langs: [await import('./grammars/${cmProps.lang.name}.json').then((m) => m.default)],
  themes: [await import('./themes/${cmProps.theme.name}.json').then((m) => m.default)],
  engine: ${currentEngineFactory.value},
});

const { shiki } = await shikiToCodeMirror({
  highlighter,
  lang: '${cmProps.lang.name}',
  theme: '${cmProps.theme.name}',
  themeStyle: 'cm',
  defaultColor: 'light',
});

const view = new EditorView({
  doc: '...',
  parent: document.getElementById('editor')!,
  extensions: [shiki],
});

view.dispatch({
  changes: { from: 0, to: view.state.doc.length, insert: 'new code' },
});

// 切换语言、主题或引擎时，建议重新创建 highlighter 与 view。`;
  } else {
    return `import { ShikiEditor } from '@cmshiki/editor';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const highlighter = await createHighlighterCore({
  langs: [await import('./grammars/${cmProps.lang.name}.json').then((m) => m.default)],
  themes: [await import('./themes/${cmProps.theme.name}.json').then((m) => m.default)],
  engine: ${currentEngineFactory.value},
});

const editor = await ShikiEditor.create({
  parent: document.getElementById('editor')!,
  doc: '...',
  highlighter,
  lang: '${cmProps.lang.name}',
  themes: {
    light: '${cmProps.theme.name}',
  },
  defaultColor: 'light',
  themeStyle: 'cm',
  cssVariablePrefix: '--cm-',
});

editor.setDoc('new code');
editor.render({
  lang: '${cmProps.lang.name}',
  theme: '${cmProps.theme.name}',
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
  readonly: true,
}));

watch(
  grammar,
  async (name, _, onCleanup) => {
    let stale = false;
    onCleanup(() => {
      stale = true;
    });
    sampleStatus.value = "loading";
    try {
      const value = await loadSample(name);
      if (stale) return;
      cmProps.lang = { name, value, grammar: name };
      sampleStatus.value = "ready";
    } catch {
      if (!stale) sampleStatus.value = "error";
    }
  },
  { immediate: true },
);

watch(theme, (name) => {
  cmProps.theme = { name, value: name };
});

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

async function copyCurrentCode() {
  try {
    await navigator.clipboard.writeText(currentCodeDisplay.value);
    isCodeCopied.value = true;
    window.setTimeout(() => {
      isCodeCopied.value = false;
    }, 1200);
  } catch (error) {
    console.error("Failed to copy current code:", error);
  }
}

function getPerfColor(time: number) {
  if (time < 50) return "text-green-600 dark:text-green-400";
  if (time < 150) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}
</script>

<style>
body {
  padding: 0;
}
</style>
