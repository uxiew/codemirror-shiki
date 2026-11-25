<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useStorage } from "@vueuse/core";
import { bundledThemesInfo as themes } from "shiki/themes";
import CodeMirror from "./CodeMirror.vue";
import {
  getGrammarDependencies,
  getGrammarImport,
  getLanguage,
  languages,
} from "./grammars";
import { loadSample } from "./samples";
import type { CMProps } from "./types";
import "./playground.css";

const grammar = useStorage("tm-grammar", "typescript");
const theme = useStorage("tm-theme", "github-light");
const engine = useStorage<CMProps["engine"]>("tm-engine", "oniguruma");
const mode = useStorage<CMProps["mode"]>("tm-mode", "editor");
const params = new URLSearchParams(window.location.search);
if (languages.some((item) => item.id === params.get("grammar")))
  grammar.value = params.get("grammar")!;
if (themes.some((item) => item.id === params.get("theme")))
  theme.value = params.get("theme")!;
if (!languages.some((item) => item.id === grammar.value))
  grammar.value = "typescript";
if (!themes.some((item) => item.id === theme.value))
  theme.value = "github-light";
if (!["oniguruma", "javascript"].includes(engine.value))
  engine.value = "oniguruma";
if (!["editor", "shiki"].includes(mode.value)) mode.value = "editor";
const sidebar = ref<"language" | "theme">("language");
const tab = ref<"preview" | "setup">("preview");
const search = ref("");
const injectionOnly = ref(false);
const themeFilter = ref("all");
const perfMs = ref<number>();
const sampleStatus = ref<"loading" | "ready" | "error">("loading");
const originalSample = ref("");
const copyStatus = ref("");
let copyTimer: ReturnType<typeof setTimeout> | undefined;
const selected = computed(() => getLanguage(grammar.value));
const selectedTheme = computed(
  () => themes.find((item) => item.id === theme.value)!,
);
const isDark = computed(() => selectedTheme.value.type === "dark");
const common = [
  "typescript",
  "javascript",
  "vue",
  "html",
  "css",
  "python",
  "rust",
  "json",
];
const query = computed(() => search.value.trim().toLowerCase());
const filteredLanguages = computed(() =>
  languages
    .filter((item) => !injectionOnly.value || item.injection)
    .filter((item) =>
      [item.id, item.displayName, ...(item.aliases || [])].some((value) =>
        value.toLowerCase().includes(query.value),
      ),
    )
    .sort((a, b) => {
      const rank = (id: string) =>
        common.includes(id) ? common.indexOf(id) : 100;
      return (
        rank(a.id) - rank(b.id) || a.displayName.localeCompare(b.displayName)
      );
    }),
);
const filteredThemes = computed(() =>
  themes.filter(
    (item) =>
      (themeFilter.value === "all" || item.type === themeFilter.value) &&
      [item.id, item.displayName].some((value) =>
        value.toLowerCase().includes(query.value),
      ),
  ),
);
const cmProps = reactive<CMProps>({
  lang: { name: grammar.value, value: "", grammar: grammar.value },
  theme: { name: theme.value, value: theme.value },
  engine: engine.value,
  mode: mode.value,
});
const lineCount = computed(() => cmProps.lang.value.split("\n").length);
const modified = computed(() => cmProps.lang.value !== originalSample.value);
const dependencies = computed(() => getGrammarDependencies(grammar.value));
const suffixes: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  python: "py",
  rust: "rs",
  "angular-ts": "ts",
  "angular-html": "html",
  "markdown-vue": "md",
  "markdown-nix": "md",
};
const filename = computed(
  () =>
    `${grammar.value}.${suffixes[grammar.value] || (selected.value.injection ? "sample" : grammar.value)}`,
);
const setupCode = computed(() => {
  const imports =
    mode.value === "editor"
      ? "import { ShikiEditor } from '@cmshiki/editor';"
      : "import { EditorView } from '@codemirror/view';\nimport { shikiToCodeMirror } from '@cmshiki/shiki';";
  const engineImport =
    engine.value === "javascript"
      ? "import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';"
      : "import { createOnigurumaEngine } from 'shiki/engine/oniguruma';";
  const langImports = dependencies.value
    .map(
      (name) => `    import('${getGrammarImport(name)}').then(m => m.default),`,
    )
    .join("\n");
  const create =
    mode.value === "editor"
      ? `const editor = await ShikiEditor.create({
  parent: document.getElementById('editor')!,
  doc: '// 在这里编写代码',
  highlighter,
  lang: '${selected.value.host}',
  themes: { active: '${theme.value}' },
  defaultColor: 'active',
});

// 页面卸载时释放资源。
// editor.destroy();
// highlighter.dispose();`
      : `const { shiki } = await shikiToCodeMirror({
  highlighter,
  lang: '${selected.value.host}',
  theme: '${theme.value}',
});

const view = new EditorView({
  parent: document.getElementById('editor')!,
  doc: '// 在这里编写代码',
  extensions: [shiki],
});

// 页面卸载时释放资源。
// view.destroy();
// highlighter.dispose();`;
  return `${imports}
import { createHighlighterCore } from 'shiki/core';
${engineImport}

// 按需加载 TextMate 语法及其嵌入依赖。
const highlighter = await createHighlighterCore({
  langs: await Promise.all([
${langImports}
  ]),
  themes: [import('shiki/themes/${theme.value}.mjs')],
  engine: ${engine.value === "javascript" ? "createJavaScriptRegexEngine()" : "createOnigurumaEngine(() => import('shiki/wasm'))"},
});

${selected.value.injection ? `// ${grammar.value} 在 ${selected.value.host} 的上下文中预览。\n` : ""}${create}`;
});
const setupProps = computed<CMProps>(() => ({
  lang: { name: "typescript", value: setupCode.value, grammar: "typescript" },
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
    perfMs.value = undefined;
    try {
      const value = await loadSample(name);
      if (stale) return;
      originalSample.value = value;
      cmProps.lang = { name, value, grammar: name };
      sampleStatus.value = "ready";
    } catch {
      if (!stale) sampleStatus.value = "error";
    }
  },
  { immediate: true },
);
watch([theme, engine, mode], ([themeName, engineName, modeName]) => {
  perfMs.value = undefined;
  cmProps.theme = { name: themeName, value: themeName };
  cmProps.engine = engineName;
  cmProps.mode = modeName;
});
watch(
  isDark,
  (dark) => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  },
  { immediate: true },
);
watch([grammar, theme], () => {
  const url = new URL(window.location.href);
  url.searchParams.set("grammar", grammar.value);
  url.searchParams.set("theme", theme.value);
  window.history.replaceState(null, "", url);
});
watch(sidebar, () => {
  search.value = "";
});
watch([tab, grammar, theme, engine, mode], () => {
  copyStatus.value = "";
});
onBeforeUnmount(() => {
  clearTimeout(copyTimer);
});
function toggleAppearance() {
  theme.value = isDark.value ? "github-light" : "github-dark";
}
async function copyCode() {
  try {
    await navigator.clipboard.writeText(
      tab.value === "setup" ? setupCode.value : cmProps.lang.value,
    );
    copyStatus.value = "已复制";
  } catch {
    copyStatus.value = "复制失败，请手动选择代码";
  }
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copyStatus.value = "";
  }, 2200);
}
</script>

