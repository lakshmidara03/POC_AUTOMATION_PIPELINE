'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LlmScriptResponse } from '@poc/shared';
import { useRun } from './context/RunContext';

interface DemoTarget {
  id: string;
  label: string;
  instructionTemplate: string;
}

const DEMO_TARGETS: DemoTarget[] = [
  {
    id: 'the-internet',
    label: 'The Internet — Simple Login',
    instructionTemplate: `Login to https://the-internet.herokuapp.com/login
Username: tomsmith
Password: SuperSecretPassword!
Verify secure area dashboard is displayed.`,
  },
  {
    id: 'practice-test-automation',
    label: 'Practice Test Automation — Student Login',
    instructionTemplate: `Login to https://practicetestautomation.com/practice-test-login/
Username: student
Password: Password123
Verify page redirects to successfully logged in page.`,
  },
  {
    id: 'saucedemo',
    label: 'SauceDemo — Swag Labs Catalog Store',
    instructionTemplate: `Login to https://www.saucedemo.com/
Username: standard_user
Password: secret_sauce
Verify Swag Labs inventory catalog header title is displayed.`,
  },
];

export default function Home() {
  const [selectedTarget, setSelectedTarget] = useState(DEMO_TARGETS[0].id);
  const [instruction, setInstruction] = useState(DEMO_TARGETS[0].instructionTemplate);
  const [isLoading, setIsLoading] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { saveRunData } = useRun();

  const handleTargetChange = (targetId: string) => {
    const target = DEMO_TARGETS.find(t => t.id === targetId);
    if (!target) return;

    // Direct overwrite option
    setSelectedTarget(targetId);
    setInstruction(target.instructionTemplate);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${apiUrl}/generate-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instruction }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.message
          ? Array.isArray(errorData.message)
            ? errorData.message.join(', ')
            : errorData.message
          : 'Failed to generate script';
        throw new Error(message);
      }

      const data: LlmScriptResponse = await res.json();

      // Trigger automatic execution immediately after generation to fetch the execution ID (passing fastMode parameter)
      const executeRes = await fetch(`${apiUrl}/execute-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script: data.script, fastMode }),
      });

      if (!executeRes.ok) {
        const errorData = await executeRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'Infrastructure error occurred during execution setup.');
      }

      const { executionId } = await executeRes.json();

      // Store initial run parameters inside the persistent routing context
      saveRunData(executionId, {
        executionId,
        instruction,
        detectedActions: data.detectedActions,
        script: data.script,
        execResult: null,
      });

      // Automatically navigate to live action dashboard once execution starts (forward fastMode state in query parameters)
      router.push(`/run/${executionId}?autostart=true&fastMode=${fastMode}`);

    } catch (err: any) {
      setError(err.message || 'A network error occurred while connecting to the API server.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <header>
        <h1 style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '10px' }}>AI Test Automation Platform — PoC</h1>
      </header>

      <section style={{ margin: '20px 0' }}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="demoTargetSelect" style={{ display: 'block', fontSize: '15px', color: '#4b5563', fontWeight: 'bold', marginBottom: '8px' }}>
            Select Demo Target Site:
          </label>
          <select
            id="demoTargetSelect"
            value={selectedTarget}
            onChange={(e) => handleTargetChange(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
          >
            {DEMO_TARGETS.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </div>

        <h3>Test Instruction</h3>
        <textarea
          style={{
            width: '100%',
            height: '150px',
            padding: '12px',
            fontSize: '16px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontFamily: 'monospace',
            lineHeight: '1.4',
          }}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Enter test instruction here..."
          disabled={isLoading}
        />
        
        <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            id="fastModeToggle"
            checked={fastMode}
            onChange={(e) => setFastMode(e.target.checked)}
            disabled={isLoading}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="fastModeToggle" style={{ fontSize: '15px', color: '#4b5563', userSelect: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            Run Fast (skip demo pacing holds)
          </label>
        </div>

        <button
          style={{
            marginTop: '15px',
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            fontWeight: 'bold',
          }}
          onClick={handleGenerate}
          disabled={isLoading}
        >
          {isLoading ? 'Generating Spec & Script…' : 'Generate & Run'}
        </button>
      </section>

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#fdf0f0', border: '1px solid #f8baba', borderRadius: '4px', color: '#b91c1c', margin: '20px 0' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
