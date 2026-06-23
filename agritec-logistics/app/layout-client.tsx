'use client'

import { ThemeProvider } from 'next-themes'
import React from 'react'
import { Toaster } from 'sonner'

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  )
}
