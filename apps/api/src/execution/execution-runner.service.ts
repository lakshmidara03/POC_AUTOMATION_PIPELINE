import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { ExecutionGateway } from './execution.gateway';

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
}

@Injectable()
export class ExecutionRunnerService {
  private readonly logger = new Logger(ExecutionRunnerService.name);
  private readonly templateDir = path.resolve(__dirname, '../../../../playwright-template');

  constructor(private readonly gateway: ExecutionGateway) {}

  async runTest(
    executionId: string,
    filename: string,
    timeoutMs = 60000,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const isWindows = process.platform === 'win32';
    const commandName = isWindows ? 'npx.cmd' : 'npx';

    // Per-execution JSON report path
    const reportFilename = `report-${executionId}.json`;
    const reportPath = path.join(this.templateDir, reportFilename);

    const args = [
      'playwright',
      'test',
      `tests/${filename}`,
      '--reporter=list,json',
    ];
    const fullCommandString = `${commandName} ${args.join(' ')}`;

    this.logger.log(`[${executionId}] Executing test: ${fullCommandString}`);

    // Set JSON output name in environment variables for Playwright reporter redirection
    const envConfig = {
      ...process.env,
      PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath,
    };

    return new Promise((resolve) => {
      const child = spawn(commandName, args, {
        cwd: this.templateDir,
        shell: isWindows,
        env: envConfig,
      });

      let stdoutBuffer = '';
      let stderrBuffer = '';

      // Keep track of which actions we detected starting/finishing to tag failures on exit
      const activeActions: string[] = [];

      // Helper to process chunk into single lines and emit them
      const handleDataStream = (chunk: any, stream: 'stdout' | 'stderr') => {
        const text = chunk.toString();
        if (stream === 'stdout') {
          stdoutBuffer += text;
        } else {
          stderrBuffer += text;
        }

        // Split by lines, drop trailing empty item to avoid empty emissions
        const lines = text.split(/\r?\n/);
        lines.forEach((line: string) => {
          if (line.trim() !== '') {
            // Forward raw log line to client terminal view
            this.gateway.emitLogLine(executionId, stream, line);

            // Parse live step marker tokens
            if (line.includes('[STEP_START]')) {
              const action = line.split('[STEP_START]')[1]?.trim();
              if (action) {
                activeActions.push(action);
                this.gateway.emitStepProgress(executionId, action, 'running');
              }
            } else if (line.includes('[STEP_DONE]')) {
              const action = line.split('[STEP_DONE]')[1]?.trim();
              if (action) {
                const index = activeActions.indexOf(action);
                if (index !== -1) {
                  activeActions.splice(index, 1);
                }
                this.gateway.emitStepProgress(executionId, action, 'done');
              }
            }
          }
        });
      };

      child.stdout.on('data', (chunk) => handleDataStream(chunk, 'stdout'));
      child.stderr.on('data', (chunk) => handleDataStream(chunk, 'stderr'));

      const resolveExecution = (exitCode: number, passed: boolean, timedOut = false) => {
        const duration = Date.now() - startTime;
        
        let testTitle: string | null = null;
        let errorMessage: string | null = null;
        let screenshotUrl: string | null = null;

        // Parse structured Playwright JSON report
        if (fs.existsSync(reportPath)) {
          try {
            const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            const spec = reportData.suites?.[0]?.specs?.[0];
            if (spec) {
              testTitle = spec.title || null;
              const resultObj = spec.tests?.[0]?.results?.[0];
              if (resultObj) {
                // Extract error message
                if (resultObj.error) {
                  errorMessage = resultObj.error.message || resultObj.error.stack || null;
                }
                
                // Extract screenshot attachment path if any
                const screenshotAttachment = resultObj.attachments?.find(
                  (att: any) => att.name === 'screenshot' || att.contentType?.startsWith('image/'),
                );
                if (screenshotAttachment && screenshotAttachment.path) {
                  // Resolve path relative to templateDir to check existence
                  const absoluteScreenshotPath = path.isAbsolute(screenshotAttachment.path)
                    ? screenshotAttachment.path
                    : path.join(this.templateDir, screenshotAttachment.path);

                  if (fs.existsSync(absoluteScreenshotPath)) {
                    screenshotUrl = `/execution-artifacts/${executionId}/screenshot`;
                  }
                }
              }
            }
          } catch (e: any) {
            this.logger.error(`Failed to parse Playwright JSON report: ${e.message}`);
          } finally {
            // Clean up report file after reading to avoid leaving traces
            try {
              fs.unlinkSync(reportPath);
            } catch {}
          }
        }

        // If the execution failed/timed out, mark any currently active action as failed
        if (!passed || timedOut) {
          activeActions.forEach((action) => {
            this.gateway.emitStepProgress(executionId, action, 'failed');
          });
        }

        const finalResult: ExecutionResult = {
          exitCode,
          passed,
          stdout: stdoutBuffer,
          stderr: stderrBuffer + (timedOut ? `\nError: Execution timed out after ${timeoutMs}ms.` : ''),
          durationMs: duration,
          command: fullCommandString,
          scriptFile: filename,
          testTitle,
          errorMessage,
          screenshotUrl,
        };

        if (timedOut) {
          this.gateway.emitExecutionError(executionId, `Execution timed out after ${timeoutMs}ms.`);
        } else {
          this.gateway.emitExecutionComplete(executionId, finalResult);
        }

        resolve(finalResult);
      };

      const timer = setTimeout(() => {
        this.logger.warn(`[${executionId}] Execution timeout reached. Killing process...`);
        child.kill();
        resolveExecution(-1, false, true);
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolveExecution(code ?? -1, code === 0);
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        stderrBuffer += `\nProcess error: ${err.message}`;
        resolveExecution(-1, false);
      });
    });
  }
}
