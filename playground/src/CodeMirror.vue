<template>
  <div id="cm-editor" ref="editorView"></div>
</template>

<script setup lang="ts">
import { EditorState } from "@codemirror/state";
import {
  highlightSpecialChars,
  drawSelection,
  keymap,
  lineNumbers,
  highlightActiveLine,
  type EditorViewConfig,
} from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { minimalSetup } from "codemirror";
import {
  defaultKeymap,
  indentWithTab,
  historyKeymap,
} from "@codemirror/commands";
import { injections, grammars } from "tm-grammars";
import { ShikiEditor } from "@cmshiki/editor";
import { shikiToCodeMirror } from "@cmshiki/shiki";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { type CMProps } from "./types";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const props = defineProps<CMProps>();

const editorView = ref<HTMLDivElement>();
const editorInstance = ref<ShikiEditor | EditorView>();
let runId = 0;

const emit = defineEmits<{
  perf: [number];
}>();

function createSharedExtensions(): NonNullable<EditorViewConfig["extensions"]> {
  return [
    minimalSetup,
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    highlightSpecialChars(),
    drawSelection(),
    lineNumbers(),
    highlightActiveLine(),
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
    if (!editorInstance.value || !prevValues) return;

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

    const start = performance.now();
    syncDocument(nextValues[0] as string);
    await nextTick();
    emit("perf", performance.now() - start);
  },
);

/**
 * 按当前语言名递归加载主语法及其内嵌语法。
 */
async function loadLanguageBundle(name: string) {
  const langMap = new Map<string, Promise<unknown>>();

  const load = (langName: string) => {
    if (langMap.has(langName)) return langMap.get(langName)!;

    const info =
      grammars.find((item) => item.name === langName) ||
      injections.find((item) => item.name === langName);

    const promise = import(
      `../node_modules/tm-grammars/grammars/${langName}.json`
    ).then((module) => module.default);

    langMap.set(langName, promise);
    info?.embedded?.forEach(load);
    return promise;
  };

  load(name);
  return Promise.all(Array.from(langMap.values()));
}

/**
 * 加载当前选中的 TextMate 主题对象。
 */
async function loadThemeInput(name: string) {
  return import(`../node_modules/tm-themes/themes/${name}.json`).then(
    (module) => module.default,
  );
}

/**
 * 根据 playground 当前配置创建 Shiki highlighter。
 */
async function createPlaygroundHighlighter(): Promise<HighlighterCore> {
  const [langs, theme] = await Promise.all([
    loadLanguageBundle(props.lang.name),
    loadThemeInput(props.theme.name),
  ]);

  const engine =
    props.engine === "javascript"
      ? createJavaScriptRegexEngine()
      : createOnigurumaEngine(() => import("shiki/wasm"));

  return createHighlighterCore({
    langs,
    themes: [theme],
    engine,
  });
}

/**
 * 将最新文档内容同步到当前编辑器实例。
 */
function syncDocument(doc: string) {
  if (!editorInstance.value) return;

  if (props.mode === "editor") {
    const editor = editorInstance.value as ShikiEditor;
    if (editor.getDoc() !== doc) {
      editor.setDoc(doc);
    }
    return;
  }

  const view = editorInstance.value as EditorView;
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

/**
 * 重新创建当前 playground 使用的编辑器实例。
 */
async function run() {
  const currentRunId = ++runId;
  const previousInstance = editorInstance.value;
  editorInstance.value = undefined;
  previousInstance?.destroy();

  if (!editorView.value) return;

  const start = performance.now();
  const highlighter = await createPlaygroundHighlighter();

  if (currentRunId !== runId) {
    return;
  }

  let nextInstance: ShikiEditor | EditorView | undefined;
  const sharedExtensions = createSharedExtensions();

  if (props.mode === "editor") {
    nextInstance = await ShikiEditor.create({
      highlighter,
      lang: props.lang.name,
      themes: {
        light: props.theme.name,
      },
      defaultColor: "light",
      themeStyle: "cm",
      cssVariablePrefix: "--cm-",
      doc: props.lang.value,
      parent: editorView.value,
      extensions: sharedExtensions,
    });
  } else {
    const { shiki } = await shikiToCodeMirror({
      highlighter,
      lang: props.lang.name,
      theme: props.theme.name,
      themeStyle: "cm",
      defaultColor: "light",
    });

    if (currentRunId !== runId) {
      return;
    }

    nextInstance = new EditorView({
      doc: props.lang.value,
      parent: editorView.value,
      extensions: [...sharedExtensions, shiki],
    });
  }

  if (currentRunId !== runId) {
    nextInstance?.destroy();
    return;
  }

  editorInstance.value = nextInstance;

  await nextTick();
  emit("perf", performance.now() - start);
}

onMounted(() => {
  void run();
});

onBeforeUnmount(() => {
  runId += 1;
  editorInstance.value?.destroy();
});

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    void run();
  });
}
</script>

<style scoped>
#cm-editor {
  height: 100%;
  overflow: hidden;
  background-color: transparent;
}

:deep(.cm-editor) {
  height: 100%;
}
</style>
