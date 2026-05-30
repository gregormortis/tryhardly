"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../lib/auth";
import NotificationBell from "./NotificationBell";

const navLinks = [
  { href: "/questboard", label: "Browse jobs" },
  { href: "/post-quest", label: "Post a job" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Try<span className="text-amber-400">hardly</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-amber-400"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {!loading && user && <NotificationBell />}
            {!loading &&
              (user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 transition-colors hover:bg-zinc-800"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-zinc-950">
                      {user.username[0].toUpperCase()}
                    </div>
                    <span className="hidden text-sm font-medium sm:block">
                      {user.username}
                    </span>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl">
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      >
                        Profile
                      </Link>
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      >
                        Dashboard
                      </Link>
                      {user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-amber-400 hover:bg-zinc-800"
                        >
                          Admin
                        </Link>
                      )}
                      <hr className="my-1 border-zinc-800" />
                      <button
                        onClick={handleLogout}
                        className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth/login"
                    className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
                  >
                    Sign up
                  </Link>
                </div>
              ))}

            <button
              className="text-zinc-400 hover:text-zinc-100 md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    menuOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 6h16M4 12h16M4 18h16"
                  }
                />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="space-y-1 border-t border-zinc-800 py-3 md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded px-2 py-2 text-sm transition-colors ${
                  pathname === link.href
                    ? "bg-zinc-900 text-amber-400"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
