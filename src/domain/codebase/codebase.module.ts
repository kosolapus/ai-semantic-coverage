import { Module } from '@nestjs/common';
import { CodeService } from './codebase.service';
import { RepoIngestService } from './repo-ingest.service';
import { CodeChunkingService } from './code-chunking.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { LLMClient } from '../../infra/llm/llm.client';
import { QdrantModule } from '../../infra/db/vector/qdrant.module';

@Module({
  imports: [EmbeddingModule, QdrantModule],
  providers: [CodeService, RepoIngestService, CodeChunkingService, LLMClient],
  exports: [CodeService, RepoIngestService, CodeChunkingService],
})
export class CodebaseModule {}
