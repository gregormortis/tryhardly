"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import NotificationBell from "./NotificationBell";

// Five links, all of them real pages. "How it works" used to point at an
// in-page anchor (/#how-it-works) while /how-it-works itself 404'd, and
// "Redding launch" read like internal project news to a visitor. Both fixed.
const navLinks = [
  { href: "/jobs", label: "Browse jobs" },
  { href: "/post-a-job", label: "Post a job" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/trust", label: "Trust & safety" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close the mobile menu on navigation. Without this the panel stays open
  // behind the new page when a link routes client-side.
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Lock body scroll and support Escape while the mobile menu is open, so the
  // page underneath cannot be scrolled or tapped through.
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-canvas backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Try<span className="text-accent-text">hardly</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-base font-semibold transition-colors ${
                  pathname === link.href
                    ? "text-accent-text"
                    : "text-body hover:text-accent-text"
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
                    className="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 transition-colors hover:bg-raised"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent">
                      {user.username[0].toUpperCase()}
                    </div>
                    <span className="hidden text-sm font-medium sm:block">
                      {user.username}
                    </span>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-lg border border-line bg-surface py-1 shadow-xl">
                      {/* Names the account in use — browsers share one session
                          across tabs, so posters and workers testing both sides
                          otherwise can't tell who they are signed in as. */}
                      <div className="px-4 py-2">
                        <p className="text-xs text-subtle">Signed in as</p>
                        <p className="truncate text-sm text-body">{user.email}</p>
                      </div>
                      <hr className="my-1 border-line" />
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-body hover:bg-raised"
                      >
                        Profile
                      </Link>
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-body hover:bg-raised"
                      >
                        Dashboard
                      </Link>
                      {user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-accent-text hover:bg-raised"
                        >
                          Admin
                        </Link>
                      )}
                      <hr className="my-1 border-line" />
                      <button
                        onClick={handleLogout}
                        className="block w-full px-4 py-2 text-left text-sm text-danger hover:bg-raised"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/auth/login"
                    className="hidden text-base font-semibold text-body transition-colors hover:text-accent-text sm:block"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="btn-primary px-5 py-2 text-sm min-h-[40px]"
                  >
                    Sign up
                  </Link>
                </div>
              ))}

            <button
              className="text-muted hover:text-strong md:hidden"
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
          <div
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 top-16 z-40 bg-strong/60 md:hidden"
          />
        )}

        {menuOpen && (
          <div className="relative z-50 space-y-1 border-t border-line bg-canvas py-3 md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-lg px-3 py-3 text-base font-semibold transition-colors ${
                  pathname === link.href
                    ? "bg-surface text-accent-text"
                    : "text-body hover:bg-surface"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!loading && !user && (
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-3 text-base font-semibold text-body hover:bg-surface"
              >
                Log in
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
