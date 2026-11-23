import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const viteBin = path.resolve(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

const envPath = path.resolve(rootDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false });
}

function getAppMetadata() {
  const pkgPath = path.resolve(rootDir, 'package.json');
  let version = process.env.VITE_APP_VERSION || '1.0.0';
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (!process.env.VITE_APP_VERSION && pkg.version && pkg.version !== '0.0.0') {
      version = String(pkg.version);
    }
  } catch {
    // keep default version
  }
  const buildDate = new Date().toISOString().slice(0, 10);
  return { version, buildDate };
}

function getNormalizedBasePath() {
  const isHostedAtRoot = Boolean(
    process.env.CONTROL_PLANE_PORT ||
      process.env.DISABLE_HMR === 'true' ||
      process.env.K_SERVICE ||
      process.env.VERCEL
  );
  const raw = isHostedAtRoot ? '/' : process.env.VITE_BASE_PATH || '/';
  const cleaned = `/${raw.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');
  return cleaned;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function runViteBuild(extraEnv) {
  const res = spawnSync(process.execPath, [viteBin, 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

function buildSingleFile() {
  runViteBuild({ SINGLE_FILE: 'true' });
  const singleFilePath = path.resolve(rootDir, 'dist-single', 'compound-naming-guide.html');
  if (!fs.existsSync(singleFilePath)) {
    console.error('Expected single-file output missing:', singleFilePath);
    process.exit(1);
  }
  const sizeBytes = fs.statSync(singleFilePath).size;
  console.log(
    `\nSingle-file offline build ready: dist-single/compound-naming-guide.html (${formatBytes(sizeBytes)}, ${sizeBytes} bytes)\n`
  );
  return { singleFilePath, sizeBytes };
}

function buildHostedSite() {
  const { singleFilePath, sizeBytes } = buildSingleFile();
  runViteBuild({
    SINGLE_FILE: 'false',
    SINGLE_FILE_SIZE_BYTES: String(sizeBytes),
  });

  const distDir = path.resolve(rootDir, 'dist');
  const distSingleCopy = path.resolve(distDir, 'compound-naming-guide.html');
  fs.copyFileSync(singleFilePath, distSingleCopy);

  const { version, buildDate } = getAppMetadata();
  const basePath = getNormalizedBasePath();
  const versionManifest = {
    version,
    buildDate,
    downloadUrl: `${basePath}compound-naming-guide.html`,
    sizeBytes,
  };
  fs.writeFileSync(
    path.resolve(distDir, 'version.json'),
    `${JSON.stringify(versionManifest, null, 2)}\n`,
    'utf-8'
  );

  console.log(`Copied compound-naming-guide.html into dist/ (${formatBytes(sizeBytes)})`);
  console.log(`Generated dist/version.json (v${version}, built ${buildDate}, basePath: ${basePath})`);
}

function cleanOutputs() {
  for (const target of ['dist', 'dist-single', 'server.js']) {
    const abs = path.resolve(rootDir, target);
    if (fs.existsSync(abs)) {
      fs.rmSync(abs, { recursive: true, force: true });
      console.log(`Removed ${target}`);
    }
  }
}

const mode = process.argv[2] || 'hosted';
if (mode === 'single') {
  buildSingleFile();
} else if (mode === 'hosted') {
  buildHostedSite();
} else if (mode === 'clean') {
  cleanOutputs();
} else {
  console.error(`Unknown build mode "${mode}". Expected "hosted", "single", or "clean".`);
  process.exit(1);
}
