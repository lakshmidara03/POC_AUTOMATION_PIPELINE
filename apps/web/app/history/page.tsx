'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface RunHistoryRecord {
  executionId: string;
  instruction: string;
  passed: boolean;
  testTitle: string | null;
  errorMessage: string | null;
  durationMs: number;
  timestamp: number;
  scriptFile: string;
}

export default function History() {
  const [runs, setRuns] = useState<RunHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      try {
        const res = await fetch(`${apiUrl}/runs`);
        if (!res.ok) {
          throw new Error('Failed to retrieve history logs.');
        }
        const data = await res.json();
        setRuns(data);
      } catch (err: any) {
        setError(err.message || 'Error loading history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatInstruction = (text: string) => {
    if (!text) return '-';
    return text.length > 60 ? `${text.substring(0, 60)}...` : text;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2>Test Execution History</h2>
      </header>

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#fdf0f0', border: '1px solid #f8baba', borderRadius: '4px', color: '#b91c1c', margin: '20px 0' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <p>Loading history records...</p>
      ) : runs.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b' }}>
          No previous runs recorded. Submit a <Link href="/" style={{ color: '#0070f3', fontWeight: 'bold' }}>New Test</Link> to start.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '14px' }}>Status</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '14px' }}>Actions</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '14px' }}>Triggered At</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '14px' }}>Duration</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '14px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.executionId} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', transition: 'background-color 0.2s ease' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: run.passed ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {run.passed ? 'Passed' : 'Failed'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>
                    {formatInstruction(run.instruction)}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {new Date(run.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {(run.durationMs / 1000).toFixed(2)}s
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link
                      href={`/reports/${run.executionId}`}
                      style={{ color: '#0070f3', textDecoration: 'none', fontWeight: 'bold' }}
                    >
                      View Report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
