import { Module } from '@nestjs/common';
import { QdrantAdapter } from './qdrant.adapter';

@Module({
  providers: [QdrantAdapter],
  exports: [QdrantAdapter],
})
export class QdrantModule {}
