'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { useRun } from '../../context/RunContext';

export default function ScriptView() {
  const { executionId } = useParams() as { executionId: string };
  const router = useRouter();
  const { runDataMap, saveRunData } = useRun();

  const runData = runDataMap[executionId];
  
  // Local state holding the current editor code
  const [editorCode, setEditorCode] = useState(runData?.script || '');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copyConfirmed, setCopyConfirmed] = useState(false);

  if (!runData) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
        <h3>Loading script parameters...</h3>
        <p>If this page does not load, return to the <a href="/">home page</a>.</p>
      </div>
    );
  }

  // Dirty check to track modifications
  const isDirty = editorCode !== runData.script;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editorCode);
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 2000);
    } catch (err) {
      alert('Failed to copy text to clipboard.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([editorCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated.spec.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRunEdited = async () => {
    setIsExecuting(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${apiUrl}/execute-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // We pass fastMode: true to instruct the backend/history that this is a custom user-edited run
        body: JSON.stringify({ script: editorCode, fastMode: true }),
      });

      if (!res.ok) {
        throw new Error('Infrastructure error occurred during execution.');
      }

      const { executionId: newId } = await res.json();

      // Parse step actions out of the edited code to preserve checklist view structures
      const steps: string[] = [];
      const lines = editorCode.split(/\n/);
      for (const line of lines) {
        if (line.includes('[STEP_START]')) {
          const action = line.split('[STEP_START]')[1]?.replace(/['");\s]+$/, '')?.replace(/^['"\s]+/, '')?.trim();
          if (action) steps.push(action);
        }
      }

      // Save the edited run configuration
      saveRunData(newId, {
        executionId: newId,
        instruction: `Custom User-Edited Run (Parent: ${executionId})`,
        detectedActions: steps.length > 0 ? steps : ['Custom edited script step execution'],
        script: editorCode,
        isUserEdited: true,
        execResult: null,
      });

      // Navigate to the live run dashboard page
      router.push(`/run/${newId}?autostart=true&fastMode=true`);
    } catch (err: any) {
      alert(`Failed to execute edited script: ${err.message}`);
      setIsExecuting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eaeaea', paddingBottom: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0 }}>Script Editor</h2>
          {isDirty && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                backgroundColor: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fde68a',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              🛠️ Modified
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleRunEdited}
            disabled={isExecuting}
            style={{
              padding: '8px 16px',
              backgroundColor: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: isExecuting ? 0.7 : 1,
            }}
          >
            {isExecuting ? 'Executing…' : 'Run Edited Script'}
          </button>
          <button
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#eaeaea',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            onClick={handleCopy}
          >
            {copyConfirmed ? 'Copied!' : 'Copy'}
          </button>
          <button
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#eaeaea',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            onClick={handleDownload}
          >
            Download
          </button>
        </div>
      </div>

      <div style={{ padding: '10px 15px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', color: '#1e3a8a', marginBottom: '15px', fontSize: '14px' }}>
        ℹ️ You can edit the Playwright script below. Click <strong>Run Edited Script</strong> to trigger execution of your custom modified statements immediately.
      </div>

      <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd', height: '500px' }}>
        <Editor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-light"
          value={editorCode}
          onChange={(val) => setEditorCode(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}
