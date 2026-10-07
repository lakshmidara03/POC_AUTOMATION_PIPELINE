'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useRun, ExecutionResult } from '../../context/RunContext';

type StepStatus = 'pending' | 'running' | 'retrying' | 'done' | 'failed';
interface LogLine {
  stream: 'stdout' | 'stderr';
  text: string;
}

export default function LiveAction() {
  const { executionId } = useParams() as { executionId: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const { runDataMap, saveRunData } = useRun();

  const runData = runDataMap[executionId];

  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [actionStatuses, setActionStatuses] = useState<Record<string, StepStatus>>({});
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logs panel on new log lines
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logLines]);

  useEffect(() => {
    if (!runData) return;

    // Load initial statuses (if completed previously, mark all as 'done', otherwise 'pending')
    const initialStatuses: Record<string, StepStatus> = {};
    const hasPassed = runData.execResult?.passed;
    runData.detectedActions.forEach((action) => {
      initialStatuses[action] = hasPassed ? 'done' : 'pending';
    });
    setActionStatuses(initialStatuses);

    // Initialize connection
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const socketUrl = apiUrl.replace(/\/$/, '');
    
    const socket = io(`${socketUrl}/execution`, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket namespace /execution');
      socket.emit('join-room', { executionId });

      // If URL query parameter autostart is set, mark active (only if not completed previously)
      const autostart = searchParams.get('autostart') === 'true';
      if (autostart && !runData.execResult) {
        setIsExecuting(true);
      } else {
        setIsExecuting(false);
      }
    });

    socket.on('log-line', (data: { stream: 'stdout' | 'stderr'; text: string }) => {
      setLogLines((prev) => [...prev, { stream: data.stream, text: data.text }]);
    });

    socket.on('step-progress', (data: { action: string; status: StepStatus }) => {
      if (data.status === 'running') {
        setCurrentStep(data.action);
        setIsExecuting(true);
      }
      setActionStatuses((prev) => {
        const next = { ...prev };
        next[data.action] = data.status;

        // Safety net: mark any actions listed before this 'running' step as 'done'
        if (data.status === 'running') {
          const index = runData.detectedActions.indexOf(data.action);
          if (index > 0) {
            for (let i = 0; i < index; i++) {
              const prevAction = runData.detectedActions[i];
              if (next[prevAction] === 'pending' || next[prevAction] === 'running') {
                next[prevAction] = 'done';
              }
            }
          }
        }
        return next;
      });
    });

    socket.on('execution-complete', (data: ExecutionResult) => {
      saveRunData(executionId, { execResult: data });
      setIsExecuting(false);
      setCurrentStep(null);
      cleanup();
    });

    socket.on('execution-error', (data: { message: string }) => {
      setError(`Execution failed: ${data.message}`);
      setIsExecuting(false);
      setCurrentStep(null);
      cleanup();
    });

    const cleanup = () => {
      socket.off('log-line');
      socket.off('step-progress');
      socket.off('execution-complete');
      socket.off('execution-error');
    };

    return () => {
      socket.disconnect();
    };
  }, [executionId, runData]);

  // Handle re-triggering tests manually on demand
  const handleReRun = async () => {
    if (!runData) return;
    setIsExecuting(true);
    setError(null);
    setLogLines([]);

    const resetStatuses: Record<string, StepStatus> = {};
    runData.detectedActions.forEach((action) => {
      resetStatuses[action] = 'pending';
    });
    setActionStatuses(resetStatuses);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const socket = socketRef.current;

    if (!socket || !socket.connected) {
      setError('WebSocket connection error.');
      setIsExecuting(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/execute-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script: runData.script }),
      });

      if (!res.ok) {
        throw new Error('Infrastructure error occurred during execution.');
      }

      const { executionId: newId } = await res.json();
      
      // Update persistent context map with new execution target
      saveRunData(newId, {
        executionId: newId,
        instruction: runData.instruction,
        detectedActions: runData.detectedActions,
        script: runData.script,
        execResult: null,
      });

      router.push(`/run/${newId}?autostart=true`);
    } catch (e: any) {
      setError(e.message);
      setIsExecuting(false);
    }
  };

  const renderStatusIndicator = (status: StepStatus) => {
    switch (status) {
      case 'running':
        return (
          <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold', marginRight: '10px' }}>
            Running...
          </span>
        );
      case 'retrying':
        return (
          <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 'bold', marginRight: '10px', animation: 'pulse 1.5s infinite ease-in-out' }}>
            Retrying...
          </span>
        );
      case 'failed':
        return <span style={{ color: '#dc2626', marginRight: '10px', fontWeight: 'bold' }}>✗ Failed</span>;
      case 'done':
      case 'pending':
      default:
        return null;
    }
  };

  if (!runData) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
        <h3>Loading execution parameters...</h3>
        <p>If this page does not load, return to the <a href="/">home page</a> and start a new test.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eaeaea', paddingBottom: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0 }}>Live Execution Dashboard</h2>
          {searchParams.get('fastMode') === 'true' && (
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
              ⚡ Fast Mode Active
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleReRun}
            disabled={isExecuting}
            style={{
              padding: '8px 16px',
              backgroundColor: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              opacity: isExecuting ? 0.7 : 1,
              fontWeight: 'bold',
            }}
          >
            {(() => {
              const total = runData.detectedActions.length;
              const completedCount = runData.detectedActions.filter(
                (act) => actionStatuses[act] === 'done'
              ).length;

              if (isExecuting) {
                return 'Running…';
              }
              if (completedCount === total && total > 0) {
                return 'Run Again';
              }
              if (completedCount > 0 && completedCount < total) {
                return 'Running…';
              }
              return 'Run Test';
            })()}
          </button>
          
          {runData.execResult && (
            <button
              onClick={() => router.push(`/reports/${executionId}`)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0070f3',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              View Report
            </button>
          )}
        </div>
      </div>

      {currentStep && (
        <div style={{ padding: '15px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', color: '#1e3a8a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px', animation: 'spin 2s infinite linear' }}>🔄</span>
          <span><strong>Currently:</strong> {currentStep}</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#fdf0f0', border: '1px solid #f8baba', borderRadius: '4px', color: '#b91c1c', margin: '20px 0' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        <div>
          <h3>Detected Actions Checklist</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {runData.detectedActions.map((action, i) => {
              const status = actionStatuses[action] || 'pending';
              const isFailed = status === 'failed';
              const isRunning = status === 'running';
              const isDone = status === 'done';
              const isRetrying = status === 'retrying';

              let itemBgColor = '#f5f5f5';
              if (isRunning) itemBgColor = '#eff6ff';
              if (isDone) itemBgColor = '#f0fdf4';
              if (isFailed) itemBgColor = '#fef2f2';
              if (isRetrying) itemBgColor = '#fffbeb';

              return (
                <li
                  key={i}
                  style={{
                    padding: '10px 12px',
                    margin: '5px 0',
                    backgroundColor: itemBgColor,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'background-color 0.3s ease',
                    opacity: status === 'pending' ? 0.65 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isDone}
                    readOnly
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'default',
                      accentColor: '#16a34a',
                    }}
                  />
                  {renderStatusIndicator(status)}
                  <span style={{
                    textDecoration: isDone ? 'line-through' : 'none',
                    color: isFailed ? '#dc2626' : (status === 'pending' ? '#4b5563' : '#111827'),
                  }}>
                    {action}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3>Live Browser Status</h3>
          <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '20px', height: '240px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🌐</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Headed Browser Session</h3>
            <p style={{ margin: '0', color: '#475569', fontSize: '14px', maxWidth: '320px', lineHeight: '1.5' }}>
              {isExecuting ? (
                <strong style={{ color: '#0284c7' }}>
                  A browser window has opened on this machine — watch it to see each action live. This page will update as each step completes.
                </strong>
              ) : (
                'The browser runs locally in a visible window. Start test execution to observe the live steps.'
              )}
            </p>
          </div>
        </div>
      </div>

      {(isExecuting || logLines.length > 0) && (
        <section style={{ marginTop: '30px' }}>
          <h3>Live Log Stream</h3>
          <div
            style={{
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              padding: '15px',
              borderRadius: '6px',
              maxHeight: '300px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {logLines.map((line, i) => (
              <div key={i} style={{ color: line.stream === 'stderr' ? '#fca5a5' : '#f8fafc' }}>
                {line.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </section>
      )}
    </div>
  );
}
