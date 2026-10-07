import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LlmModule } from './llm/llm.module';
import { ExecutionModule } from './execution/execution.module';

@Module({
  imports: [LlmModule, ExecutionModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

