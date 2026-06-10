import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER ?? '1305381758y-cpu';
const REPO = process.env.GITHUB_REPO ?? 'jobtap';
const BRANCH = process.env.GITHUB_BRANCH ?? 'main';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

if (!TOKEN) {
  console.error('Missing GITHUB_TOKEN');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
  Accept: 'application/vnd.github+json',
  'User-Agent': 'push-via-api/2.0',
};

async function api(method, path, body) {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} ${res.status}: ${text.slice(0, 400)}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

function getTrackedFiles() {
  const lsOutput = execSync('git ls-files -s', { encoding: 'utf-8' });
  return lsOutput
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [meta, path] = line.split('\t');
      const [mode, sha] = meta.split(' ');
      return { mode, sha, path };
    });
}

async function uploadBlobs(files) {
  const blobMap = new Map();
  const batchSize = 20;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (file) => {
        try {
          const content = readFileSync(file.path, 'utf-8');
          const response = await api('POST', '/git/blobs', {
            content,
            encoding: 'utf-8',
          });
          blobMap.set(file.sha, response.sha);
        } catch {
          const content = readFileSync(file.path);
          const response = await api('POST', '/git/blobs', {
            content: content.toString('base64'),
            encoding: 'base64',
          });
          blobMap.set(file.sha, response.sha);
        }
      }),
    );

    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length > 0) {
      for (const result of failed) {
        console.error(result.reason.message);
      }
      process.exit(1);
    }

    process.stdout.write(`[${Math.min(i + batchSize, files.length)}/${files.length}]`);
  }

  process.stdout.write('\n');
  return blobMap;
}

function buildTree(files, blobMap) {
  const root = {};

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      if (!current[part] || !current[part].__isDir) {
        current[part] = { __isDir: true, __children: {} };
      }
      current = current[part].__children;
    }

    current[parts[parts.length - 1]] = {
      __mode: file.mode,
      __sha: blobMap.get(file.sha),
    };
  }

  return root;
}

async function createTree(node) {
  const entries = [];

  for (const [name, value] of Object.entries(node)) {
    if (value.__isDir) {
      const sha = await createTree(value.__children);
      entries.push({ path: name, mode: '040000', type: 'tree', sha });
    } else {
      entries.push({
        path: name,
        mode: value.__mode || '100644',
        type: 'blob',
        sha: value.__sha,
      });
    }
  }

  const res = await api('POST', '/git/trees', { tree: entries });
  return res.sha;
}

async function main() {
  const files = getTrackedFiles();
  console.log(`Found ${files.length} tracked files`);

  const ref = await api('GET', `/git/ref/heads/${BRANCH}`);
  const headCommit = await api('GET', `/git/commits/${ref.object.sha}`);

  console.log(`Current ${OWNER}/${REPO}@${BRANCH}: ${ref.object.sha.slice(0, 7)}`);

  const blobMap = await uploadBlobs(files);
  const rootTreeSha = await createTree(buildTree(files, blobMap));

  if (rootTreeSha === headCommit.tree.sha) {
    console.log('Remote tree already matches local tracked files');
    return;
  }

  const commitMsg = execSync('git log --format=%s -1', { encoding: 'utf-8' }).trim();
  const authorName = execSync('git log --format=%an -1', { encoding: 'utf-8' }).trim();
  const authorEmail = execSync('git log --format=%ae -1', { encoding: 'utf-8' }).trim();
  const commitDate = execSync('git log --format=%aI -1', { encoding: 'utf-8' }).trim();

  const commitRes = await api('POST', '/git/commits', {
    message: `${commitMsg}\n\nPushed via GitHub API`,
    tree: rootTreeSha,
    parents: [ref.object.sha],
    author: { name: authorName, email: authorEmail, date: commitDate },
    committer: { name: authorName, email: authorEmail, date: commitDate },
  });

  await api('PATCH', `/git/refs/heads/${BRANCH}`, {
    sha: commitRes.sha,
    force: false,
  });

  console.log(`Updated https://github.com/${OWNER}/${REPO}/tree/${BRANCH}`);
  console.log(`Commit SHA: ${commitRes.sha}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
