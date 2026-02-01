import { Body, Controller, Post } from '@nestjs/common';
import { RequirementPipeline } from '@/pipeline/requirement.pipeline';
import { ApiProperty } from '@nestjs/swagger';
import reqList from '@/research/req.md';

class RequirementDto {
  @ApiProperty({
    example: reqList,
  })
  docs: string;

  @ApiProperty({
    example: 'repo_b977501ce7a38a209e261e0964e28c4e7db89611',
  })
  project: string;
}

@Controller('req')
export class RequirementIngestController {
  constructor(private readonly pipeline: RequirementPipeline) {}

  @Post('list')
  ingestRequirement(@Body() dto: RequirementDto) {
    void this.pipeline.processRequirementsList(dto.docs, dto.project);
    return { ok: true };
  }
}
