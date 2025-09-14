import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Multi-project configuration for comprehensive B2B SaaS testing (70/20/10 strategy)
    projects: [
      {
        name: 'unit',
        testMatch: ['src/__tests__/unit/**/*.test.ts', 'src/__tests__/unit/**/*.test.tsx'],
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup/test-setup.ts'],
        globals: true,
        coverage: {
          reporter: ['text', 'json', 'html'],
          exclude: ['node_modules/', 'src/__tests__/', 'src/test/']
        }
      },
      {
        name: 'integration', 
        testMatch: ['src/__tests__/integration/**/*.integration.test.ts'],
        environment: 'node',
        setupFiles: ['./src/__tests__/setup/database-setup.ts'],
        testTimeout: 15000,
        globals: true
      },
      {
        name: 'e2e',
        testMatch: ['src/__tests__/e2e/**/*.e2e.test.ts'],
        environment: 'node',
        testTimeout: 60000,
        globals: true
      }
    ]
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})