import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CodeService {
  private files: { path: string; content: string }[] = [];

  async checkoutAndLoad(projectPath: string) {
    const readFiles = (dir: string) => {
      for (const fileName of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, fileName);
        if (fs.statSync(fullPath).isDirectory()) {
          readFiles(fullPath);
        } else if (fileName.endsWith('.ts') || fileName.endsWith('.js')) {
          this.files.push({
            path: fullPath,
            content: fs.readFileSync(fullPath, 'utf-8'),
          });
        }
      }
    };
    readFiles(projectPath);
  }

  getFiles() {
    return this.files;
  }
}
