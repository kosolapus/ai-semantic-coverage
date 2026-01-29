import { Injectable, Logger } from '@nestjs/common';
import { LLMChunk, LLMClient } from '../../infra/llm/llm.client';
import { RepoFile } from '../../infra/fs/utils';

@Injectable()
export class CodeChunkingService {
  private readonly logger = new Logger(CodeChunkingService.name);

  constructor(private readonly llmClient: LLMClient) {}

  async chunkFiles(files: RepoFile[], useLLM = false): Promise<LLMChunk[]> {
    const chunks: LLMChunk[] = [];

    for (const file of files) {
      if (useLLM) {
        const llmChunks = await this.llmClient.generateChunking(
          file.content,
          file.path,
        );
        chunks.push(...llmChunks);
      } else {
        chunks.push({
          chunkId: `chunk-${Math.random().toString(36).substr(2, 5)}`,
          startLine: 1,
          endLine: file.content.split('\n').length,
          type: 'unknown',
          summary: 'full file chunk',
          text: file.content,
        });
      }
    }

    this.logger.log(
      `Generated ${chunks.length} chunks from ${files.length} files`,
    );
    return chunks;
  }
}
