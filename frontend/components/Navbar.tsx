'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/');
  };

  const navLinks = [
    { href: '/questboard', label: 'Questboard', icon: 'scroll' },
    { href: '/guilds', label: 'Guilds', icon: 'castle' },
  ];

  return (
    <nav className="bg-gray-900 border-b border-amber-500/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black text-amber-400 tracking-tight">TRY<span className="text-white">HARDLY</span></span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth section */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/post-quest"
                  className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  + Post Quest
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white transition-colors"
                  >
                    <div className="w-6 h-6 bg-amber-500/20 border border-amber-500/50 rounded-full flex items-center justify-center text-amber-400 text-xs font-bold">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-gray-300">{user.username}</span>
                    <span className="text-gray-500 text-xs">{userMenuOpen ? '▲' : '▼'}</span>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        My Profile
                      </Link>
                      <Link
                        href="/post-quest"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        Post a Quest
                      </Link>
                      <div className="border-t border-gray-800">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Join Guild
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg"
          >
            <div className="w-6 h-0.5 bg-current mb-1.5 transition-all"></div>
            <div className="w-6 h-0.5 bg-current mb-1.5 transition-all"></div>
            <div className="w-6 h-0.5 bg-current transition-all"></div>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-800 mt-2">
              {user ? (
                <>
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
                    My Profile
                  </Link>
                  <Link href="/post-quest" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm text-amber-400 hover:bg-gray-800 rounded-lg">
                    Post a Quest
                  </Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 rounded-lg">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
                    Sign In
                  </Link>
                  <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm text-amber-400 hover:bg-gray-800 rounded-lg">
                    Join Guild
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
