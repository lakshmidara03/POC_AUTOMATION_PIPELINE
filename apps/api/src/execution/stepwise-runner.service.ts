import { Injectable, Logger } from '@nestjs/common';
import { chromium, Page, expect } from 'playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { ExecutionGateway } from './execution.gateway';
import { LlmService } from '../llm/llm.service';
import { HistoryService } from './history.service';

export interface ExecutionResult {
  exitCode: number;
  passed: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
  command: string;
  scriptFile: string;
  testTitle: string | null;
  errorMessage: string | null;
  screenshotUrl: string | null;
  stepDetails?: Array<{
    action: string;
    originalCode: string;
    correctedCode: string | null;
  }>;
  isUserEdited?: boolean;
}

@Injectable()
export class StepwiseRunnerService {
  private readonly logger = new Logger(StepwiseRunnerService.name);
  private readonly templateDir = path.resolve(__dirname, '../../../../playwright-template');
  private readonly holdDurationMs: number;
  private readonly useDynamicStepTiming: boolean;

  // HOLD_DURATIONS_MS per action type classification
  private readonly HOLD_DURATIONS_MS = {
    navigation: 10000,
    input: 8000,
    click: 8000,
    verification: 6000,
  };

  constructor(
    private readonly gateway: ExecutionGateway,
    private readonly llmService: LlmService,
    private readonly historyService: HistoryService,
  ) {
    // Read STEP_HOLD_DURATION_MS from environment variables, defaulting to 10000ms (10s)
    const holdEnv = process.env.STEP_HOLD_DURATION_MS;
    this.holdDurationMs = holdEnv ? parseInt(holdEnv, 10) : 10000;

    // Read USE_DYNAMIC_STEP_TIMING, defaulting to true
    const dynamicEnv = process.env.USE_DYNAMIC_STEP_TIMING;
    this.useDynamicStepTiming = dynamicEnv !== 'false';

    this.logger.log(
      `Stepwise hold duration: flat=${this.holdDurationMs}ms, useDynamic=${this.useDynamicStepTiming}`,
    );
  }

  // Classify a step action description text to retrieve the corresponding hold duration
  private getStepHoldMs(actionText: string): number {
    if (!this.useDynamicStepTiming) {
      return this.holdDurationMs;
    }
    const lower = actionText.toLowerCase();
    if (lower.includes('navigate') || lower.includes('open') || lower.includes('goto')) {
      return this.HOLD_DURATIONS_MS.navigation;
    }
    if (lower.includes('enter') || lower.includes('type') || lower.includes('fill')) {
      return this.HOLD_DURATIONS_MS.input;
    }
    if (lower.includes('click') || lower.includes('press')) {
      return this.HOLD_DURATIONS_MS.click;
    }
    if (lower.includes('verify') || lower.includes('assert') || lower.includes('check') || lower.includes('expect')) {
      return this.HOLD_DURATIONS_MS.verification;
    }
    return this.HOLD_DURATIONS_MS.verification;
  }

