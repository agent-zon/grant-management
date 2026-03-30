#!/usr/bin/env node

/**
 * Test Runner for Field Naming Conventions
 * Runs all tests related to field naming conventions compliance
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runTest(testFile) {
  return new Promise((resolve, reject) => {
    const testPath = path.join(__dirname, testFile);
    
    if (!fs.existsSync(testPath)) {
      reject(new Error(`Test file not found: ${testPath}`));
      return;
    }
    
    log(colors.blue, `\n🧪 Running ${testFile}...`);
    
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        log(colors.green, `✅ ${testFile} passed`);
        resolve();
      } else {
        log(colors.red, `❌ ${testFile} failed with code ${code}`);
        reject(new Error(`Test failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      log(colors.red, `❌ Error running ${testFile}: ${error.message}`);
      reject(error);
    });
  });
}

async function runUnitTests() {
  try {
    log(colors.bold, '\n📝 Running Unit Tests (Node.js built-in test runner)...');
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', ['--test', 'field-naming-conventions.test.js'], {
        stdio: 'inherit',
        cwd: __dirname
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          log(colors.green, '✅ Unit tests passed');
          resolve();
        } else {
          log(colors.red, `❌ Unit tests failed with code ${code}`);
          reject(new Error(`Unit tests failed with code ${code}`));
        }
      });
      
      child.on('error', (error) => {
        log(colors.red, `❌ Error running unit tests: ${error.message}`);
        reject(error);
      });
    });
  } catch (error) {
    log(colors.yellow, '⚠️ Skipping unit tests (Node.js test runner not available)');
  }
}

async function validateFieldNamingConventions() {
  log(colors.bold, '\n🔍 Validating Field Naming Conventions...');
  
  // Check if field naming conventions document exists
  const fieldNamingPath = path.join(__dirname, '..', 'FIELD_NAMING_CONVENTIONS.md');
  if (!fs.existsSync(fieldNamingPath)) {
    log(colors.red, '❌ FIELD_NAMING_CONVENTIONS.md not found');
    return false;
  }
  
  // Read the conventions document
  const conventionsContent = fs.readFileSync(fieldNamingPath, 'utf8');
  
  // Validate that key sections exist
  const requiredSections = [
    '# Field Naming Conventions',
    '## YAML File Path Structure', 
    '## Namespace Prefixes',
    '## Standard Attribute Categories',
    '### 2. Tool Attributes'
  ];
  
  const missingSections = requiredSections.filter(section => 
    !conventionsContent.includes(section)
  );
  
  if (missingSections.length > 0) {
    log(colors.red, `❌ Missing sections in conventions document:`);
    missingSections.forEach(section => log(colors.red, `   - ${section}`));
    return false;
  }
  
  log(colors.green, '✅ Field naming conventions document is complete');
  return true;
}

async function main() {
  log(colors.bold, '🚀 Comprehensive Test Suite');
  log(colors.blue, '===========================');
  
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  try {
    // Validate conventions document
    testResults.total++;
    log(colors.bold, '\n📋 Validating Field Naming Conventions...');
    const conventionsValid = await validateFieldNamingConventions();
    if (conventionsValid) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }
    
    // Run field naming integration tests
    testResults.total++;
    log(colors.bold, '\n🔗 Running Field Naming Integration Tests...');
    try {
      await runTest('integration-field-naming.test.js');
      testResults.passed++;
    } catch (error) {
      testResults.failed++;
      log(colors.red, `Field naming integration test error: ${error.message}`);
    }
    
    // Run unit tests (if available)
    testResults.total++;
    log(colors.bold, '\n📝 Running Unit Tests...');
    try {
      await runUnitTests();
      testResults.passed++;
    } catch (error) {
      testResults.failed++;
      log(colors.red, `Unit test error: ${error.message}`);
    }
    
    // Run MCP Hub cards validation
    testResults.total++;
    log(colors.bold, '\n🏗️ Running MCP Hub Cards Validation...');
    try {
      const mcpHubTest = require('./mcp-hub-cards-integration.test.js');
      const mcpHubResult = await mcpHubTest.runMcpHubCardsValidation();
      if (mcpHubResult) {
        testResults.passed++;
      } else {
        testResults.failed++;
        log(colors.red, 'MCP Hub cards validation returned false');
      }
    } catch (error) {
      testResults.failed++;
      log(colors.red, `MCP Hub cards validation error: ${error.message}`);
    }
    
  } catch (error) {
    log(colors.red, `Test suite error: ${error.message}`);
    testResults.failed++;
  }
  
  // Print summary
  log(colors.bold, '\n📊 Test Results Summary');
  log(colors.blue, '=======================');
  log(colors.green, `✅ Passed: ${testResults.passed}`);
  
  if (testResults.failed > 0) {
    log(colors.red, `❌ Failed: ${testResults.failed}`);
  }
  
  log(colors.blue, `📝 Total: ${testResults.total}`);
  
  const successRate = (testResults.passed / testResults.total * 100).toFixed(1);
  log(colors.blue, `📈 Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    log(colors.green, '\n🎉 All tests passed! Field naming conventions are working correctly.');
    process.exit(0);
  } else {
    log(colors.red, '\n💥 Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Field Naming Conventions Test Runner

Usage: node test-runner.js [options]

Options:
  --help, -h     Show this help message
  --unit-only    Run only unit tests
  --integration  Run only integration tests
  --validate     Run only validation checks

Examples:
  node test-runner.js                  # Run all tests
  node test-runner.js --unit-only      # Run unit tests only
  node test-runner.js --integration    # Run integration tests only
  node test-runner.js --validate       # Validate conventions document only
`);
  process.exit(0);
}

if (args.includes('--unit-only')) {
  runUnitTests().then(() => process.exit(0)).catch(() => process.exit(1));
} else if (args.includes('--integration')) {
  runTest('integration-field-naming.test.js').then(() => process.exit(0)).catch(() => process.exit(1));
} else if (args.includes('--validate')) {
  validateFieldNamingConventions().then(valid => process.exit(valid ? 0 : 1));
} else {
  main();
}