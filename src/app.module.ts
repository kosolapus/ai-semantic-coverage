import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QdrantModule } from './infra/db/vector/qdrant.module';
import { EmbeddingModule } from './domain/embedding/embedding.module';
import { CodebaseModule } from './domain/codebase/codebase.module';
import { RequirementsModule } from './domain/requirements/requirements.module';
import { RepoIngestController } from './api/rest/repo-ingest.controller';
import { SearchController } from './api/rest/search.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    QdrantModule,
    EmbeddingModule,
    CodebaseModule,
    RequirementsModule,
  ],
  controllers: [RepoIngestController, SearchController],
})
export class AppModule {}
