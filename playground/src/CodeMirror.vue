<template>
  <div>
    <button @click="changeShikiTheme">更改主题</button>
    <div id="cm-editor" ref="editorView"></div>
  </div>
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
import {
  type ShikiPluginActions,
  shikiToCodeMirror
} from '.././../packages/shiki/src';

import { javascript } from '@codemirror/lang-javascript';

import { onMounted, ref } from 'vue';
import { type CMProps } from './App.vue';

const props = defineProps<CMProps>();

let editorView = ref<HTMLDivElement>();
let editor = ref<EditorView>();
let editorActions = ref<ShikiPluginActions>();

watch(
  () => [props.lang.value, props.theme.value],
  (v, o) => {
    /* const transaction = cmRef?.current?.view?.state.update({
  changes: {
    from: 0,
    to: cmRef?.current.state?.doc.length,
    insert: exercise2.initialText,
  },
  selection: { anchor: exercise2.cursorStart },
});

if (transaction) {
  cmRef?.current?.view?.dispatch(transaction);
} */

    editor.value?.dispatch({
      changes: {
        from: 0,
        to: editor.value.state.doc.length,
        insert: v[0]
      }
    });
    console.log(v, props);
  }
);

async function changeShikiTheme() {
  const name = await editorActions.value!.getCurrentTheme();
  console.log(name);
  const allThemes = ['light', 'dark', 'dim'];
  await editorActions.value?.setTheme({
    theme: allThemes[allThemes.indexOf(name) + 1] || allThemes[0]
  });
}

async function run() {
  console.log('codemirror-props', props.theme, props.lang);

  const lang = {
    name: props.lang.name,
    value: props.lang.name
  };
  const theme = {
    name: props.theme.name,
    value: props.theme.value
  };

  /**
   *  | 'includeExplanation'
   */
  const { shiki, actions } = await shikiToCodeMirror({
    lang: props.lang.name,
    theme: 'one-dark-pro',
    // theme: {
    //   name: props.theme.name
    // },
    // themes: {
    //   light: 'one-dark-pro',
    //   dark: 'github-dark',
    //   dim: 'github-light'
    //   // any number of themes
    // },
    cssVariablePrefix: '--cm-'
    // defaultColor: false
    // // optional customizations
    // defaultColor: 'light'
  });

  editor.value = new EditorView({
    doc: props.lang.value,
    parent: editorView.value,
    extensions: [
      minimalSetup,
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      highlightSpecialChars(),
      drawSelection(),
      lineNumbers(),
      highlightActiveLine(),
      // javascript({
      //   typescript: true
      // })
      shiki
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
  editorActions.value = actions;
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
