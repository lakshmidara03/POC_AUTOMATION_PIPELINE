import { Module } from '@nestjs/common';
import { ScriptWriterService } from './script-writer.service';
import { ExecutionRunnerService } from './execution-runner.service';
import { StepwiseRunnerService } from './stepwise-runner.service';
import { HistoryService } from './history.service';
import { ExecutionController } from './execution.controller';
import { ExecutionGateway } from './execution.gateway';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [ScriptWriterService, ExecutionRunnerService, StepwiseRunnerService, HistoryService, ExecutionGateway],
  controllers: [ExecutionController],
})
export class ExecutionModule {}

