import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.astro/**',
      'output/**',
      '.agents/**',
      '.vinasig/**',
    ],
  },
  {
    files: ['**/*.{ts,mjs}'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: Object.fromEntries(
        [
          'process',
          'console',
          'Buffer',
          'URL',
          'Blob',
          'document',
          'window',
          'Image',
          'HTMLElement',
          'HTMLButtonElement',
          'HTMLInputElement',
          'HTMLSpanElement',
          'HTMLParagraphElement',
          'HTMLDivElement',
          'HTMLImageElement',
          'HTMLCanvasElement',
          'SVGSVGElement',
          'getComputedStyle',
          'self',
          'performance',
          'navigator',
          'localStorage',
          'fetch',
          'AbortController',
          'DOMException',
          'Worker',
          'createImageBitmap',
          'ImageData',
          'HTMLTextAreaElement',
          'TextDecoder',
          'URLSearchParams',
          'requestAnimationFrame',
          'Reflect',
          'HTMLVideoElement',
          'HTMLDetailsElement',
          'HTMLFormElement',
          'HTMLFieldSetElement',
        ].map((name) => [name, 'readonly']),
      ),
    },
    rules: { '@typescript-eslint/consistent-type-imports': 'error' },
  },
  ...astro.configs.recommended,
);
