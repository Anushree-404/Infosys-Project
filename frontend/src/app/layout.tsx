import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    template: '%s | IrriSmart - AI Irrigation System',
    default: 'IrriSmart - AI Irrigation Management System',
  },
  description:
    'AI-powered irrigation management for smart farming. Optimize water usage, manage fields and sensors, get weather insights.',
  keywords: ['irrigation', 'farming', 'AI', 'agriculture', 'water management', 'sensors'],
  authors: [{ name: 'IrriSmart Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#16a34a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
