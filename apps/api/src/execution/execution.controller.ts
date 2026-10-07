import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  Body,
  Query,
  InternalServerErrorException,
  NotFoundException,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { ScriptWriterService } from './script-writer.service';
import { StepwiseRunnerService } from './stepwise-runner.service';
import { HistoryService } from './history.service';

class ExecuteDto {
  @IsString()
  @IsNotEmpty()
  script!: string;

  @IsBoolean()
  @IsOptional()
  fastMode?: boolean;
}

@Controller()
export class ExecutionController {
  private readonly templateDir = path.resolve(__dirname, '../../../../playwright-template');

  constructor(
    private readonly scriptWriterService: ScriptWriterService,
    private readonly stepwiseRunnerService: StepwiseRunnerService,
    private readonly historyService: HistoryService,
  ) {}

  @Get('runs')
  getRuns(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.historyService.getRuns(parsedLimit);
  }

  @Post('execute-script')
  @HttpCode(HttpStatus.ACCEPTED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async executeScript(@Body() body: ExecuteDto): Promise<{ executionId: string }> {
    try {
      // 1. Write the script
      const { filename } = this.scriptWriterService.writeScript(body.script);

      // 2. Generate UUID
      const executionId = randomUUID();

      // 3. Kick off execution asynchronously (delayed by 1.5s to let socket join room first)
      setTimeout(() => {
        // Dynamically compute runtime timeout based on step counts & configured hold duration
        const holdEnv = process.env.STEP_HOLD_DURATION_MS;
        const holdMs = body.fastMode ? 0 : (holdEnv ? parseInt(holdEnv, 10) : 10000);
        
        // Parse step occurrences in body script to approximate step count
        const stepMatches = body.script.match(/\[STEP_START\]/g);
        const stepCount = stepMatches ? stepMatches.length : 5;
        
        // Timeout formula: (stepCount * holdMs) + 60 seconds buffer
        const calculatedTimeoutMs = (stepCount * holdMs) + 60000;

        this.stepwiseRunnerService.runTest(executionId, filename, calculatedTimeoutMs, !!body.fastMode).catch((err) => {
          console.error(`Background execution error for ${executionId}:`, err);
        });
      }, 1500);

      // 4. Respond immediately with status 202 Accepted and the executionId
      return { executionId };
    } catch (err: any) {
      throw new InternalServerErrorException(`Infrastructure error during test setup: ${err.message}`);
    }
  }

  @Get('execution-artifacts/:executionId/screenshot')
  async getScreenshot(
    @Param('executionId') executionId: string,
    @Res() res: Response,
  ) {
    const testResultsDir = path.join(this.templateDir, 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      throw new NotFoundException('Screenshot not found.');
    }

    // Traverse the test-results folder looking for the screenshot associated with this run
    // Since Playwright creates folders named test-results/generated-<ts>-<rand>-<test-name>-<project>/screenshot.png
    // We scan files matching generated-*.png in subdirectories
    const findScreenshot = (dir: string): string | null => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const found = findScreenshot(fullPath);
          if (found) return found;
        } else if (file.endsWith('.png') && (file.includes('screenshot') || stat.size > 0)) {
          return fullPath;
        }
      }
      return null;
    };

    const screenshotFilePath = findScreenshot(testResultsDir);

    if (!screenshotFilePath || !fs.existsSync(screenshotFilePath)) {
      throw new NotFoundException('Screenshot not found for this execution.');
    }

    res.setHeader('Content-Type', 'image/png');
    const readStream = fs.createReadStream(screenshotFilePath);
    
    // Once standard transfer is complete, we clean up the screenshot file
    res.on('finish', () => {
      try {
        fs.unlinkSync(screenshotFilePath);
        // Also attempt to remove directory if empty
        const parentDir = path.dirname(screenshotFilePath);
        if (fs.readdirSync(parentDir).length === 0) {
          fs.rmdirSync(parentDir);
        }
      } catch {}
    });

    readStream.pipe(res);
  }
}
