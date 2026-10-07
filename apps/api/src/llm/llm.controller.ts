import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { LlmScriptResponse } from '@poc/shared';
import { GenerateDto } from './generate.dto';
import { LlmService } from './llm.service';

@Controller('generate-script')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async generateScript(@Body() body: GenerateDto): Promise<LlmScriptResponse> {
    return this.llmService.generateScript(body.instruction);
  }
}
