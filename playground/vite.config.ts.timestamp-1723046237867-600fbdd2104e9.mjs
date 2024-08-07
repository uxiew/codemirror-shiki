// vite.config.ts
import path from "node:path";
import { defineConfig } from "file:///Users/bing/Projects/codemirror-shiki/node_modules/.pnpm/vite@5.3.4/node_modules/vite/dist/node/index.js";
import Vue from "file:///Users/bing/Projects/codemirror-shiki/node_modules/.pnpm/@vitejs+plugin-vue@5.0.5_vite@5.3.4_vue@3.4.33_typescript@5.5.3_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import Components from "file:///Users/bing/Projects/codemirror-shiki/node_modules/.pnpm/unplugin-vue-components@0.27.3_@babel+parser@7.24.8_rollup@4.18.1_vue@3.4.33_typescript@5.5.3_/node_modules/unplugin-vue-components/dist/vite.js";
import AutoImport from "file:///Users/bing/Projects/codemirror-shiki/node_modules/.pnpm/unplugin-auto-import@0.17.8_@vueuse+core@10.11.0_vue@3.4.33_typescript@5.5.3___rollup@4.18.1/node_modules/unplugin-auto-import/dist/vite.js";
import UnoCSS from "file:///Users/bing/Projects/codemirror-shiki/node_modules/.pnpm/unocss@0.59.4_postcss@8.4.39_rollup@4.18.1_vite@5.3.4/node_modules/unocss/dist/vite.mjs";
import VueMacros from "file:///Users/bing/Projects/codemirror-shiki/node_modules/.pnpm/unplugin-vue-macros@2.9.5_@vueuse+core@10.11.0_vue@3.4.33_typescript@5.5.3___esbuild@0.23.0_r_ekvii6z6rnrpazmn5r643qul24/node_modules/unplugin-vue-macros/dist/vite.mjs";
import VueRouter from "file:///Users/bing/Projects/codemirror-shiki/node_modules/.pnpm/unplugin-vue-router@0.8.8_rollup@4.18.1_vue-router@4.4.0_vue@3.4.33_typescript@5.5.3___vue@3.4.33_typescript@5.5.3_/node_modules/unplugin-vue-router/dist/vite.mjs";
import { VueRouterAutoImports } from "file:///Users/bing/Projects/codemirror-shiki/node_modules/.pnpm/unplugin-vue-router@0.8.8_rollup@4.18.1_vue-router@4.4.0_vue@3.4.33_typescript@5.5.3___vue@3.4.33_typescript@5.5.3_/node_modules/unplugin-vue-router/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/bing/Projects/codemirror-shiki/playground";
var vite_config_default = defineConfig({
  resolve: {
    alias: {
      "~/": `${path.resolve(__vite_injected_original_dirname, "src")}/`
    }
  },
  plugins: [
    VueMacros({
      defineOptions: false,
      defineModels: false,
      plugins: {
        vue: Vue({
          script: {
            propsDestructure: true,
            defineModel: true
          }
        })
      }
    }),
    // https://github.com/posva/unplugin-vue-router
    VueRouter(),
    // https://github.com/antfu/unplugin-auto-import
    AutoImport({
      imports: [
        "vue",
        "@vueuse/core",
        VueRouterAutoImports,
        {
          // add any other imports you were relying on
          "vue-router/auto": ["useLink"]
        }
      ],
      dts: true,
      dirs: [
        "./src/composables"
      ],
      vueTemplate: true
    }),
    // https://github.com/antfu/vite-plugin-components
    Components({
      dts: true
    }),
    // https://github.com/antfu/unocss
    // see uno.config.ts for config
    UnoCSS()
  ],
  // https://github.com/vitest-dev/vitest
  test: {
    environment: "jsdom"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYmluZy9Qcm9qZWN0cy9jb2RlbWlycm9yLXNoaWtpL3BsYXlncm91bmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9iaW5nL1Byb2plY3RzL2NvZGVtaXJyb3Itc2hpa2kvcGxheWdyb3VuZC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvYmluZy9Qcm9qZWN0cy9jb2RlbWlycm9yLXNoaWtpL3BsYXlncm91bmQvdml0ZS5jb25maWcudHNcIjsvLy8gPHJlZmVyZW5jZSB0eXBlcz1cInZpdGVzdFwiIC8+XG5cbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgVnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSdcbmltcG9ydCBDb21wb25lbnRzIGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGUnXG5pbXBvcnQgQXV0b0ltcG9ydCBmcm9tICd1bnBsdWdpbi1hdXRvLWltcG9ydC92aXRlJ1xuaW1wb3J0IFVub0NTUyBmcm9tICd1bm9jc3Mvdml0ZSdcbmltcG9ydCBWdWVNYWNyb3MgZnJvbSAndW5wbHVnaW4tdnVlLW1hY3Jvcy92aXRlJ1xuaW1wb3J0IFZ1ZVJvdXRlciBmcm9tICd1bnBsdWdpbi12dWUtcm91dGVyL3ZpdGUnXG5pbXBvcnQgeyBWdWVSb3V0ZXJBdXRvSW1wb3J0cyB9IGZyb20gJ3VucGx1Z2luLXZ1ZS1yb3V0ZXInXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gICAgcmVzb2x2ZToge1xuICAgICAgICBhbGlhczoge1xuICAgICAgICAgICAgJ34vJzogYCR7cGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpfS9gLFxuICAgICAgICB9LFxuICAgIH0sXG4gICAgcGx1Z2luczogW1xuICAgICAgICBWdWVNYWNyb3Moe1xuICAgICAgICAgICAgZGVmaW5lT3B0aW9uczogZmFsc2UsXG4gICAgICAgICAgICBkZWZpbmVNb2RlbHM6IGZhbHNlLFxuICAgICAgICAgICAgcGx1Z2luczoge1xuICAgICAgICAgICAgICAgIHZ1ZTogVnVlKHtcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wc0Rlc3RydWN0dXJlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5lTW9kZWw6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KSxcblxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vcG9zdmEvdW5wbHVnaW4tdnVlLXJvdXRlclxuICAgICAgICBWdWVSb3V0ZXIoKSxcblxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW50ZnUvdW5wbHVnaW4tYXV0by1pbXBvcnRcbiAgICAgICAgQXV0b0ltcG9ydCh7XG4gICAgICAgICAgICBpbXBvcnRzOiBbXG4gICAgICAgICAgICAgICAgJ3Z1ZScsXG4gICAgICAgICAgICAgICAgJ0B2dWV1c2UvY29yZScsXG4gICAgICAgICAgICAgICAgVnVlUm91dGVyQXV0b0ltcG9ydHMsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAvLyBhZGQgYW55IG90aGVyIGltcG9ydHMgeW91IHdlcmUgcmVseWluZyBvblxuICAgICAgICAgICAgICAgICAgICAndnVlLXJvdXRlci9hdXRvJzogWyd1c2VMaW5rJ10sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBkdHM6IHRydWUsXG4gICAgICAgICAgICBkaXJzOiBbXG4gICAgICAgICAgICAgICAgJy4vc3JjL2NvbXBvc2FibGVzJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB2dWVUZW1wbGF0ZTogdHJ1ZSxcbiAgICAgICAgfSksXG5cbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FudGZ1L3ZpdGUtcGx1Z2luLWNvbXBvbmVudHNcbiAgICAgICAgQ29tcG9uZW50cyh7XG4gICAgICAgICAgICBkdHM6IHRydWUsXG4gICAgICAgIH0pLFxuXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbnRmdS91bm9jc3NcbiAgICAgICAgLy8gc2VlIHVuby5jb25maWcudHMgZm9yIGNvbmZpZ1xuICAgICAgICBVbm9DU1MoKSxcbiAgICBdLFxuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3ZpdGVzdC1kZXYvdml0ZXN0XG4gICAgdGVzdDoge1xuICAgICAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcbiAgICB9LFxufSkiXSwKICAibWFwcGluZ3MiOiAiO0FBRUEsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sU0FBUztBQUNoQixPQUFPLGdCQUFnQjtBQUN2QixPQUFPLGdCQUFnQjtBQUN2QixPQUFPLFlBQVk7QUFDbkIsT0FBTyxlQUFlO0FBQ3RCLE9BQU8sZUFBZTtBQUN0QixTQUFTLDRCQUE0QjtBQVZyQyxJQUFNLG1DQUFtQztBQVl6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUN4QixTQUFTO0FBQUEsSUFDTCxPQUFPO0FBQUEsTUFDSCxNQUFNLEdBQUcsS0FBSyxRQUFRLGtDQUFXLEtBQUssQ0FBQztBQUFBLElBQzNDO0FBQUEsRUFDSjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ0wsVUFBVTtBQUFBLE1BQ04sZUFBZTtBQUFBLE1BQ2YsY0FBYztBQUFBLE1BQ2QsU0FBUztBQUFBLFFBQ0wsS0FBSyxJQUFJO0FBQUEsVUFDTCxRQUFRO0FBQUEsWUFDSixrQkFBa0I7QUFBQSxZQUNsQixhQUFhO0FBQUEsVUFDakI7QUFBQSxRQUNKLENBQUM7QUFBQSxNQUNMO0FBQUEsSUFDSixDQUFDO0FBQUE7QUFBQSxJQUdELFVBQVU7QUFBQTtBQUFBLElBR1YsV0FBVztBQUFBLE1BQ1AsU0FBUztBQUFBLFFBQ0w7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQTtBQUFBLFVBRUksbUJBQW1CLENBQUMsU0FBUztBQUFBLFFBQ2pDO0FBQUEsTUFDSjtBQUFBLE1BQ0EsS0FBSztBQUFBLE1BQ0wsTUFBTTtBQUFBLFFBQ0Y7QUFBQSxNQUNKO0FBQUEsTUFDQSxhQUFhO0FBQUEsSUFDakIsQ0FBQztBQUFBO0FBQUEsSUFHRCxXQUFXO0FBQUEsTUFDUCxLQUFLO0FBQUEsSUFDVCxDQUFDO0FBQUE7QUFBQTtBQUFBLElBSUQsT0FBTztBQUFBLEVBQ1g7QUFBQTtBQUFBLEVBR0EsTUFBTTtBQUFBLElBQ0YsYUFBYTtBQUFBLEVBQ2pCO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
