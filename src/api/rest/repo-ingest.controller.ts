import { Controller, Post, Body } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { CodebasePipeline } from '@/pipeline/codebase.pipeline';

class IngestDto {
  @ApiProperty({
    example: 'https://github.com/rekog-labs/MCP-Nest.git',
  })
  repoUrl: string;
}

@Controller('repo')
export class RepoIngestController {
  constructor(private readonly service: CodebasePipeline) {}

  @Post('ingest')
  ingest(@Body() body: IngestDto) {
    void this.service.processUrl(body.repoUrl);

    return { ok: true };
  }
}
