#!/usr/bin/env node
/*
  Deploys Helm chart after building and pushing images.
  Uses KUBE_* for cluster auth and DOCKER_* for image registry.
*/
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

function sh(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

const args = process.argv.slice(2);
const SKIP_BUILD = args.includes('--skip-build');

const KUBE_SERVER = process.env.KUBE_SERVER || process.env.KUBE_CLUSTER || process.env.K8S_SERVER;
const KUBE_TOKEN = process.env.KUBE_TOKEN;
const KUBE_USER = process.env.KUBE_USER || 'automation';
const KUBE_CA = process.env.KUBE_CA_CERT; // optional, base64 or PEM
const KUBECONFIG_PATH = process.env.KUBECONFIG; // if set, we'll respect it
const KUBE_CONFIG_B64 = process.env.KUBE_CONFIG_B64 || process.env.KUBECONFIG_B64; // base64 kubeconfig
const KUBE_CONFIG = process.env.KUBE_CONFIG; // raw kubeconfig yaml
const NAMESPACE = process.env.KUBE_NAMESPACE || 'grants';

const REGISTRY = process.env.DOCKER_REGISTRY || 'scai-dev.common.repositories.cloud.sap';
const VALUES_FILE = path.resolve(__dirname, '..', 'chart', 'values.yaml');

function ensureKubectl() {
  try { execSync('kubectl version --client', { stdio: 'ignore' }); } catch {
    console.error('kubectl is required');
    process.exit(1);
  }
}

function ensureHelm() {
  try { execSync('helm version', { stdio: 'ignore' }); } catch {
    console.error('helm is required');
    process.exit(1);
  }
}

function kubeLogin() {
  // If a kubeconfig is provided, write/use it
  if (KUBE_CONFIG_B64 || KUBE_CONFIG) {
    const cfgPath = path.resolve(__dirname, '.kubeconfig');
    if (KUBE_CONFIG_B64) {
      fs.writeFileSync(cfgPath, Buffer.from(KUBE_CONFIG_B64, 'base64'));
    } else {
      fs.writeFileSync(cfgPath, KUBE_CONFIG);
    }
    process.env.KUBECONFIG = cfgPath;
    console.log(`Using kubeconfig at ${cfgPath}`);
    return;
  }
  // If current context is already configured, skip
  try {
    sh('kubectl cluster-info');
    console.log('Using existing kube context');
    return;
  } catch {}
  if (!KUBE_SERVER || !KUBE_TOKEN) {
    console.error('Missing KUBE_SERVER and/or KUBE_TOKEN');
    process.exit(1);
  }
  sh(`kubectl config set-cluster ci --server="${KUBE_SERVER}"`);
  if (KUBE_CA) {
    const isB64 = /^[A-Za-z0-9+/=\n\r]+$/.test(KUBE_CA) && !KUBE_CA.includes('-----BEGIN');
    const caPath = path.resolve(__dirname, '.kube-ca.crt');
    fs.writeFileSync(caPath, isB64 ? Buffer.from(KUBE_CA, 'base64') : KUBE_CA);
    sh(`kubectl config set-cluster ci --embed-certs=true --certificate-authority="${caPath}"`);
  }
  sh(`kubectl config set-credentials ${KUBE_USER} --token="${KUBE_TOKEN}"`);
  sh(`kubectl config set-context ci --cluster=ci --user=${KUBE_USER} --namespace=${NAMESPACE}`);
  sh('kubectl config use-context ci');
}

function dockerRegistrySecret() {
  const username = process.env.DOCKER_USERNAME;
  const password = process.env.DOCKER_PASSWORD;
  if (!username || !password || !REGISTRY) {
    console.log('Skipping docker-registry secret creation (DOCKER_*)');
    return;
  }
  try {
    sh(`kubectl -n ${NAMESPACE} get secret docker-registry`);
    console.log('docker-registry secret exists');
    return;
  } catch {}
  sh(
    [
      'kubectl', 'create', 'secret', 'docker-registry', 'docker-registry',
      `--docker-server=${REGISTRY}`,
      `--docker-username=${username}`,
      `--docker-password=${password}`,
      `-n ${NAMESPACE}`
    ].join(' ')
  );
}

function readLastTag() {
  const tagFile = path.resolve(__dirname, '.last-image-tag');
  if (fs.existsSync(tagFile)) return fs.readFileSync(tagFile, 'utf8').trim();
  return process.env.IMAGE_TAG || 'v15';
}

function helmUpgrade() {
  const TAG = readLastTag();
  // update chart values at runtime using --set
  const release = process.env.HELM_RELEASE || 'v01';
  const chartDir = path.resolve(__dirname, '..', 'chart');
  const setArgs = [
    `global.image.registry=${REGISTRY}`,
    `global.image.tag=${TAG}`,
    `global.image.imagePullPolicy=Always`,
    `global.imagePullSecret.name=docker-registry`,
  ].map(kv => `--set ${kv}`).join(' ');

  sh(`kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -`);
  sh(`helm upgrade ${release} ${chartDir} --install --namespace ${NAMESPACE} ${setArgs}`);
}

function main() {
  ensureKubectl();
  ensureHelm();
  kubeLogin();
  dockerRegistrySecret();
  if (!SKIP_BUILD) {
    sh('node scripts/build-containers.js --push');
  }
  helmUpgrade();
  console.log('\n✅ Deployment completed');
}

main();
