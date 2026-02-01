import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QdrantModule } from './infra/db/vector/qdrant.module';
import { EmbeddingModule } from './domain/embedding/embedding.module';
import { RequirementsModule } from './domain/requirements/requirements.module';
import { RepoIngestController } from './api/rest/repo-ingest.controller';
import { SearchController } from './api/rest/search.controller';
import { RequirementIngestController } from '@/api/rest/requirement-ingest.controller';
import { PipelineModule } from '@/pipeline/pipeline.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    QdrantModule,
    EmbeddingModule,
    RequirementsModule,
    PipelineModule,
  ],
  controllers: [
    RepoIngestController,
    SearchController,
    RequirementIngestController,
  ],
})
export class AppModule {}
