'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/questboard', label: 'Questboard', icon: '📜' },
    { href: '/guilds', label: 'Guilds', icon: '🏰' },
    { href: '/leaderboard', label: 'Heroes', icon: '🏆' },
  ];

  return (
    <nav className="bg-gray-900 border-b border-amber-500/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">⚔️</span>
            <span className="text-xl font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
              Tryhardly
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-gray-300 hover:text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/post-quest"
                  className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-4 py-1.5 rounded-md text-sm transition-colors"
                >
                  + Post Quest
                </Link>
                <div className="relative group">
                  <button className="flex items-center gap-2 text-gray-300 hover:text-white">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm">{user.username}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link href={`/profile/${user.username}`} className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700">🧙 My Profile</Link>
                    <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700">📊 Dashboard</Link>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700">🚪 Sign Out</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">Sign In</Link>
                <Link href="/auth/register" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-4 py-1.5 rounded-md text-sm transition-colors">Join the Guild</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-400 hover:text-white p-2">
            <span className="text-xl">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-3 space-y-2">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-300 hover:text-amber-400 hover:bg-amber-500/10 text-sm font-medium">
              {link.icon} {link.label}
            </Link>
          ))}
          <hr className="border-gray-800 my-2" />
          {user ? (
            <>
              <Link href="/post-quest" className="block px-3 py-2 text-amber-400 font-medium text-sm">+ Post Quest</Link>
              <Link href={`/profile/${user.username}`} className="block px-3 py-2 text-gray-300 text-sm">My Profile</Link>
              <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-red-400 text-sm">Sign Out</button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="block px-3 py-2 text-gray-300 text-sm">Sign In</Link>
              <Link href="/auth/register" className="block px-3 py-2 text-amber-400 font-bold text-sm">Join the Guild</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
