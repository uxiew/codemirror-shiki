<template>
  <button @click="changeShikiTheme">更改主题</button>
  <div id="cm-editor" ref="editorView"></div>
</template>

<script setup lang="ts">
import {
  EditorView,
  highlightSpecialChars,
  drawSelection,
  keymap,
  lineNumbers,
  highlightActiveLine
} from '@codemirror/view';
import { minimalSetup } from 'codemirror';

import { rust } from '@codemirror/lang-rust';
import {
  defaultKeymap,
  indentWithTab,
  historyKeymap
} from '@codemirror/commands';

import { javascript } from '@codemirror/lang-javascript';

import { ShikiEditor } from '.././../packages/editor/src';

import { onMounted, ref } from 'vue';
import { type CMProps } from './App.vue';

const props = defineProps<CMProps>();

let editorView = ref<HTMLDivElement>();
let editor = ref<ShikiEditor>();

watch(
  () => [props.lang.value, props.lang.name, props.theme.name],
  (v, o) => {
    if (v[0] !== o[0]) {
      editor.value?.setValue(v[0]);
    }
    if (v[1] !== o[1] || v[2] !== o[2]) {
      editor.value?.update({
        lang: v[1],
        theme: v[2]
      });
    }
  }
);

async function changeShikiTheme() {
  editor.value?.changeTheme('dim');
  console.log(editor.value?.getValue());
}

async function run() {
  console.log(props.lang.name, props.theme.name);

  // editor.value?.destroy();
  editor.value = new ShikiEditor({
    lang: props.lang.name,
    theme: props.theme.name,
    // theme: {
    //   name: props.theme.name
    // },
    themes: {
      light: props.theme.name,
      dark: 'github-dark',
      dim: 'one-dark-pro'
      // any number of themes
    },
    cssVariablePrefix: '--cm-',
    // themeStyle: 'shiki',
    // defaultColor: false
    // // optional customizations
    // defaultColor: 'light'
    doc: props.lang.value,
    parent: editorView.value,
    extensions: [
      minimalSetup,
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      highlightSpecialChars(),
      drawSelection(),
      lineNumbers(),
      highlightActiveLine()
      // javascript({
      //   typescript: true
      // })
      // shikiWidgetPlugin(highlighter)
      // shiki,
      // solarizedDark,
      // syntaxHighlighting(defaultHighlightStyle)
      // oneDark,
      // oneDarkTheme,
      // syntaxHighlighting(oneDarkHighlightStyle)
      // rust()
    ]
  });
}

onMounted(() => {
  run();
});

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    run();
  });
}
</script>

<style scoped>
#cm-editor {
  height: 300px;
  overflow: auto;
}
</style>
