import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    semi: false,
    singleQuote: true,
    arrowParens: 'avoid',
    sortTailwindcss: {
      stylesheet: 'src/styles.css',
      functions: ['cn', 'clsx', 'cva'],
    },
    sortImports: {},
    ignorePatterns: ['public', '.claude', 'skills', 'src/components/ui'],
  },
  lint: {
    plugins: ['eslint', 'typescript', 'unicorn', 'oxc', 'react'],
    ignorePatterns: ['dist', 'public', '.claude', 'skills', 'src/components/ui'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      'react/no-children-prop': 'off',
    },
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    viteReact(),
    reactCompilerPreset(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
