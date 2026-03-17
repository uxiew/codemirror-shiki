<template>
  <div id="cm-editor" ref="editorView"></div>
</template>

<script setup lang="ts">
import {
  highlightSpecialChars,
  drawSelection,
  keymap,
  lineNumbers,
  highlightActiveLine,
} from "@codemirror/view";
import { minimalSetup } from "codemirror";

import {
  defaultKeymap,
  indentWithTab,
  historyKeymap,
} from "@codemirror/commands";

import { ShikiEditor } from "@cmshiki/editor";

import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { type CMProps } from "./types";

const props = defineProps<CMProps>();

const editorView = ref<HTMLDivElement>();
const editor = ref<ShikiEditor>();

const emit = defineEmits<{
  perf: [number];
}>();

watch(
  () => [props.lang.value, props.lang.name, props.theme.name, props.engine],
  async (v, o) => {
    if (!editor.value || !o) return;

    const start = performance.now();
    if (v[0] !== o[0]) {
      editor.value?.setValue(v[0]);
    }
    if (v[1] !== o[1] || v[2] !== o[2] || v[3] !== o[3]) {
      const payload: Record<string, any> = {};
      if (v[1] !== o[1]) payload.lang = v[1];
      if (v[2] !== o[2]) payload.theme = v[2];
      if (v[3] !== o[3]) payload.engine = v[3];
      editor.value?.update(payload);
    }
    await nextTick();
    emit("perf", performance.now() - start);
  },
);

async function run() {
  editor.value?.destroy();
  editor.value = new ShikiEditor({
    lang: props.lang.name,
    theme: props.theme.name,
    engine: props.engine,
    themeStyle: "cm",
    defaultColor: "light",
    themes: {
      light: props.theme.name,
      dark: "github-dark",
    },
    cssVariablePrefix: "--cm-",
    doc: props.lang.value,
    parent: editorView.value,
    extensions: [
      minimalSetup,
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      highlightSpecialChars(),
      drawSelection(),
      lineNumbers(),
      highlightActiveLine(),
    ],
  });
}

onMounted(() => {
  run();
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    run();
  });
}
</script>

<style scoped>
#cm-editor {
  height: 100%;
  overflow: hidden;
}
:deep(.cm-editor) {
  height: 100%;
}
</style>
