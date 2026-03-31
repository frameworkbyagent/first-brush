import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'First Brush',
  description: 'Семейное приложение для честной очереди вечерней чистки зубов.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
