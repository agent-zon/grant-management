#!/usr/bin/env node
/*
  Build and optionally push all service images.
  Uses DOCKER_USERNAME/DOCKER_PASSWORD/DOCKER_REGISTRY and IMAGE_TAG.
  Usage:
    node scripts/build-containers.js [--push]
*/
const { execSync } = require('node:child_process');
const path = require('node:path');

function sh(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

const args = process.argv.slice(2);
const PUSH = args.includes('--push');

const REGISTRY = process.env.DOCKER_REGISTRY || 'scai-dev.common.repositories.cloud.sap';
const USERNAME = process.env.DOCKER_USERNAME;
const PASSWORD = process.env.DOCKER_PASSWORD;

// Tag defaults to values.yaml (v15) unless overridden
const DEFAULT_TAG = process.env.IMAGE_TAG || process.env.GIT_SHA || `v${new Date().toISOString().slice(0,10).replace(/-/g, '')}`;
const TAG = DEFAULT_TAG;

const BUILD_MODE_FLAG = PUSH ? '--push' : '--load';

// Images to build consistent with chart values.yaml
const images = [
  {
    name: 'srv',
    repository: 'grant-management/api',
    dockerfile: path.resolve(__dirname, '..', 'Dockerfile'),
    context: path.resolve(__dirname, '..'),
  },
  {
    name: 'approuter',
    repository: 'grant-management/approuter',
    dockerfile: path.resolve(__dirname, '..', 'app', 'router', 'Dockerfile'),
    context: path.resolve(__dirname, '..', 'app', 'router'),
  },
  {
    name: 'grant-server',
    repository: 'grant-management/grant-server',
    dockerfile: path.resolve(__dirname, '..', 'app', 'grant-management', 'GrantManagementServer', 'Dockerfile'),
    context: path.resolve(__dirname, '..', 'app'),
  },
  {
    name: 'grant-mcp-layer',
    repository: 'grant-management/grant-mcp-layer',
    dockerfile: path.resolve(__dirname, '..', 'app', 'grant-management', 'GrantMcpLayer', 'Dockerfile'),
    context: path.resolve(__dirname, '..', 'app'),
  },
  {
    name: 'cockpit-ui',
    repository: 'grant-management/cockpit-ui',
    dockerfile: path.resolve(__dirname, '..', 'app', 'cockpit-ui', 'Dockerfile'),
    context: path.resolve(__dirname, '..', 'app', 'cockpit-ui'),
  },
];

function ensureBuildx() {
  try {
    execSync('docker buildx version', { stdio: 'ignore' });
  } catch {
    console.error('docker buildx is required');
    process.exit(1);
  }
  try {
    execSync('docker buildx inspect multi-platform-builder', { stdio: 'ignore' });
  } catch {
    sh('docker buildx create --name multi-platform-builder --use --bootstrap');
  }
}

function buildCds() {
  // Ensure CAP build output exists for srv Dockerfile (expects gen/srv)
  try {
    sh('npm run build');
  } catch (e) {
    console.error('Failed to run cds build');
    throw e;
  }
}

function dockerLogin() {
  if (USERNAME && PASSWORD && REGISTRY) {
    sh(`echo "${PASSWORD}" | docker login ${REGISTRY} -u "${USERNAME}" --password-stdin`);
  } else {
    console.log('Skipping docker login (DOCKER_USERNAME/DOCKER_PASSWORD/DOCKER_REGISTRY not fully set).');
  }
}

function buildAll() {
  ensureBuildx();
  buildCds();
  dockerLogin();
  images.forEach((img) => {
    const fullTag = `${REGISTRY}/${img.repository}:${TAG}`;
    sh(
      [
        'docker buildx build',
        '--platform linux/amd64',
        `-t ${fullTag}`,
        `-f "${img.dockerfile}"`,
        BUILD_MODE_FLAG,
        '"' + img.context + '"',
      ].join(' ')
    );
  });
  console.log(`\n✅ Images built${PUSH ? ' and pushed' : ''} with tag: ${TAG}`);
  // Emit a file to pass the tag to the deploy step
  const outPath = path.resolve(__dirname, '..', 'scripts', '.last-image-tag');
  require('node:fs').writeFileSync(outPath, TAG, 'utf8');
}

buildAll();
