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

import { onMounted, ref } from 'vue';
import { type CMProps } from './App.vue';
import {
  createHighlighter,
  createShikiInternal,
  createHighlighterCore
} from 'shiki';

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

    // editorActions.value?.update({
    //   lang: props.lang.name,
    //   theme: props.theme.name
    //   // themes: { light: 'github-dark', dark: 'github-light', dim: 'one-dark-pro' },
    //   // cssVariablePrefix: 'ss',
    //   // defaultColor: false,
    // });
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
  console.log('codemirror-props', props, rust());

  const lang = {
    name: props.lang.name,
    value: props.lang.name
  };
  const theme = {
    name: props.theme.name,
    value: props.theme.value
  };

  // loads the themes and languages specified.
  const highlighter = await createHighlighter({
    themes: [
      props.theme.value,
      'one-dark-pro',
      'dracula',
      'github-light',
      'github-dark'
    ],
    langs: [props.lang.name, 'vue', 'rust', 'typescript', 'astro']
  });

  const { shiki, actions } = await shikiToCodeMirror(highlighter, {
    lang: props.lang.name,
    theme: props.theme.name,
    // theme: {
    //   name: props.theme.name
    // },
    themes: {
      light: 'github-dark',
      dark: 'github-light',
      dim: 'one-dark-pro'
      // any number of themes
    },
    includeExplanation: true,
    cssVariablePrefix: '--cm-'
    // defaultColor: false
    // // optional customizations
    // defaultColor: 'light'
    // themes: {
    //   light: 'one-dark-pro',
    //   dra: 'dracula',
    //   onedark: 'one-dark-pro'
    // }
  });

  editor.value = new EditorView({
    doc: props.lang.value,
    parent: editorView.value,
    extensions: [
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      highlightSpecialChars(),
      drawSelection(),
      lineNumbers(),
      highlightActiveLine(),
      // shikiWidgetPlugin(highlighter)
      shiki
      // solarizedDark,
      // shikiPluign(),
      // shiki()
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
