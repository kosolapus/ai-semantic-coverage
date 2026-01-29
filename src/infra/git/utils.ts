import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function gitClone(repoUrl: string, targetDir: string) {
  await execAsync(`git clone ${repoUrl} ${targetDir}`, {
    maxBuffer: 1024 * 1024 * 10,
  });
}

export async function gitCommitHash(repoDir: string): Promise<string> {
  const { stdout } = await execAsync(`git rev-parse HEAD`, {
    cwd: repoDir,
  });
  return stdout.trim();
}
