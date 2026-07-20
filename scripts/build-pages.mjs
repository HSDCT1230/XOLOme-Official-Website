import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const outputDir = resolve(projectRoot, "dist");

const staticEntries = [
  "index.html",
  "robots.txt",
  "sitemap.xml",
  "_headers",
  "_redirects",
  "css",
  "js",
];

const assetSkipDirNames = new Set(["previews"]);

function assertInsideProject(path) {
  const rel = relative(projectRoot, path);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Refusing to write outside the project: ${path}`);
  }
}

async function copyAssetsFiltered(sourceDir, destinationDir) {
  await mkdir(destinationDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && assetSkipDirNames.has(entry.name)) {
      continue;
    }

    const from = join(sourceDir, entry.name);
    const to = join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      await copyAssetsFiltered(from, to);
      continue;
    }

    await cp(from, to);
  }
}

assertInsideProject(outputDir);
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const entry of staticEntries) {
  const source = resolve(projectRoot, entry);
  const destination = resolve(outputDir, entry);

  try {
    await stat(source);
  } catch {
    continue;
  }

  await cp(source, destination, { recursive: true });
}

const assetsSource = resolve(projectRoot, "assets");
try {
  await stat(assetsSource);
  await copyAssetsFiltered(assetsSource, resolve(outputDir, "assets"));
} catch {
  // optional
}

console.log(`Cloudflare Pages bundle ready: ${relative(projectRoot, outputDir)}`);
