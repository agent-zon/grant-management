const cds = require('@sap/cds');

let _octokit = null;

async function getOctokit() {
  if (_octokit) return _octokit;

  const { Octokit } = await import('octokit');
  const github = await cds.connect.to('github');
  const { token, url } = github.options?.credentials ?? {};

  if (!token) throw new Error(
    'Git token not available. Bind with: npx cds bind github -2 git-credentials --on k8s'
  );

  _octokit = new Octokit({
    auth: token,
    baseUrl: url ?? 'https://github.tools.sap/api/v3',
    userAgent: 'SAP-AIAM-Policies-App',
  });

  return _octokit;
}

module.exports = getOctokit;
