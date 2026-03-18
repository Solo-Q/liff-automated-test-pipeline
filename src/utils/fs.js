import fs from "node:fs/promises";
import path from "node:path";

const IGNORED_DIRS = new Set([
  ".git",
  ".liff-testgen",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeJsonFile(filePath, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(filePath, content, "utf8");
}

export async function writeTextFile(filePath, content) {
  await fs.writeFile(filePath, content, "utf8");
}

export async function deleteFile(filePath) {
  await fs.rm(filePath, { force: true });
}

export async function findFiles(rootPath, matcher) {
  const matches = [];
  await walkDirectory(rootPath, rootPath, matcher, matches);
  return matches;
}

async function walkDirectory(rootPath, currentPath, matcher, matches) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      await walkDirectory(rootPath, path.join(currentPath, entry.name), matcher, matches);
      continue;
    }

    const absolutePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, absolutePath);

    if (matcher({ absolutePath, relativePath, name: entry.name })) {
      matches.push({ absolutePath, relativePath, name: entry.name });
    }
  }
}
