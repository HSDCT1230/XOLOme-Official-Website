import { cp, mkdir, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, relative, resolve } from "node:path";

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
  "assets",
];

function assertInsideProject(path) {
  const rel = relative(projectRoot, path);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Refusing to write outside the project: ${path}`);
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

console.log(`Cloudflare Pages bundle ready: ${relative(projectRoot, outputDir)}`);
