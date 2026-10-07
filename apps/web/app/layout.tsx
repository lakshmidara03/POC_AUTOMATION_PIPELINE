import React from 'react';
import { RunProvider } from './context/RunContext';
import { Navigation } from './components/Navigation';

export const metadata = {
  title: 'AI Test Automation Platform - PoC',
  description: 'AI-Powered Transparent Test Automation Platform PoC',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#fafafa', fontFamily: 'sans-serif' }}>
        <RunProvider>
          <Navigation />
          <main style={{ paddingBottom: '60px' }}>
            {children}
          </main>
        </RunProvider>
      </body>
    </html>
  );
}
