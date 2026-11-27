const n=`<script setup lang="ts">
import { ref } from 'vue';

const accent = ref('#d66a3a');
const theme = { surface: '#fdf0e9', radius: '12px' };
<\/script>

<template>
  <article class="card">
    <h1>响应式配色</h1>
    <input v-model="accent" type="color" />
  </article>
</template>

<style scoped>
.card {
  color: v-bind(accent);
  background: v-bind('theme.surface');
  border-radius: v-bind('theme.radius');
  padding: 24px;
}
</style>
`;export{n as default};
