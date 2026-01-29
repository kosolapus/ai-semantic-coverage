import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { QdrantModule } from '../../infra/db/vector/qdrant.module';

@Module({
  imports: [QdrantModule],
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