<template>
  <div class="playground" :class="{ 'is-dark': isDark }">
    <header class="site-header">
      <a
        class="brand"
        href="https://github.com/uxiew/codemirror-shiki"
        target="_blank"
        rel="noreferrer"
        ><span class="brand-mark" aria-hidden="true">&lt;/&gt;</span
        ><span
          >cmshiki<span class="brand-divider">/</span
          ><span class="brand-subtitle">语法实验室</span></span
        ></a
      >
      <nav class="header-links" aria-label="项目链接">
        <a
          href="https://textmate-grammars-themes.netlify.app"
          target="_blank"
          rel="noreferrer"
          >语法来源 ↗</a
        >
        <a
          href="https://github.com/uxiew/codemirror-shiki"
          target="_blank"
          rel="noreferrer"
          >GitHub ↗</a
        >
        <span class="header-rule"></span>
        <button
          class="icon-button"
          :aria-label="isDark ? '切换到浅色主题' : '切换到深色主题'"
          @click="toggleAppearance"
        >
          <span
            :class="isDark ? 'i-carbon-sun' : 'i-carbon-moon'"
            aria-hidden="true"
          ></span>
        </button>
      </nav>
    </header>
    <section class="intro">
      <div>
        <p class="eyebrow"><span class="live-dot"></span>CODEMIRROR × SHIKI</p>
        <h1>好代码，也要好看<span>。</span></h1>
        <p class="intro-description">
          探索 TextMate 语法与主题，在编辑器里找到你的配色。
        </p>
      </div>
      <div class="intro-stats" aria-label="可用资源">
        <div>
          <strong>{{ languages.length }}</strong
          ><span>种语法</span>
        </div>
        <span class="stats-rule"></span>
        <div>
          <strong>{{ themes.length }}</strong
          ><span>款主题</span>
        </div>
        <span class="stats-rule"></span>
        <div><strong>18</strong><span>种嵌入 / 注入</span></div>
      </div>
    </section>
    <main class="workbench">
      <aside class="sidebar" aria-label="语法与主题选择">
        <div class="sidebar-tabs" role="tablist" aria-label="资源类型">
          <button
            id="language-tab"
            role="tab"
            :aria-selected="sidebar === 'language'"
            aria-controls="resource-panel"
            :class="{ active: sidebar === 'language' }"
            @click="sidebar = 'language'"
          >
            <span class="i-carbon-code" aria-hidden="true"></span>语法
            <span class="count">{{ languages.length }}</span>
          </button>
          <button
            id="theme-tab"
            role="tab"
            :aria-selected="sidebar === 'theme'"
            aria-controls="resource-panel"
            :class="{ active: sidebar === 'theme' }"
            @click="sidebar = 'theme'"
          >
            <span class="i-carbon-color-palette" aria-hidden="true"></span>主题
            <span class="count">{{ themes.length }}</span>
          </button>
        </div>
        <div class="search-box">
          <span class="i-carbon-search" aria-hidden="true"></span
          ><input
            v-model="search"
            type="search"
            :aria-label="sidebar === 'language' ? '搜索语法' : '搜索主题'"
            :placeholder="
              sidebar === 'language' ? '搜索语法或别名…' : '搜索主题…'
            "
          />
        </div>
        <div
          class="filter-row"
          v-if="sidebar === 'language'"
          aria-label="语法筛选"
        >
          <button
            :class="{ active: !injectionOnly }"
            :aria-pressed="!injectionOnly"
            @click="injectionOnly = false"
          >
            全部语法</button
          ><button
            :class="{ active: injectionOnly }"
            :aria-pressed="injectionOnly"
            @click="injectionOnly = true"
          >
            嵌入 / 注入 <span>18</span>
          </button>
        </div>
        <div class="filter-row" v-else aria-label="主题筛选">
          <button
            v-for="item in [
              { id: 'all', name: '全部' },
              { id: 'light', name: '浅色' },
              { id: 'dark', name: '深色' },
            ]"
            :key="item.id"
            :class="{ active: themeFilter === item.id }"
            :aria-pressed="themeFilter === item.id"
            @click="themeFilter = item.id"
          >
            {{ item.name }}
          </button>
        </div>
        <section
          id="resource-panel"
          class="resource-list"
          role="tabpanel"
          :aria-labelledby="
            sidebar === 'language' ? 'language-tab' : 'theme-tab'
          "
        >
          <p class="list-heading">
            {{
              query
                ? "搜索结果"
                : sidebar === "language"
                  ? injectionOnly
                    ? "嵌入与注入语法"
                    : "选择一种语言"
                  : "选择你的配色"
            }}<span>{{
              sidebar === "language"
                ? filteredLanguages.length
                : filteredThemes.length
            }}</span>
          </p>
          <template v-if="sidebar === 'language'">
            <button
              v-for="item in filteredLanguages"
              :key="item.id"
              class="resource-item"
              :class="{ selected: grammar === item.id }"
              :aria-pressed="grammar === item.id"
              @click="grammar = item.id"
            >
              <span
                class="language-glyph"
                :class="{ injection: item.injection }"
                aria-hidden="true"
                >{{ item.injection ? "↳" : "{ }" }}</span
              ><span class="resource-name"
                >{{ item.displayName
                }}<small v-if="item.injection">{{
                  item.host === item.id ? "嵌入语法" : `${item.host} 上下文`
                }}</small></span
              ><span
                v-if="grammar === item.id"
                class="i-carbon-checkmark selection-check"
                aria-hidden="true"
              ></span>
            </button>
            <p v-if="!filteredLanguages.length" class="empty-state">
              没有匹配的语法<br /><span>试试名称或别名，如 ts、vue</span>
            </p>
          </template>
          <template v-else>
            <button
              v-for="item in filteredThemes"
              :key="item.id"
              class="resource-item"
              :class="{ selected: theme === item.id }"
              :aria-pressed="theme === item.id"
              @click="theme = item.id"
            >
              <span class="theme-swatch" :class="item.type" aria-hidden="true"
                ><i></i><i></i><i></i></span
              ><span class="resource-name">{{ item.displayName }}</span
              ><span
                v-if="theme === item.id"
                class="i-carbon-checkmark selection-check"
                aria-hidden="true"
              ></span>
            </button>
            <p v-if="!filteredThemes.length" class="empty-state">
              没有匹配的主题<br /><span>换个关键词试试</span>
            </p>
          </template>
        </section>
        <div class="sidebar-footer">
          <span class="live-dot"></span>按需加载，切换即预览
        </div>
      </aside>
      <section class="workspace" aria-label="代码工作区">
        <div class="workspace-toolbar">
          <div class="segmented" aria-label="接入方式">
            <button
              :class="{ active: mode === 'editor' }"
              :aria-pressed="mode === 'editor'"
              @click="mode = 'editor'"
            >
              ShikiEditor</button
            ><button
              :class="{ active: mode === 'shiki' }"
              :aria-pressed="mode === 'shiki'"
              @click="mode = 'shiki'"
            >
              Shiki 扩展
            </button>
          </div>
          <label class="engine-select"
            >正则引擎
            <select v-model="engine" aria-label="正则引擎">
              <option value="oniguruma">Oniguruma</option>
              <option value="javascript">JavaScript</option>
            </select></label
          >
        </div>
        <div class="editor-tabs" role="tablist" aria-label="代码视图">
          <button
            id="preview-tab"
            role="tab"
            aria-controls="editor-panel"
            :aria-selected="tab === 'preview'"
            :class="{ active: tab === 'preview' }"
            @click="tab = 'preview'"
          >
            <span class="i-carbon-code" aria-hidden="true"></span
            >代码预览</button
          ><button
            id="setup-tab"
            role="tab"
            aria-controls="editor-panel"
            :aria-selected="tab === 'setup'"
            :class="{ active: tab === 'setup' }"
            @click="tab = 'setup'"
          >
            <span class="i-carbon-terminal" aria-hidden="true"></span
            >接入代码</button
          ><span class="editor-tab-hint">{{
            tab === "preview" ? "可直接编辑" : "复制即可开始"
          }}</span>
        </div>
        <div class="file-toolbar">
          <div class="file-label">
            <span class="file-dot"></span
            ><span>{{ tab === "preview" ? filename : "setup.ts" }}</span
            ><span
              v-if="modified && tab === 'preview'"
              class="modified-dot"
              aria-label="已修改"
            ></span>
          </div>
          <div class="file-actions">
            <button
              v-if="tab === 'preview'"
              :disabled="!modified"
              @click="cmProps.lang.value = originalSample"
            >
              <span class="i-carbon-reset" aria-hidden="true"></span
              >重置</button
            ><button @click="copyCode">
              <span class="i-carbon-copy" aria-hidden="true"></span
              >{{ copyStatus || "复制代码" }}
            </button>
          </div>
        </div>
        <div
          v-if="selected.injection && tab === 'preview'"
          class="injection-note"
        >
          <span class="i-carbon-information" aria-hidden="true"></span
          ><span
            >{{ selected.id
            }}<template v-if="selected.host !== selected.id">
              在 <strong>{{ selected.host }}</strong> 上下文中预览</template
            ><template v-else> 嵌入语法预览</template>，依赖已自动加载</span
          >
        </div>
        <div
          id="editor-panel"
          class="editor-panel"
          role="tabpanel"
          :aria-labelledby="tab === 'preview' ? 'preview-tab' : 'setup-tab'"
        >
          <template v-if="tab === 'preview'"
            ><p
              v-if="sampleStatus !== 'ready'"
              class="loading-message"
              role="status"
            >
              {{
                sampleStatus === "loading"
                  ? "正在加载示例…"
                  : "示例加载失败，请切换语法后重试。"
              }}
            </p>
            <CodeMirror
              v-else
              v-bind="cmProps"
              @perf="perfMs = $event"
              @change="cmProps.lang.value = $event"
          /></template>
          <CodeMirror v-else v-bind="setupProps" />
        </div>
        <footer class="editor-status">
          <span><span class="live-dot"></span>{{ selected.displayName }}</span
          ><span class="status-theme">{{ selectedTheme.displayName }}</span
          ><span class="status-spacer"></span><span>{{ lineCount }} 行</span
          ><span v-if="perfMs !== undefined"
            >初始化 {{ perfMs.toFixed(1) }} ms</span
          ><span>UTF-8</span>
        </footer>
      </section>
    </main>
    <footer class="page-footer">
      <p>CodeMirror 的编辑体验，Shiki 的高亮表现。</p>
      <p>
        由
        <a href="https://codemirror.net" target="_blank" rel="noreferrer"
          >CodeMirror</a
        >、<a href="https://shiki.style" target="_blank" rel="noreferrer"
          >Shiki</a
        >
        与 TextMate 驱动 ↗
      </p>
    </footer>
    <span class="sr-only" role="status">{{ copyStatus }}</span>
  </div>
</template>
