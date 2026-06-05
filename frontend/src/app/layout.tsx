import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Head from 'next/head'
import { AuthInitializer } from '@/components/AuthInitializer'

export const metadata: Metadata = {
  title: 'FiredIn — The Next Door for Experienced Talent',
  description: 'Stop mass-applying like a fresher. Get verified once, stand out everywhere. Built for laid-off professionals and those wanting to switch jobs.',
  keywords: 'job search, laid off, career switch, AI interview, verified candidate, experienced professionals',
  openGraph: {
    title: "FiredIn — If You're Fired, Get Ready to Be Hired",
    description: 'The next door for experienced professionals. Get verified, stand out, get hired.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthInitializer>
          {children}
        </AuthInitializer>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Satoshi, sans-serif',
              fontSize: '0.875rem',
              fontWeight: '500',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            },
            success: {
              style: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
              iconTheme: { primary: '#16a34a', secondary: '#f0fdf4' },
            },
            error: {
              style: { background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' },
              iconTheme: { primary: '#e11d48', secondary: '#fff1f2' },
            },
          }}
        />
      </body>
    </html>
  )
}
