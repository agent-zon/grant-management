const GitHandler = require('./git-handler');

// Test the GitHandler functionality
async function testGitHandler() {
  console.log('=== Testing SAP GitHub Enterprise Integration ===\n');

  const gitHandler = new GitHandler();

  try {
    console.log('1. Checking repository access...');
    const repoInfo = await gitHandler.checkRepositoryAccess('AIAM', 'policies');
    console.log('✅ Repository access successful\n');

    console.log('2. Listing root directory contents...');
    const rootContents = await gitHandler.listDirectory('AIAM', 'policies');
    console.log('✅ Root directory listing successful\n');

    console.log('3. Fetching repository content (main branch)...');
    const mainContent = await gitHandler.getRepositoryContent('AIAM', 'policies', '', 'main');
    console.log('✅ Main branch content fetched successfully\n');

    // Example: Get a specific file if it exists
    console.log('4. Attempting to get README.md if it exists...');
    try {
      const readmeContent = await gitHandler.getFileContent('AIAM', 'policies', 'README.md');
      console.log('✅ README.md content retrieved\n');
    } catch (error) {
      console.log('ℹ️  README.md not found, skipping...\n');
    }

    console.log('=== All tests completed successfully! ===');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('access token')) {
      console.log('\n💡 To fix this:');
      console.log('1. Add your SAP GitHub Enterprise token to .env file:');
      console.log('   GIT_ACCESS_TOKEN=your_token_here');
      console.log('2. Generate token at: https://github.tools.sap/settings/tokens');
      console.log('3. Grant "repo" and "read:org" permissions');
    }
  }
}

// Run the test
if (require.main === module) {
  testGitHandler();
}

module.exports = { testGitHandler };