const cds = require('@sap/cds');

/**
 * Handler for SAP GitHub Enterprise API access via Octokit.
 * Credentials (token + url) are sourced from the CDS 'github' service binding,
 * bound to the git-credentials Kubernetes secret via:
 *   npx cds bind github -2 git-credentials --on k8s
 */
class GitHandler {
  constructor() {
    this._octokit = null;
  }

  async _client() {
    if (this._octokit) return this._octokit;

    const { Octokit } = await import('octokit');
    const github = await cds.connect.to('github');
    const { token, url } = github.options?.credentials ?? {};

    if (!token) throw new Error(
      'Git token not available. Bind with: npx cds bind github -2 git-credentials --on k8s'
    );

    this._octokit = new Octokit({
      auth: token,
      baseUrl: url ?? 'https://github.tools.sap/api/v3',
      userAgent: 'SAP-AIAM-Policies-App',
    });

    return this._octokit;
  }

  /**
   * Get repository content (file or directory listing).
   * @param {string} org
   * @param {string} repo
   * @param {string} path - repo-relative path (default: root)
   * @param {string} branch
   */
  async getRepositoryContent(org, repo, path = '', branch = 'main') {
    const octokit = await this._client();

    console.log(`Fetching repository content: ${org}/${repo}/${path || '(root)'}`);

    const { data } = await octokit.rest.repos.getContent({
      owner: org,
      repo,
      path,
      ref: branch,
    });

    console.log(`Successfully fetched repository content for ${org}/${repo}`);
    return data;
  }

  /**
   * Get a single file's content, with base64 decoded.
   * @param {string} org
   * @param {string} repo
   * @param {string} filePath
   * @param {string} branch
   */
  async getFileContent(org, repo, filePath, branch = 'main') {
    const data = await this.getRepositoryContent(org, repo, filePath, branch);

    if (data.type === 'file' && data.content) {
      const decodedContent = Buffer.from(data.content, 'base64').toString('utf-8');
      return { ...data, decodedContent };
    }

    return data;
  }

  /**
   * List directory contents.
   * @param {string} org
   * @param {string} repo
   * @param {string} dirPath
   * @param {string} branch
   */
  async listDirectory(org, repo, dirPath = '', branch = 'main') {
    const data = await this.getRepositoryContent(org, repo, dirPath, branch);
    const items = Array.isArray(data) ? data : [data];
 

    return items;
  }

  /**
   * Check repository access and basic info.
   */
  async checkRepositoryAccess(org, repo) {
    const octokit = await this._client();
    const { data } = await octokit.rest.repos.get({ owner: org, repo });

    console.log(`Repository info for ${org}/${repo}:`, {
      name: data.name,
      fullName: data.full_name,
      private: data.private,
      defaultBranch: data.default_branch,
      description: data.description,
    });

    return data;
  }

  /**
   * Create or update a file in the repository.
   * @param {string} org
   * @param {string} repo
   * @param {string} filePath
   * @param {string} content  - raw file content (UTF-8)
   * @param {string} commitMessage
   * @param {string} branch
   */
  async createOrUpdateFile(org, repo, filePath, content, commitMessage, branch = 'main') {
    const octokit = await this._client();

    let sha;
    try {
      const { data } = await octokit.rest.repos.getContent({ owner: org, repo, path: filePath, ref: branch });
      sha = data.sha;
      console.log(`File exists, updating with SHA: ${sha}`);
    } catch {
      console.log('File does not exist, creating new file');
    }

    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner: org,
      repo,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch,
      ...(sha ? { sha } : {}),
    });

    console.log(`File committed: ${data.content.path} @ ${data.commit.sha}`);
    return data;
  }

  /**
   * Alias kept for backward compatibility.
   */
  async commitFile(org, repo, filePath, content, commitMessage, _contentType = 'text/plain', branch = 'main') {
    return this.createOrUpdateFile(org, repo, filePath, content, commitMessage, branch);
  }

  /**
   * Commit multiple files (each individually – GitHub Contents API limitation).
   * @param {string} org
   * @param {string} repo
   * @param {string} commitMessage
   * @param {Array<{path:string, content:string}>} files
   * @param {string} branch
   */
  async commitAndPush(org, repo, commitMessage, files = [], branch = 'main') {
    try {
      for (const { path, content } of files) {
        await this.createOrUpdateFile(org, repo, path, content, commitMessage, branch);
      }
      return { success: true, message: 'Files committed successfully', files, commit: { message: commitMessage, branch } };
    } catch (error) {
      console.error('Error in commitAndPush:', error.message);
      return { success: false, message: `Failed to commit: ${error.message}`, files: [], error: error.message };
    }
  }
}

module.exports = GitHandler;
