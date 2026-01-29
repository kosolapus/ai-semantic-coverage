import * as fs from 'fs/promises';
import * as path from 'path';

export type RepoFile = {
  path: string;
  content: string;
};

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

function isDotPath(name: string) {
  return name.startsWith('.');
}

export async function readRepoFiles(
  rootDir: string,
  maxFiles = 50,
): Promise<RepoFile[]> {
  const result: RepoFile[] = [];

  async function walk(dir: string) {
    if (result.length >= maxFiles) return;

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (result.length >= maxFiles) break;

      if (isDotPath(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        const content = await fs.readFile(fullPath, 'utf-8');
        result.push({
          path: fullPath.replace(rootDir, ''),
          content,
        });
      }
    }
  }

  await walk(rootDir);
  return result;
}
