import { Module } from '@nestjs/common';
import { RequirementService } from './requirements.service';

@Module({
  providers: [RequirementService],
  exports: [RequirementService],
})
export class RequirementsModule {}
