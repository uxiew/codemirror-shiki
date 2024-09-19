<template>
  <Shiki
    :theme="theme"
    :grammar="grammar"
    @changeLang="changeLang"
    @changeTheme="changeTheme"
  />
  <h1 style="padding: 10px">CodeMirror Editor</h1>
  <CodeMirror h-100vh w-full grid="~ rows-[max-content_1fr]" v-bind="cmProps" />
  <h1 style="padding: 10px">CodeJar Editor</h1>
  <JarEditor h-100vh w-full grid="~ rows-[max-content_1fr]" v-bind="cmProps" />
</template>

<script setup lang="ts">
import JarEditor from './Editor.vue';
import CodeMirror from './CodeMirror.vue';
import Shiki from './Shiki.vue';

const theme = useStorage('tm-theme', 'github-light');
const grammar = useStorage('tm-grammar', 'typescript');

export interface CMProps {
  lang: {
    name: string;
    value: string;
    grammar: any;
  };
  theme: {
    name: string;
    value: string;
  };
}

const cmProps = reactive<CMProps>({
  lang: {
    name: grammar.value,
    value: grammar.value,
    grammar: grammar.value
  },
  theme: { name: theme.value, value: theme.value }
});

const changeLang = ({ name, value, grammar: langGrammar }: CMProps['lang']) => {
  grammar.value = name;
  cmProps.lang.name = name;
  cmProps.lang.value = value;
  cmProps.lang.grammar = langGrammar;
};

const changeTheme = ({ name, value }: CMProps['theme']) => {
  theme.value = name;
  cmProps.theme.name = name;
  cmProps.theme.value = value;
};
</script>

<style scoped></style>
