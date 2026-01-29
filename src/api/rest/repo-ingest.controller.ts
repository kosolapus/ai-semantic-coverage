import { Controller, Post, Body } from '@nestjs/common';
import { RepoIngestService } from '../../domain/codebase/repo-ingest.service';
import { ApiProperty } from '@nestjs/swagger';

class IngestDto {
  @ApiProperty()
  repoUrl: string;
}

@Controller('repo')
export class RepoIngestController {
  constructor(private readonly service: RepoIngestService) {}

  @Post('ingest')
  ingest(@Body() body: IngestDto) {
    void this.service.ingestAndUpsert(body.repoUrl);

    return { ok: true };
  }
}
