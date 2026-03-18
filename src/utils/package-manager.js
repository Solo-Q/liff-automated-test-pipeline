import path from "node:path";

import { pathExists, readJsonFile } from "./fs.js";

export async function detectPackageManager(repoPath) {
  const checks = [
    { name: "pnpm", file: "pnpm-lock.yaml" },
    { name: "yarn", file: "yarn.lock" },
    { name: "npm", file: "package-lock.json" },
  ];

  for (const check of checks) {
    if (await pathExists(path.join(repoPath, check.file))) {
      return check.name;
    }
  }

  const packageJsonPath = path.join(repoPath, "package.json");
  if (await pathExists(packageJsonPath)) {
    const packageJson = await readJsonFile(packageJsonPath);
    if (typeof packageJson.packageManager === "string") {
      if (packageJson.packageManager.startsWith("npm@")) {
        return "npm";
      }
      if (packageJson.packageManager.startsWith("pnpm@")) {
        return "pnpm";
      }
      if (packageJson.packageManager.startsWith("yarn@")) {
        return "yarn";
      }
    }
  }

  return null;
}
