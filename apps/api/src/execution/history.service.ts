import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

export interface RunHistoryRecord {
  executionId: string;
  instruction: string;
  passed: boolean;
  testTitle: string | null;
  errorMessage: string | null;
  durationMs: number;
  timestamp: number;
  scriptFile: string;
  isUserEdited?: boolean;
}

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);
  private readonly historyFilePath = path.resolve(__dirname, '../../../../runs.json');

  // Read all run records from the persisted JSON database
  getRuns(limit = 50): RunHistoryRecord[] {
    try {
      if (!fs.existsSync(this.historyFilePath)) {
        return [];
      }
      const raw = fs.readFileSync(this.historyFilePath, 'utf-8');
      const records: RunHistoryRecord[] = JSON.parse(raw);
      // Sort most recent first
      const sorted = records.sort((a, b) => b.timestamp - a.timestamp);
      return sorted.slice(0, limit);
    } catch (e: any) {
      this.logger.error(`Failed to read run history database: ${e.message}`);
      return [];
    }
  }

  // Persist a new record into runs.json JSON database
  saveRun(record: RunHistoryRecord): void {
    try {
      let records: RunHistoryRecord[] = [];
      if (fs.existsSync(this.historyFilePath)) {
        try {
          const raw = fs.readFileSync(this.historyFilePath, 'utf-8');
          records = JSON.parse(raw);
        } catch {
          records = [];
        }
      }
      records.push(record);
      fs.writeFileSync(this.historyFilePath, JSON.stringify(records, null, 2), 'utf-8');
      this.logger.log(`Persisted execution run entry: ${record.executionId}`);
    } catch (e: any) {
      this.logger.error(`Failed to write run history record: ${e.message}`);
    }
  }
}
