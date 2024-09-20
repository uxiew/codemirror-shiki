<template>
  <div class="h-300px" ref="editorContainer"></div>
  <div class="h-300px" ref="editorContainer1"></div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  createEditor,
  type SimpleEditor
} from '../../packages/editor/src/simple';
import { type CMProps } from './types';
const props = defineProps<CMProps>();

const editorContainer = ref<HTMLDivElement>();
const editorContainer1 = ref<HTMLDivElement>();

let editor = ref<SimpleEditor>();
let editor1 = ref<SimpleEditor>();

watch(
  () => [props.lang.value, props.lang.name, props.theme.name],
  (v, o) => {
    if (v[0] !== o[0]) {
      editor.value?.updateCode(v[0]);
      editor1.value?.update({
        code: v[0]
      });
    }
    if (v[1] !== o[1] || v[2] !== o[2]) {
      editor.value?.update({
        lang: v[1],
        theme: v[2]
      });
      editor1.value?.update({
        lang: v[1],
        theme: v[2]
      });
    }
    console.log(v);
  }
);

onMounted(() => {
  run();
});

async function run() {
  editor.value = await createEditor(editorContainer.value!, {
    code: props.lang.value,
    theme: props.theme.name,
    lang: props.lang.name
  });
  editor1.value = await createEditor(editorContainer1.value!, {
    code: props.lang.value,
    theme: props.theme.name,
    lang: props.lang.name
  });

  //   setTimeout(() => {
  //     codeEditor1.setLang('javascript');
  //     codeEditor1.setTheme('min-dark');

  //     codeEditor.setLang('rust');
  //     codeEditor.setTheme('monokai');
  //   }, 3000);
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    run();
  });
}
</script>

<style scoped></style>
