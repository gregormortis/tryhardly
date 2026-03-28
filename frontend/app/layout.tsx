import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '../components/Navbar';
import { AuthProvider } from '../lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Tryhardly - Guild-Inspired Quest Marketplace',
  description: 'Transform your work into epic adventures. Post quests, join guilds, level up as an adventurer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen antialiased`}>        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-16">
            <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
              <p className="text-amber-400 font-semibold mb-1">⚔ Tryhardly</p>
              <p>Guild-Inspired Quest Marketplace &copy; {new Date().getFullYear()}</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
