#!/usr/bin/env node

/**
 * Time Entry Workflows Test Runner
 * 
 * Runs the comprehensive time entry tests to verify:
 * 1. "Nieuwe Tijdsregistratie" with manual input
 * 2. "Nieuwe Tijdsregistratie" with timer
 * 3. Main page "Start Timer" button with auto-registration
 * 
 * All tests verify entries appear in the "Tijdsregistraties" table
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 Starting Time Entry Workflows Tests')
console.log('=' .repeat(50))

// Test configuration
const testFile = 'src/__tests__/e2e/time-entry-workflows.spec.ts'
const testCommand = 'npx'
const testArgs = [
  'playwright', 
  'test', 
  testFile,
  '--headed',           // Show browser for better debugging
  '--project=chromium', // Use Chrome browser
  '--workers=1',        // Run tests sequentially
  '--timeout=60000',    // 60 second timeout per test
  '--reporter=list'     // Detailed output
]

console.log(`Running: ${testCommand} ${testArgs.join(' ')}`)
console.log('')

// Run the tests
const testProcess = spawn(testCommand, testArgs, {
  stdio: 'inherit',
  cwd: process.cwd()
})

testProcess.on('close', (code) => {
  console.log('')
  console.log('=' .repeat(50))
  
  if (code === 0) {
    console.log('✅ All time entry workflow tests passed!')
    console.log('')
    console.log('Tests completed successfully:')
    console.log('1. ✅ Manual time entry creation')
    console.log('2. ✅ Timer-based time entry creation') 
    console.log('3. ✅ Main page timer with auto-registration')
    console.log('')
    console.log('All entries should now be visible in the Tijdsregistraties table!')
  } else {
    console.log('❌ Some tests failed!')
    console.log('')
    console.log('Check the output above for details.')
    console.log('Common issues:')
    console.log('- Make sure the development server is running (npm run dev)')
    console.log('- Ensure you are logged in to the application')
    console.log('- Check that the financieel/tijd page is accessible')
  }
  
  process.exit(code)
})

testProcess.on('error', (error) => {
  console.error('❌ Failed to start tests:', error.message)
  console.log('')
  console.log('Make sure Playwright is installed:')
  console.log('npm install @playwright/test')
  console.log('npx playwright install')
  process.exit(1)
})