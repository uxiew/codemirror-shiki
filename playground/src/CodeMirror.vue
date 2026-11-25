<template>
  <div class="editor-host">
    <p v-if="loadError" role="alert" class="editor-message">{{ loadError }}</p>
    <p v-else-if="!editorInstance" role="status" class="editor-message">
      正在加载语法与主题…
    </p>
    <div class="editor-host" ref="editorView"></div>
  </div>
</template>

<script setup lang="ts">
import { EditorState, type Extension } from "@codemirror/state";
import {
  highlightSpecialChars,
  drawSelection,
  keymap,
  lineNumbers,
  highlightActiveLine,
} from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { minimalSetup } from "codemirror";
import {
  defaultKeymap,
  indentWithTab,
  historyKeymap,
} from "@codemirror/commands";
import { bundledThemesInfo } from "shiki/themes";
import { ShikiEditor } from "@cmshiki/editor";
import { shikiToCodeMirror } from "@cmshiki/shiki";
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { type CMProps } from "./types";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { getLanguage, loadGrammars } from "./grammars";

const props = defineProps<CMProps>();

const editorView = ref<HTMLDivElement>();
const editorInstance = shallowRef<ShikiEditor | EditorView>();
const loadError = ref("");
let activeHighlighter: HighlighterCore | undefined;
let runId = 0;

const emit = defineEmits<{
  perf: [number];
  change: [string];
}>();

function createSharedExtensions(): Extension[] {
  return [
    minimalSetup,
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    highlightSpecialChars(),
    drawSelection(),
    lineNumbers(),
    highlightActiveLine(),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !props.readonly) {
        emit("change", update.state.doc.toString());
      }
    }),
    ...(props.readonly
      ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
      : []),
  ];
}

watch(
  () => [
    props.lang.value,
    props.lang.name,
    props.theme.name,
    props.engine,
    props.mode,
    props.readonly,
  ],
  async (nextValues, prevValues) => {
    if (
      nextValues[1] !== prevValues[1] ||
      nextValues[2] !== prevValues[2] ||
      nextValues[3] !== prevValues[3] ||
      nextValues[4] !== prevValues[4] ||
      nextValues[5] !== prevValues[5]
    ) {
      await run();
      return;
    }

    if (!editorInstance.value) return;
    syncDocument(nextValues[0] as string);
  },
);

async function createPlaygroundHighlighter(lang: string, theme: string) {
  const themeInfo = bundledThemesInfo.find(({ id }) => id === theme);
  if (!themeInfo) throw new Error("Unknown theme");

  return createHighlighterCore({
    langs: await loadGrammars(lang),
    themes: [themeInfo.import()],
    engine:
      props.engine === "javascript"
        ? createJavaScriptRegexEngine()
        : createOnigurumaEngine(() => import("shiki/wasm")),
  });
}

/**
 * 将最新文档内容同步到当前编辑器实例。
 */
function syncDocument(doc: string) {
  if (!editorInstance.value) return;

  if (editorInstance.value instanceof ShikiEditor) {
    const editor = editorInstance.value;
    if (editor.getDoc() !== doc) {
      editor.setDoc(doc);
    }
    return;
  }

  const view = editorInstance.value;
  const current = view.state.doc.toString();
  if (current === doc) return;

  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: doc,
    },
  });
}

function disposeEditor() {
  editorInstance.value?.destroy();
  editorInstance.value = undefined;
  activeHighlighter?.dispose();
  activeHighlighter = undefined;
}

async function run() {
  const currentRunId = ++runId;
  const parent = editorView.value;
  const lang = props.lang.name;
  const highlightLang = getLanguage(lang).host;
  const theme = props.theme.name;
  loadError.value = "";
  disposeEditor();
  if (!parent) return;

  const start = performance.now();
  let highlighter: HighlighterCore | undefined;
  try {
    highlighter = await createPlaygroundHighlighter(lang, theme);
    if (currentRunId !== runId) return;

    let nextInstance: ShikiEditor | EditorView;
    const sharedExtensions = createSharedExtensions();

    if (props.mode === "editor") {
      nextInstance = await ShikiEditor.create({
        highlighter,
        lang: highlightLang,
        themes: { light: theme },
        defaultColor: "light",
        themeStyle: "cm",
        cssVariablePrefix: "--cm-",
        doc: props.lang.value,
        parent,
        extensions: sharedExtensions,
      });
    } else {
      const { shiki } = await shikiToCodeMirror({
        highlighter,
        lang: highlightLang,
        theme,
        themeStyle: "cm",
        defaultColor: "light",
      });
      if (currentRunId !== runId) return;

      nextInstance = new EditorView({
        doc: props.lang.value,
        parent,
        extensions: [...sharedExtensions, shiki],
      });
    }

    if (currentRunId !== runId) {
      nextInstance.destroy();
      return;
    }

    editorInstance.value = nextInstance;
    activeHighlighter = highlighter;
    highlighter = undefined;
    syncDocument(props.lang.value);
    await nextTick();
    if (currentRunId === runId) emit("perf", performance.now() - start);
  } catch (error) {
    if (currentRunId !== runId) return;
    loadError.value = `无法加载 ${lang} / ${theme}，请切换语法或正则引擎后重试。`;
    console.error(loadError.value, error);
  } finally {
    highlighter?.dispose();
  }
}

onMounted(() => {
  void run();
});

onBeforeUnmount(() => {
  runId += 1;
  disposeEditor();
});

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    void run();
  });
}
</script>

<style scoped>
.editor-host {
  height: 100%;
  overflow: hidden;
  background-color: transparent;
}

.editor-message {
  padding: 24px;
  color: var(--muted);
  font-size: 13px;
}

:deep(.cm-editor) {
  height: 100%;
}

:deep(.cm-scroller) {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  line-height: 1.85;
}

:deep(.cm-content) {
  padding: 20px 0 80px;
}

:deep(.cm-line) {
  padding: 0 24px 0 16px;
}

:deep(.cm-gutters) {
  border: 0;
  background: transparent;
  color: var(--muted);
}

:deep(.cm-lineNumbers .cm-gutterElement) {
  min-width: 48px;
  padding: 0 12px;
}

:deep(.cm-activeLine),
:deep(.cm-activeLineGutter) {
  background: color-mix(in srgb, currentColor 4%, transparent);
}

:deep(.cm-focused) {
  outline: none;
}
</style>
