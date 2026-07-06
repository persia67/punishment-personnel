const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  // Load package.json
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version; // e.g. "3.2.0"
  
  // Get latest commit message
  let commitMessage = '';
  try {
    commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
  } catch (e) {
    console.log('Could not get commit message, defaulting to patch bump.');
  }
  
  console.log(`Current version: ${currentVersion}`);
  console.log(`Latest commit message: "${commitMessage}"`);
  
  // Parse version parts
  const parts = currentVersion.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }
  
  let [major, minor, patch] = parts;
  
  // Determine bump type based on conventional commits
  if (
    commitMessage.includes('[major]') || 
    commitMessage.includes('breaking:') || 
    commitMessage.includes('BREAKING CHANGE') ||
    commitMessage.toLowerCase().includes('major bump')
  ) {
    major += 1;
    minor = 0;
    patch = 0;
    console.log('Detected MAJOR bump.');
  } else if (
    commitMessage.includes('[minor]') || 
    commitMessage.startsWith('feat:') || 
    commitMessage.toLowerCase().startsWith('feat(') ||
    commitMessage.toLowerCase().includes('minor bump')
  ) {
    minor += 1;
    patch = 0;
    console.log('Detected MINOR bump.');
  } else {
    patch += 1;
    console.log('Detected PATCH bump.');
  }
  
  const newVersion = `${major}.${minor}.${patch}`;
  console.log(`New bumped version: ${newVersion}`);
  
  // Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('Successfully updated package.json version.');
  
  // Also print for GitHub Actions GITHUB_OUTPUT
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${newVersion}\n`);
    console.log(`Set GITHUB_OUTPUT new_version to ${newVersion}`);
  }
} catch (error) {
  console.error('Error bumping version:', error);
  process.exit(1);
}
