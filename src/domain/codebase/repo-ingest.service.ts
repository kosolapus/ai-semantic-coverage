import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EmbeddingService } from '../embedding/embedding.service';
import { QdrantAdapter } from '../../infra/db/vector/qdrant.adapter';
import { gitClone, gitCommitHash } from '../../infra/git/utils';
import { readRepoFiles, RepoFile } from '../../infra/fs/utils';

export interface RawChunk {
  chunkId: string;
  filePath: string;
  text: string;
  startLine: number;
  endLine: number;
  type: 'unknown';
}

@Injectable()
export class RepoIngestService {
  private readonly logger = new Logger(RepoIngestService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly qdrant: QdrantAdapter,
  ) {}

  async ingestAndUpsert(repoUrl: string) {
    const workDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'semantic-coverage-'),
    );

    this.logger.log({ stage: 'clone', repoUrl, workDir });
    await gitClone(repoUrl, workDir);

    const commit = await gitCommitHash(workDir);
    const collection = `repo_${commit}`;
    this.logger.log({ stage: 'commit_detected', commit, collection });

    // создаём коллекцию, если её ещё нет
    try {
      await this.qdrant.createCollection(collection, 768);
    } catch (e) {
      this.logger.log(`Collection ${collection} already exists`);
    }

    const files: RepoFile[] = await readRepoFiles(workDir, 5000);
    this.logger.log({ stage: 'files_read', files: files.length });

    // проверяем, какие файлы уже есть в Qdrant для этого коммита
    const existingPoints = await this.qdrant.search(
      collection,
      Array(768).fill(0),
      1000,
    );
    const processedFiles = new Set(
      existingPoints.map((p) => p?.payload?.filePath),
    );

    const newFiles = files.filter(
      (f) =>
        !processedFiles.has(f.path) &&
        !f.path.endsWith('.json') &&
        !f.path.endsWith('.md') &&
        !f.path.endsWith('pnpm-lock.yaml'),
    );
    this.logger.log({ stage: 'new_files', count: newFiles.length });

    // создаём чанки и вставляем только новые
    const chunks: RawChunk[] = newFiles.map((file) => ({
      chunkId: `chunk-${Math.random().toString(36).substr(2, 5)}`,
      filePath: file.path,
      text: file.content,
      startLine: 1,
      endLine: file.content.split('\n').length,
      type: 'unknown',
    }));

    for (const file of newFiles) {
      await this.embeddingService.upsertPage(
        collection,
        file.path,
        file.content,
      );
    }

    this.logger.log(`=== Execution done for ${repoUrl} ===`);

    return { commit, collection, newChunksCount: chunks.length };
  }
}
