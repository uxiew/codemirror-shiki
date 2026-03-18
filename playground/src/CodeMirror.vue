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
import { EditorView } from "@codemirror/view";
import { minimalSetup } from "codemirror";

import {
  defaultKeymap,
  indentWithTab,
  historyKeymap,
} from "@codemirror/commands";

import { ShikiEditor } from "@cmshiki/editor";
import { shikiToCodeMirror, updateEffect } from "@cmshiki/shiki";

import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { type CMProps } from "./types";

const props = defineProps<CMProps>();

const editorView = ref<HTMLDivElement>();
const editorInstance = ref<ShikiEditor | EditorView>();

const emit = defineEmits<{
  perf: [number];
}>();

watch(
  () => [props.lang.value, props.lang.name, props.theme.name, props.engine, props.mode],
  async (v, o) => {
    if (!editorInstance.value || !o) return;

    if (v[4] !== o[4]) {
      // mode changed, recreate editor
      await run();
      return;
    }

    const start = performance.now();
    
    if (props.mode === 'editor') {
      const editor = editorInstance.value as ShikiEditor;
      if (v[0] !== o[0]) {
        editor.setValue(v[0] as string);
      }
      if (v[1] !== o[1] || v[2] !== o[2] || v[3] !== o[3]) {
        const payload: Record<string, any> = {};
        if (v[1] !== o[1]) payload.lang = v[1];
        if (v[2] !== o[2]) payload.theme = v[2];
        if (v[3] !== o[3]) payload.engine = v[3];
        editor.update(payload);
      }
    } else {
      const view = editorInstance.value as EditorView;
      if (v[0] !== o[0]) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: v[0] as string }
        });
      }
      if (v[1] !== o[1] || v[2] !== o[2] || v[3] !== o[3]) {
        const payload: Record<string, any> = {};
        if (v[1] !== o[1]) payload.lang = v[1];
        if (v[2] !== o[2]) payload.theme = v[2];
        if (v[3] !== o[3]) payload.engine = v[3];
        view.dispatch({
          effects: updateEffect.of(payload)
        });
      }
    }
    await nextTick();
    emit("perf", performance.now() - start);
  },
);

async function run() {
  if (editorInstance.value) {
    editorInstance.value.destroy();
    editorInstance.value = undefined;
  }
  
  if (!editorView.value) return;

  const start = performance.now();

  if (props.mode === 'editor') {
    editorInstance.value = await ShikiEditor.create({
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
  } else {
    // Mode: @cmshiki/shiki 底层使用
    const { shiki } = await shikiToCodeMirror({
      lang: props.lang.name,
      theme: props.theme.name,
      engine: props.engine,
    });
    
    editorInstance.value = new EditorView({
      doc: props.lang.value,
      parent: editorView.value,
      extensions: [
        minimalSetup,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        highlightSpecialChars(),
        drawSelection(),
        lineNumbers(),
        highlightActiveLine(),
        shiki
      ],
    });
  }
  
  await nextTick();
  emit("perf", performance.now() - start);
}

onMounted(() => {
  run();
});

onBeforeUnmount(() => {
  if (editorInstance.value) {
    editorInstance.value.destroy();
  }
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
  background-color: transparent;
}
:deep(.cm-editor) {
  height: 100%;
}
</style>
