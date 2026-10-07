'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { LlmScriptResponse } from '@poc/shared';

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

interface RunData {
  executionId: string;
  instruction: string;
  detectedActions: string[];
  script: string;
  execResult: ExecutionResult | null;
  isUserEdited?: boolean;
}

interface RunContextProps {
  runDataMap: Record<string, RunData>;
  saveRunData: (executionId: string, data: Partial<RunData>) => void;
}

const RunContext = createContext<RunContextProps | undefined>(undefined);

export const RunProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [runDataMap, setRunDataMap] = useState<Record<string, RunData>>({});

  // Initialize/Load state from localStorage to ensure page refreshes do not lose completed or in-progress run data
  useEffect(() => {
    try {
      const stored = localStorage.getItem('poc_run_data_map');
      if (stored) {
        setRunDataMap(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load runDataMap from localStorage', e);
    }
  }, []);

  const saveRunData = (executionId: string, data: Partial<RunData>) => {
    setRunDataMap((prev) => {
      const existing = prev[executionId] || {
        executionId,
        instruction: '',
        detectedActions: [],
        script: '',
        execResult: null,
      };
      const updated = {
        ...prev,
        [executionId]: {
          ...existing,
          ...data,
        },
      };
      try {
        localStorage.setItem('poc_run_data_map', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to store runDataMap in localStorage', e);
      }
      return updated;
    });
  };

  return (
    <RunContext.Provider value={{ runDataMap, saveRunData }}>
      {children}
    </RunContext.Provider>
  );
};

export const useRun = () => {
  const context = useContext(RunContext);
  if (!context) {
    throw new Error('useRun must be used within a RunProvider');
  }
  return context;
};
