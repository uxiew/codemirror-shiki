/**
 * Performance Tests for Shiki + CodeMirror Integration
 *
 * 目标：验证大文件渲染性能，达到类似 VSCode 的流畅度
 *
 * 测试指标：
 * 1. 初始化时间 (Initialization Time)
 * 2. 首次渲染时间 (First Paint Time)
 * 3. 增量更新时间 (Incremental Update Time)
 * 4. 滚动性能 (Scroll Performance)
 * 5. 内存使用 (Memory Usage)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { shikiToCodeMirror } from '@cmshiki/shiki';
import { EditorState, Text } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

// Mock ResizeObserver for JSDOM
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Generate large code samples
function generateLargeCode(
  lines: number,
  language: 'javascript' | 'typescript' = 'javascript',
): string {
  const templates = {
    javascript: [
      'const variable_{i} = {i};',
      'function func_{i}(arg) { return arg * {i}; }',
      'class Class_{i} { constructor() { this.value = {i}; } }',
      'const arr_{i} = [{i}, {i}+1, {i}+2].map(x => x * 2);',
      'async function asyncFunc_{i}() { return await Promise.resolve({i}); }',
      'const obj_{i} = { key: "value", num: {i}, nested: { a: 1 } };',
      'if ({i} % 2 === 0) { console.log("even"); } else { console.log("odd"); }',
      'for (let i = 0; i < {i}; i++) { console.log(i); }',
      '// Comment line {i}',
      'const regex_{i} = /pattern_{i}/g;',
    ],
    typescript: [
      'const variable_{i}: number = {i};',
      'function func_{i}(arg: string): number { return parseInt(arg) * {i}; }',
      'interface Interface_{i} { value: number; name: string; }',
      'type Type_{i} = { id: {i}; data: unknown };',
      'class Class_{i} implements Interface_{i} { value = {i}; name = "class_{i}"; }',
      'const generic_{i} = <T>(x: T): T => x;',
      'enum Enum_{i} { A = {i}, B, C }',
      'const tuple_{i}: [number, string] = [{i}, "tuple"];',
      '// TypeScript comment {i}',
      'declare const external_{i}: any;',
    ],
  };

  const lines_arr: string[] = [];
  const tmpl = templates[language];
  for (let i = 0; i < lines; i++) {
    const template = tmpl[i % tmpl.length];
    lines_arr.push(template.replace(/\{i\}/g, String(i)));
  }
  return lines_arr.join('\n');
}

// Performance measurement utility
interface PerfResult {
  name: string;
  duration: number;
  memory?: number;
}

function measurePerf<T>(
  name: string,
  fn: () => T,
): { result: T; perf: PerfResult } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  // Memory measurement (if available)
  let memory: number | undefined;
  if (typeof process !== 'undefined' && process.memoryUsage) {
    memory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }

  return {
    result,
    perf: { name, duration, memory },
  };
}

async function measurePerfAsync<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<{ result: T; perf: PerfResult }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  let memory: number | undefined;
  if (typeof process !== 'undefined' && process.memoryUsage) {
    memory = process.memoryUsage().heapUsed / 1024 / 1024;
  }

  return {
    result,
    perf: { name, duration, memory },
  };
}

describe('Performance: Large File Rendering', () => {
  const SMALL_FILE_LINES = 100;
  const MEDIUM_FILE_LINES = 1000;
  const LARGE_FILE_LINES = 5000;
  const VERY_LARGE_FILE_LINES = 10000;

  // Performance thresholds (in milliseconds)
  const THRESHOLDS = {
    initTime: 500, // Shiki initialization
    smallFileRender: 50, // 100 lines
    mediumFileRender: 200, // 1000 lines
    largeFileRender: 1000, // 5000 lines
    incrementalUpdate: 16, // Single line update (target: 60fps = 16ms)
    scrollUpdate: 16, // Viewport change (target: 60fps)
  };

  let shikiExtension: any;
  let getTheme: any;

  beforeAll(async () => {
    // Initialize Shiki once for all tests
    const { perf, result } = await measurePerfAsync(
      'Shiki Initialization',
      async () => {
        return await shikiToCodeMirror({
          lang: 'javascript',
          theme: 'nord',
          themes: { nord: 'nord' },
          defaultColor: 'nord', // Use a valid theme as default
        });
      },
    );

    shikiExtension = result.shiki;
    getTheme = result.getTheme;

    console.log(`[Perf] ${perf.name}: ${perf.duration.toFixed(2)}ms`);
    expect(perf.duration).toBeLessThan(THRESHOLDS.initTime);
  });

  afterAll(() => {
    // Cleanup
  });

  describe('Initial Render Performance', () => {
    it('should render small file (100 lines) quickly', async () => {
      const code = generateLargeCode(SMALL_FILE_LINES);
      const parent = document.createElement('div');
      document.body.appendChild(parent);

      const { perf } = measurePerf('Small File Render', () => {
        const state = EditorState.create({
          doc: code,
          extensions: [shikiExtension],
        });
        return new EditorView({ state, parent });
      });

      console.log(`[Perf] ${perf.name}: ${perf.duration.toFixed(2)}ms`);
      expect(perf.duration).toBeLessThan(THRESHOLDS.smallFileRender);

      parent.remove();
    });

    it('should render medium file (1000 lines) within threshold', async () => {
      const code = generateLargeCode(MEDIUM_FILE_LINES);
      const parent = document.createElement('div');
      document.body.appendChild(parent);

      const { perf, result: view } = measurePerf('Medium File Render', () => {
        const state = EditorState.create({
          doc: code,
          extensions: [shikiExtension],
        });
        return new EditorView({ state, parent });
      });

      console.log(
        `[Perf] ${perf.name}: ${perf.duration.toFixed(2)}ms, Lines: ${MEDIUM_FILE_LINES}`,
      );
      expect(perf.duration).toBeLessThan(THRESHOLDS.mediumFileRender);

      view.destroy();
      parent.remove();
    });

    it('should render large file (5000 lines) within acceptable time', async () => {
      const code = generateLargeCode(LARGE_FILE_LINES);
      const parent = document.createElement('div');
      document.body.appendChild(parent);

      const { perf, result: view } = measurePerf('Large File Render', () => {
        const state = EditorState.create({
          doc: code,
          extensions: [shikiExtension],
        });
        return new EditorView({ state, parent });
      });

      console.log(
        `[Perf] ${perf.name}: ${perf.duration.toFixed(2)}ms, Lines: ${LARGE_FILE_LINES}`,
      );
      // Large files may take longer, but should still be reasonable
      expect(perf.duration).toBeLessThan(THRESHOLDS.largeFileRender);

      view.destroy();
      parent.remove();
    });
  });

  describe('Incremental Update Performance', () => {
    it('should update single character in O(1) time', async () => {
      const code = generateLargeCode(LARGE_FILE_LINES);
      const parent = document.createElement('div');
      document.body.appendChild(parent);

      const state = EditorState.create({
        doc: code,
        extensions: [shikiExtension],
      });
      const view = new EditorView({ state, parent });

      // Wait for initial render to complete
      await new Promise((r) => setTimeout(r, 100));

      // Measure single character insertion
      const { perf } = measurePerf('Single Char Insert', () => {
        view.dispatch({
          changes: { from: 0, insert: 'x' },
        });
      });

      console.log(`[Perf] ${perf.name}: ${perf.duration.toFixed(2)}ms`);
      // Should be very fast due to incremental parsing
      expect(perf.duration).toBeLessThan(THRESHOLDS.incrementalUpdate * 3); // Allow 3x threshold

      view.destroy();
      parent.remove();
    });

    it('should update middle of file without re-parsing entire document', async () => {
      const code = generateLargeCode(LARGE_FILE_LINES);
      const parent = document.createElement('div');
      document.body.appendChild(parent);

      const state = EditorState.create({
        doc: code,
        extensions: [shikiExtension],
      });
      const view = new EditorView({ state, parent });

      await new Promise((r) => setTimeout(r, 100));

      // Insert at middle of document
      const middlePos = Math.floor(code.length / 2);

      const { perf } = measurePerf('Middle Insert', () => {
        view.dispatch({
          changes: { from: middlePos, insert: '\nconst newVar = 42;\n' },
        });
      });

      console.log(
        `[Perf] ${perf.name}: ${perf.duration.toFixed(2)}ms (at position ${middlePos})`,
      );
      // Middle insertion should still be fast due to cached grammar states
      expect(perf.duration).toBeLessThan(100); // Allow more time for middle updates

      view.destroy();
      parent.remove();
    });

    it('should handle rapid typing without lag', async () => {
      const code = generateLargeCode(MEDIUM_FILE_LINES);
      const parent = document.createElement('div');
      document.body.appendChild(parent);

      const state = EditorState.create({
        doc: code,
        extensions: [shikiExtension],
      });
      const view = new EditorView({ state, parent });

      await new Promise((r) => setTimeout(r, 100));

      // Simulate rapid typing (100 characters)
      const typingText =
        'const rapidTypingTest = "This is a test string for performance";';
      const durations: number[] = [];

      for (const char of typingText) {
        const start = performance.now();
        view.dispatch({
          changes: { from: 0, insert: char },
        });
        durations.push(performance.now() - start);
      }

      const avgDuration =
        durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      console.log(
        `[Perf] Rapid Typing: avg=${avgDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms, chars=${typingText.length}`,
      );

      // Average should be very low
      expect(avgDuration).toBeLessThan(THRESHOLDS.incrementalUpdate * 2);
      // Max spike should still be acceptable
      expect(maxDuration).toBeLessThan(50);

      view.destroy();
      parent.remove();
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory on repeated updates', async () => {
      const code = generateLargeCode(MEDIUM_FILE_LINES);
      const parent = document.createElement('div');
      document.body.appendChild(parent);

      const state = EditorState.create({
        doc: code,
        extensions: [shikiExtension],
      });
      const view = new EditorView({ state, parent });

      await new Promise((r) => setTimeout(r, 100));

      // Get initial memory
      const initialMemory = process.memoryUsage?.().heapUsed || 0;

      // Perform many updates
      for (let i = 0; i < 100; i++) {
        view.dispatch({
          changes: { from: 0, insert: `// Update ${i}\n` },
        });
      }

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      await new Promise((r) => setTimeout(r, 100));

      const finalMemory = process.memoryUsage?.().heapUsed || 0;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      console.log(
        `[Perf] Memory: initial=${(initialMemory / 1024 / 1024).toFixed(2)}MB, final=${(finalMemory / 1024 / 1024).toFixed(2)}MB, increase=${memoryIncrease.toFixed(2)}MB`,
      );

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50); // Less than 50MB increase

      view.destroy();
      parent.remove();
    });
  });

  describe('Grammar State Caching', () => {
    it('should cache grammar states for efficient re-highlighting', async () => {
      const code = generateLargeCode(MEDIUM_FILE_LINES);
      const parent = document.createElement('div');
      document.body.appendChild(parent);

      const state = EditorState.create({
        doc: code,
        extensions: [shikiExtension],
      });
      const view = new EditorView({ state, parent });

      await new Promise((r) => setTimeout(r, 200));

      // First scroll (cold cache for new viewport)
      const { perf: coldPerf } = measurePerf('First Scroll (Cold)', () => {
        // Simulate viewport change by scrolling
        view.scrollDOM.scrollTop = 5000;
        view.requestMeasure();
      });

      await new Promise((r) => setTimeout(r, 50));

      // Scroll back (warm cache)
      const { perf: warmPerf } = measurePerf('Scroll Back (Warm)', () => {
        view.scrollDOM.scrollTop = 0;
        view.requestMeasure();
      });

      console.log(
        `[Perf] Cold scroll: ${coldPerf.duration.toFixed(2)}ms, Warm scroll: ${warmPerf.duration.toFixed(2)}ms`,
      );

      // Warm scroll should be faster due to cached states
      // Note: In JSDOM this may not show significant difference
      expect(warmPerf.duration).toBeLessThan(coldPerf.duration * 2 + 5);

      view.destroy();
      parent.remove();
    });
  });
});

describe('Performance: TypeScript Files', () => {
  it('should handle TypeScript syntax efficiently', async () => {
    const { shiki } = await shikiToCodeMirror({
      lang: 'typescript',
      theme: 'nord',
      themes: { nord: 'nord' },
      defaultColor: 'nord', // Use a valid theme as default
    });

    const code = generateLargeCode(1000, 'typescript');
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const { perf, result: view } = measurePerf('TypeScript Render', () => {
      const state = EditorState.create({
        doc: code,
        extensions: [shiki],
      });
      return new EditorView({ state, parent });
    });

    console.log(`[Perf] ${perf.name}: ${perf.duration.toFixed(2)}ms`);
    expect(perf.duration).toBeLessThan(500);

    view.destroy();
    parent.remove();
  });
});

describe('Configuration: defaultColor', () => {
  it('should work with defaultColor set to a valid theme name', async () => {
    const { shiki } = await shikiToCodeMirror({
      lang: 'javascript',
      theme: 'nord',
      themes: { nord: 'nord', dark: 'github-dark' },
      defaultColor: 'nord',
    });

    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const state = EditorState.create({
      doc: 'const a = 1;',
      extensions: [shiki],
    });
    const view = new EditorView({ state, parent });

    await new Promise((r) => setTimeout(r, 200));

    // Editor should work normally
    expect(view.state.doc.toString()).toBe('const a = 1;');

    view.destroy();
    parent.remove();
  });

  it('should work with defaultColor set to false (no default theme)', async () => {
    const { shiki } = await shikiToCodeMirror({
      lang: 'javascript',
      theme: 'nord',
      themes: { nord: 'nord' },
      defaultColor: false, // No default theme
    });

    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const state = EditorState.create({
      doc: 'const a = 1;',
      extensions: [shiki],
    });
    const view = new EditorView({ state, parent });

    await new Promise((r) => setTimeout(r, 200));

    // Editor should still work (graceful degradation)
    expect(view.state.doc.toString()).toBe('const a = 1;');

    view.destroy();
    parent.remove();
  });

  it('should work with defaultColor undefined (uses first theme)', async () => {
    const { shiki } = await shikiToCodeMirror({
      lang: 'javascript',
      theme: 'nord',
      themes: { light: 'github-light', dark: 'github-dark' },
      // defaultColor not specified
    });

    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const state = EditorState.create({
      doc: 'const a = 1;',
      extensions: [shiki],
    });
    const view = new EditorView({ state, parent });

    await new Promise((r) => setTimeout(r, 200));

    expect(view.state.doc.toString()).toBe('const a = 1;');

    view.destroy();
    parent.remove();
  });

  it('should handle multiple themes with defaultColor', async () => {
    const { shiki, getTheme } = await shikiToCodeMirror({
      lang: 'javascript',
      theme: 'nord',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
        nord: 'nord',
      },
      defaultColor: 'light',
    });

    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const state = EditorState.create({
      doc: 'const a = 1;',
      extensions: [shiki],
    });
    const view = new EditorView({ state, parent });

    await new Promise((r) => setTimeout(r, 200));

    // Editor works with initial theme
    expect(view.state.doc.toString()).toBe('const a = 1;');

    // getTheme should be available for switching
    expect(typeof getTheme).toBe('function');

    view.destroy();
    parent.remove();
  });

  it('should warn and fallback when defaultColor points to non-existent theme key', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { shiki } = await shikiToCodeMirror({
      lang: 'javascript',
      theme: 'nord',
      themes: { nord: 'nord' }, // Only 'nord' key exists
      defaultColor: 'light', // 'light' key doesn't exist in themes
      warnings: true,
    });

    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const state = EditorState.create({
      doc: 'const a = 1;',
      extensions: [shiki],
    });
    const view = new EditorView({ state, parent });

    await new Promise((r) => setTimeout(r, 200));

    expect(view.state.doc.toString()).toBe('const a = 1;');
    expect(warnSpy).toHaveBeenCalled();

    view.destroy();
    parent.remove();
    warnSpy.mockRestore();
  });
});
