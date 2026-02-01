import { Module } from '@nestjs/common';
import { RequirementPipeline } from '@/pipeline/requirement.pipeline';
import { EmbeddingModule } from '@/domain/embedding/embedding.module';
import { QdrantModule } from '@/infra/db/vector/qdrant.module';
import { CalculatePipeline } from '@/pipeline/calculate.pipeline';
import { CodebasePipeline } from '@/pipeline/codebase.pipeline';

const Pipelines = [RequirementPipeline, CalculatePipeline, CodebasePipeline];

@Module({
  imports: [EmbeddingModule, QdrantModule],
  providers: [...Pipelines],
  exports: [...Pipelines],
})
export class PipelineModule {}
