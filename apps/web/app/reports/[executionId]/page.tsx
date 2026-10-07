'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRun } from '../../context/RunContext';

export default function Reports() {
  const { executionId } = useParams() as { executionId: string };
  const router = useRouter();
  const { runDataMap } = useRun();

  const runData = runDataMap[executionId];
  const execResult = runData?.execResult;

  // Track collapsed state for self-healing diff view records
  const [openDiffIndex, setOpenDiffIndex] = useState<number | null>(null);

  if (!runData) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
        <h3>Loading report parameters...</h3>
        <p>If this page does not load, return to the <a href="/">home page</a>.</p>
      </div>
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Count self-healed steps containing non-null correctedCode parameters
  const correctedSteps = execResult?.stepDetails?.filter(step => step.correctedCode !== null) || [];
  const selfHealedCount = correctedSteps.length;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eaeaea', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2>Execution Report</h2>
        <button
          onClick={() => router.push(`/scripts/${executionId}`)}
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
          View Generated Script
        </button>
      </div>

      {execResult ? (
        <section style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                color: '#fff',
                fontWeight: 'bold',
                backgroundColor: execResult.passed ? '#16a34a' : '#dc2626',
              }}
            >
              {execResult.passed ? 'Passed' : 'Failed'}
            </span>
            {execResult.isUserEdited ? (
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  color: '#1e3a8a',
                  fontWeight: 'bold',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  fontSize: '13px',
                }}
              >
                🛠️ Ran from user-edited script
              </span>
            ) : (
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  color: '#065f46',
                  fontWeight: 'bold',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  fontSize: '13px',
                }}
              >
                🤖 Ran from AI-generated script
              </span>
            )}
            <span style={{ color: '#4b5563', fontSize: '14px', fontWeight: 'bold' }}>
              Duration: {(execResult.durationMs / 1000).toFixed(2)}s
            </span>
          </div>

          {/* Self-healing summary notifications alerts */}
          {selfHealedCount > 0 && (
            <div style={{ padding: '15px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', color: '#b45309', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                ⚡ <strong>{selfHealedCount} step(s) were auto-corrected</strong> during this run to recover from locator execution failures.
              </span>
              <a href="#self-healing-diffs" style={{ color: '#b45309', fontWeight: 'bold', textDecoration: 'underline', fontSize: '14px' }}>
                View Diffs
              </a>
            </div>
          )}

          {!execResult.passed && execResult.errorMessage && (
            <div style={{ padding: '15px', backgroundColor: '#fdf0f0', border: '1px solid #f8baba', borderRadius: '4px', color: '#b91c1c', margin: '15px 0' }}>
              <strong>Test Failure Detail:</strong>
              {execResult.testTitle && <div style={{ fontWeight: 'bold', margin: '5px 0' }}>Test: {execResult.testTitle}</div>}
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', marginTop: '5px', backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #f3d4d4', overflowX: 'auto' }}>
                {execResult.errorMessage}
              </pre>
              
              {execResult.screenshotUrl && (
                <div style={{ marginTop: '15px' }}>
                  <strong>Failure Screenshot:</strong>
                  <div style={{ marginTop: '8px', border: '1px solid #f8baba', borderRadius: '4px', overflow: 'hidden', display: 'inline-block' }}>
                    <img
                      src={`${apiUrl}${execResult.screenshotUrl}`}
                      alt="Playwright Failure Screenshot"
                      style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {execResult.passed && execResult.screenshotUrl && (
            <div style={{ padding: '15px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', color: '#166534', margin: '15px 0' }}>
              <strong>Execution Completion Screenshot:</strong>
              <div style={{ marginTop: '8px', border: '1px solid #bbf7d0', borderRadius: '4px', overflow: 'hidden', display: 'inline-block' }}>
                <img
                  src={`${apiUrl}${execResult.screenshotUrl}`}
                  alt="Playwright Completion Screenshot"
                  style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: '25px' }}>
            <strong>Command Run:</strong>
            <code style={{ display: 'block', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '4px', marginTop: '5px', fontSize: '14px' }}>
              {execResult.command}
            </code>
          </div>

          {/* Self-healing diffs detailed presentation block */}
          {selfHealedCount > 0 && (
            <section id="self-healing-diffs" style={{ marginTop: '30px', borderTop: '2px solid #f1f5f9', paddingTop: '20px' }}>
              <h3 style={{ color: '#1f2937', marginBottom: '15px' }}>Self-Healing Code Fixes</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                The following selectors failed during the initial execution. The AI corrected the selectors using the live page HTML markup context.
              </p>

              {correctedSteps.map((step, index) => (
                <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '15px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenDiffIndex(openDiffIndex === index ? null : index)}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      backgroundColor: '#f9fafb',
                      border: 'none',
                      borderBottom: openDiffIndex === index ? '1px solid #e5e7eb' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      color: '#374151',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>🛠️ Step: "{step.action}"</span>
                    <span>{openDiffIndex === index ? 'Collapse ▲' : 'View Fix ▼'}</span>
                  </button>

                  {openDiffIndex === index && (
                    <div style={{ padding: '15px', backgroundColor: '#fff' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <strong style={{ display: 'block', fontSize: '12px', color: '#dc2626', marginBottom: '5px' }}>Original Code (Failed Selector)</strong>
                          <pre style={{ margin: 0, padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '13px', color: '#991b1b', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                            {step.originalCode}
                          </pre>
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '12px', color: '#16a34a', marginBottom: '5px' }}>Corrected Code (Auto-Healed)</strong>
                          <pre style={{ margin: 0, padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '13px', color: '#166534', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                            {step.correctedCode}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

        </section>
      ) : (
        <div style={{ padding: '20px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '6px' }}>
          <strong>No execution summary available yet.</strong> Go back to the <a href={`/run/${executionId}`}>Live Action page</a> to complete execution first.
        </div>
      )}
    </div>
  );
}
