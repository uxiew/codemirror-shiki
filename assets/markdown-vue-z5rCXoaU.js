const n=`# 在 Markdown 里编写 Vue

围栏代码块保留 Vue 模板、脚本和样式的高亮。

\`\`\`vue
<script setup lang="ts">
import { ref } from 'vue';
const count = ref(0);
<\/script>

<template>
  <button class="counter" @click="count++">
    已探索 {{ count }} 种语法
  </button>
</template>

<style scoped>
.counter { color: #d66a3a; border-radius: 8px; }
</style>
\`\`\`
`;export{n as default};
