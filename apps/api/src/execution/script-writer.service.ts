import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ScriptWriterService {
  private readonly targetDir = path.resolve(__dirname, '../../../../playwright-template/tests');

  writeScript(scriptContent: string): { filePath: string; filename: string } {
    if (!scriptContent || scriptContent.trim() === '') {
      throw new BadRequestException('Script content cannot be empty.');
    }

    if (!fs.existsSync(this.targetDir)) {
      fs.mkdirSync(this.targetDir, { recursive: true });
    }

    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    const filename = `generated-${timestamp}-${randomSuffix}.spec.ts`;
    const filePath = path.join(this.targetDir, filename);

    fs.writeFileSync(filePath, scriptContent, 'utf-8');

    return { filePath, filename };
  }
}
