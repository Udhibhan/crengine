import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Reflective Cognition Engine',
  description: 'A cognitive mirror that maps your beliefs, finds contradictions, and speaks back.',
  keywords: ['cognition', 'beliefs', 'philosophy', 'self-reflection', 'AI'],
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-void text-soft antialiased">
        <div className="scan-line" />
        {children}
      </body>
    </html>
  )
}
