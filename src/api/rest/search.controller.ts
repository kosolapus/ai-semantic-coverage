import { Controller, Post, Body } from '@nestjs/common';
import { EmbeddingService } from '../../domain/embedding/embedding.service';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SearchDto {
  @ApiProperty()
  collection: string;

  @ApiProperty()
  query: string;

  @ApiPropertyOptional()
  top?: number;
}
@Controller('search')
export class SearchController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Post('search')
  async search(@Body() body: SearchDto) {
    const top = body.top || 5;

    const results = await this.embeddingService.search(
      body.collection,
      body.query,
      top,
    );

    // формируем человекочитаемый вывод
    return results.map((item) => ({
      chunkId: item.id,
      score: item.score,
      filePath: item.payload?.filePath,
      startLine: item.payload?.startLine,
      endLine: item.payload?.endLine,
      type: item.payload?.type,
      snippet: (item.payload?.text as string).substring(0, 200), // первые 200 символов
    }));
  }
}
