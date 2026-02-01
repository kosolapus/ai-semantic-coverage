import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from '@/domain/embedding/embedding.service';
import { QdrantAdapter } from '@/infra/db/vector/qdrant.adapter';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { gitClone, gitCommitHash } from '@/infra/git/utils';
import { readRepoFiles, RepoFile } from '@/infra/fs/utils';
import { v4 } from 'uuid';
import { intentToSentenceNatural } from '@/shared/text-utils';
import classifyPrompt from '@/prompts/classify.system.md';

@Injectable()
export class CodebasePipeline {
  private readonly logger = new Logger(CodebasePipeline.name);
  private readonly maxFilesCount = 5000;

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly qdrant: QdrantAdapter,
  ) {}

  async processUrl(url: string) {
    const { files, commit } = await this.loadRepo(url);

    const collectionName = await this.createCollection(commit);

    const newFiles = await this.filterProcessedFiles(collectionName, files);

    for (const file of newFiles) {
      await this.upsertPage(collectionName, file.path, file.content);
    }

    this.logger.log(`=== Execution done for ${url} / ${collectionName} ===`);
  }

  private async loadRepo(url: string) {
    const workDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'semantic-coverage-'),
    );

    this.logger.log({ stage: 'clone', url, workDir });
    await gitClone(url, workDir);

    const commit = await gitCommitHash(workDir);
    this.logger.log({ stage: 'commit_detected', commit });

    const files: RepoFile[] = await readRepoFiles(workDir, this.maxFilesCount);
    this.logger.log({ stage: 'files_read', files: files.length });

    return {
      commit,
      files,
    };
  }

  private async createCollection(name: string) {
    const collection = `repo_${name}`;
    this.logger.log({ stage: 'commit_detected', name });

    // создаём коллекцию, если её ещё нет
    await this.qdrant.prepareCollection(collection);

    return collection;
  }

  private async filterProcessedFiles(name: string, files: RepoFile[]) {
    const existingPoints = await this.qdrant.client.scroll(name, {
      limit: this.maxFilesCount,
      with_vector: false,
      with_payload: true,
    });
    const processedFiles = new Set<string | undefined>(
      existingPoints.points.map((p) => p?.payload?.filePath as string),
    );

    const newFiles = this.lazyFiltering(files, processedFiles);
    this.logger.log({ stage: 'new_files', count: newFiles.length });

    return newFiles;
  }

  async upsertPage(collection: string, filePath: string, rawText: string) {
    this.logger.log(`Processing page ${filePath}`);

    const pageSummary = await this.embeddingService.summarize(
      rawText,
      classifyPrompt,
    );

    let cleanBehaviors: {
      behaviors?: Record<string, any>[];
    } = {};

    try {
      cleanBehaviors = JSON.parse(pageSummary.cleaned) as {
        behaviors: Record<string, any>[];
      };
      this.logger.log(
        `Page summarized, result`,
        cleanBehaviors?.behaviors?.length,
      );
    } catch {
      this.logger.log('Parsing error');
    }

    if (!cleanBehaviors.behaviors?.length) {
      return;
    }

    this.logger.log('Start embedding');
    for (const beh of cleanBehaviors.behaviors) {
      const embedString = intentToSentenceNatural(beh);
      this.logger.log('Embed string:', embedString);
      const behEmbedding = await this.embeddingService.embed(embedString);
      const id = v4();
      await this.qdrant.upsertPoint(collection, id, behEmbedding, {
        ...beh,
        filePath,
        mainIntent: embedString,
      });
    }

    return;
  }

  private lazyFiltering(
    files: { path: string; content: string }[],
    processedFiles: Set<string | undefined>,
  ) {
    return files.filter(
      (f) =>
        (!processedFiles.has(f.path) &&
          !f.path.endsWith('.json') &&
          !f.path.endsWith('.md') &&
          !f.path.endsWith('pnpm-lock.yaml') &&
          f.path.includes('test')) ||
        f.path.includes('spec'),
    );
  }
}