  async runTest(
    executionId: string,
    filename: string,
    timeoutMs = 60000,
    fastMode = false,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    // Read the script file content
    const filePath = path.join(this.templateDir, 'tests', filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Script file not found: ${filePath}`);
    }
    const scriptContent = fs.readFileSync(filePath, 'utf-8');

    // Parse the script to extract step instructions and Playwright code segments
    const steps: { action: string; code: string }[] = [];
    const lines = scriptContent.split(/\r?\n/);
    
    let currentAction: string | null = null;
    let currentCodeLines: string[] = [];

    for (const line of lines) {
      if (line.includes('[STEP_START]')) {
        currentAction = line.split('[STEP_START]')[1]?.replace(/['");\s]+$/, '')?.replace(/^['"\s]+/, '')?.trim();
        currentCodeLines = [];
      } else if (line.includes('[STEP_DONE]')) {
        if (currentAction) {
          steps.push({ action: currentAction, code: currentCodeLines.join('\n') });
        }
        currentAction = null;
      } else if (currentAction) {
        currentCodeLines.push(line);
      }
    }

    this.logger.log(`[${executionId}] Parsed ${steps.length} stepwise actions from ${filename}`);

    let browser: any = null;
    let page: Page | null = null;
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let passed = true;
    let errorMessage: string | null = null;
    let testTitle = 'Stepwise Execution';
    let screenshotUrl: string | null = null;

    // Track results for Feature 7 diff view
    const stepDetails: Array<{
      action: string;
      originalCode: string;
      correctedCode: string | null;
    }> = [];

    try {
      // 1. Launch in HEADED mode with slowMo delay
      browser = await chromium.launch({
        headless: false,
        slowMo: 250,
        args: ['--start-maximized'],
      });
      
      const context = await browser.newContext({
        viewport: null, // use the actual window size of maximized browser
      });
      page = await context.newPage();

      // Execute each parsed step sequentially
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        // Emit log line representing log markers
        const startLog = `[STEP_START] ${step.action}`;
        stdoutBuffer += `${startLog}\n`;
        this.gateway.emitLogLine(executionId, 'stdout', startLog);
        this.gateway.emitStepProgress(executionId, step.action, 'running');

        let originalCode = step.code;
        let correctedCode: string | null = null;
        let successOnExecution = false;

        try {
          // Attempt 1: Execute original code block
          const fn = new Function('page', 'expect', `return (async () => { ${originalCode} })();`);
          await fn(page, expect);
          successOnExecution = true;
        } catch (firstErr: any) {
          this.logger.warn(`[${executionId}] Step failed: "${step.action}". Initiating self-healing retry...`);
          
          // Emit "retrying" progress status
          this.gateway.emitStepProgress(executionId, step.action, 'retrying');
          
          try {
            // A. Capture structural page HTML context
            let html = await page.content();
            // Truncate to first 8000 characters to keep payload compact for LLM
            if (html.length > 8000) {
              html = html.substring(0, 8000);
            }

            // B. Request corrected statement from LLM
            const correction = await this.llmService.regenerateStep(
              step.action,
              originalCode,
              firstErr.message || String(firstErr),
              html,
            );

            correctedCode = correction.code;
            this.logger.log(`[${executionId}] Self-healing generated correction: ${correctedCode}`);

            // C. Execute corrected code statement
            const fnRetry = new Function('page', 'expect', `return (async () => { ${correctedCode} })();`);
            await fnRetry(page, expect);
            successOnExecution = true;

            const healLog = `[SELF_HEALED] Step "${step.action}" recovered using corrected statement.`;
            stdoutBuffer += `${healLog}\n`;
            this.gateway.emitLogLine(executionId, 'stdout', healLog);
          } catch (retryErr: any) {
            // Failed retry path
            passed = false;
            errorMessage = retryErr.message || retryErr.stack || String(retryErr);
            
            const errorLog = `Step Failure [${step.action}] (Self-Healing Failed): ${errorMessage}`;
            stderrBuffer += `${errorLog}\n`;
            this.gateway.emitLogLine(executionId, 'stderr', errorLog);
            this.gateway.emitStepProgress(executionId, step.action, 'failed');

            // Capture failure screenshot
            const screenshotDir = path.join(this.templateDir, 'test-results', `stepwise-${executionId}`);
            if (!fs.existsSync(screenshotDir)) {
              fs.mkdirSync(screenshotDir, { recursive: true });
            }
            const screenshotPath = path.join(screenshotDir, 'screenshot.png');
            await page.screenshot({ path: screenshotPath });
            screenshotUrl = `/execution-artifacts/${executionId}/screenshot`;
            
            break; // Terminate execution run
          }
        }

        if (successOnExecution) {
          const doneLog = `[STEP_DONE] ${step.action}`;
          stdoutBuffer += `${doneLog}\n`;
          this.gateway.emitLogLine(executionId, 'stdout', doneLog);
          this.gateway.emitStepProgress(executionId, step.action, 'done');

          // Add execution record metrics
          stepDetails.push({
            action: step.action,
            originalCode,
            correctedCode,
          });

          // 2. Add a hold after each step, EXCEPT the last step
          const isLastStep = i === steps.length - 1;
          if (!isLastStep && !fastMode) {
            const holdMs = this.getStepHoldMs(step.action);
            if (holdMs > 0) {
              this.logger.log(`Holding for ${holdMs}ms after step: ${step.action}`);
              await page.waitForTimeout(holdMs);
            }
          }
        }
      }
    } catch (infraErr: any) {
      passed = false;
      errorMessage = `Infrastructure error: ${infraErr.message}`;
      this.logger.error(`[${executionId}] Stepwise infrastructure failure: ${infraErr.message}`);
      this.gateway.emitExecutionError(executionId, errorMessage);
    } finally {
      // Capture passed/final page state screenshot if run passed successfully
      if (passed && page) {
        try {
          const screenshotDir = path.join(this.templateDir, 'test-results', `stepwise-${executionId}`);
          if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
          }
          const screenshotPath = path.join(screenshotDir, 'screenshot.png');
          await page.screenshot({ path: screenshotPath });
          screenshotUrl = `/execution-artifacts/${executionId}/screenshot`;
        } catch (screenshotErr: any) {
          this.logger.error(`Failed to take completion screenshot: ${screenshotErr.message}`);
        }
      }

      // 3. Teardown
      if (browser) {
        await browser.close();
      }
    }

    const duration = Date.now() - startTime;
    const finalResult: ExecutionResult = {
      exitCode: passed ? 0 : 1,
      passed,
      stdout: stdoutBuffer,
      stderr: stderrBuffer,
      durationMs: duration,
      command: `stepwise-run ${filename}`,
      scriptFile: filename,
      testTitle,
      errorMessage,
      screenshotUrl,
      stepDetails,
      isUserEdited: !!fastMode, // fastMode is passed as true for edited runs executed via cli runner pathway
    };

    // Construct and persist history record using JSON file database
    this.historyService.saveRun({
      executionId,
      instruction: steps.map(s => s.action).join(', '),
      passed,
      testTitle,
      errorMessage,
      durationMs: duration,
      timestamp: Date.now(),
      scriptFile: filename,
      isUserEdited: !!fastMode,
    });

    this.gateway.emitExecutionComplete(executionId, finalResult);
    return finalResult;
  }
}
