'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  
  // Extract executionId from paths like /run/[executionId], /reports/[executionId], /scripts/[executionId]
  const pathParts = pathname.split('/');
  let executionId = '';
  
  if (pathParts.length >= 3 && ['run', 'reports', 'scripts'].includes(pathParts[1])) {
    executionId = pathParts[2];
  }

  const linkStyle = (pathPrefix: string) => {
    const isActive = pathname.startsWith(pathPrefix);
    return {
      padding: '8px 16px',
      borderRadius: '4px',
      textDecoration: 'none',
      fontWeight: 'bold',
      fontSize: '14px',
      backgroundColor: isActive ? '#0070f3' : 'transparent',
      color: isActive ? '#fff' : '#4b5563',
      transition: 'all 0.2s ease',
    };
  };

  return (
    <header style={{ borderBottom: '1px solid #eaeaea', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>⚡</span>
        <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#1f2937' }}>PoC Platform</span>
      </div>

      <nav style={{ display: 'flex', gap: '10px' }}>
        <Link href="/" style={{
          padding: '8px 16px',
          borderRadius: '4px',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '14px',
          backgroundColor: pathname === '/' ? '#0070f3' : 'transparent',
          color: pathname === '/' ? '#fff' : '#4b5563',
          transition: 'all 0.2s ease',
        }}>
          New Test
        </Link>

        <Link href="/history" style={{
          padding: '8px 16px',
          borderRadius: '4px',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '14px',
          backgroundColor: pathname === '/history' ? '#0070f3' : 'transparent',
          color: pathname === '/history' ? '#fff' : '#4b5563',
          transition: 'all 0.2s ease',
        }}>
          History
        </Link>

        {executionId && (
          <>
            <Link href={`/run/${executionId}`} style={linkStyle('/run')}>
              Live Action
            </Link>
            <Link href={`/reports/${executionId}`} style={linkStyle('/reports')}>
              Report
            </Link>
            <Link href={`/scripts/${executionId}`} style={linkStyle('/scripts')}>
              Script
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};
