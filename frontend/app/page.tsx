'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, MapPin, Shield, Star, Users, Wrench, Hammer, Check, Banknote } from 'lucide-react';

const stats = [
  { value: 'Free', label: 'To post a job' },
  { value: '12%', label: 'Flat worker fee' },
  { value: 'Stripe', label: 'Secure payouts' },
  { value: 'Local', label: 'Built for neighborhood work' },
];

const categories = [
  { name: 'Lawn & Yard', icon: Hammer, jobs: 'Accepting requests' },
  { name: 'Moving Help', icon: Briefcase, jobs: 'Accepting requests' },
  { name: 'Handyman', icon: Wrench, jobs: 'Accepting requests' },
  { name: 'Cleaning', icon: Star, jobs: 'Accepting requests' },
  { name: 'Delivery & Errands', icon: MapPin, jobs: 'Accepting requests' },
  { name: 'Assembly & Install', icon: Hammer, jobs: 'Accepting requests' },
];

const howItWorks = [
  { title: 'Post the job free', desc: 'Describe the work — yard cleanup, a move, a repair — set your budget, and post it live in minutes.' },
  { title: 'Local workers apply', desc: 'Compare who is interested, read their reviews and past jobs, and pick the one you want.' },
  { title: 'Pay when it is done', desc: 'Your card is authorized when you book. The charge is captured once the work is confirmed complete, and the worker is paid through Stripe.' },
];

const trustSignals = [
  { icon: Shield, title: 'Payments run on Stripe', desc: 'Cards are processed by Stripe and worker payouts go through Stripe Connect after the charge is captured.' },
  { icon: Star, title: 'Reviews tied to real jobs', desc: 'A review can only be left on a job that was actually completed through TryHardly.' },
  { icon: Users, title: 'Profiles grow with work', desc: 'Worker profiles build up from completed marketplace activity, so history is earned rather than claimed.' },
  { icon: Banknote, title: 'Price shown up front', desc: 'Every job lists its pay before anyone applies. Posting is free, and the flat 12% fee comes out of the worker payout.' },
  { icon: Check, title: 'One place to manage it', desc: 'Messages, applicants, and completion all live on the job itself.' },
  { icon: MapPin, title: 'Neighborhood scale', desc: 'Built for errands, yard work, moving help, and hands-on tasks close to home.' },
];

export default function HomePage() {
  const [location, setLocation] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = location.trim();
    window.location.href = q ? `/questboard?search=${encodeURIComponent(q)}` : '/questboard';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400 mb-5">
          <MapPin className="h-3 w-3" /> Real work. Real money. Real local.
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-5">
          Hire local help,<br />or get paid to do the work
        </h1>
        <p className="mx-auto max-w-2xl text-base sm:text-lg text-zinc-300 mb-3">
          TryHardly connects neighbors who need a hand with local workers who want the job — yard work,
          moving help, handyman tasks, cleaning, errands, and other hands-on work.
        </p>
        <p className="mx-auto max-w-xl text-sm text-zinc-500 mb-8">
          Post what you need in a few minutes, or browse paid jobs near you and apply today.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-xl mx-auto mb-4">
          <Link
            href="/post-quest"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition-colors"
          >
            Post a job free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/questboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-sm font-bold text-zinc-100 hover:border-amber-500/50 hover:bg-zinc-900 transition-colors"
          >
            Find local work
          </Link>
        </div>

        <p className="text-xs sm:text-sm text-zinc-400 mb-8">
          Free to post. 12% flat worker fee. Stripe-powered payments.
        </p>

        <form onSubmit={handleSearch} className="mx-auto max-w-md">
          <label htmlFor="home-location" className="block text-sm text-zinc-400 mb-2">
            Enter your city or ZIP to search the local job board
          </label>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <input
              id="home-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or ZIP"
              className="flex-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:border-amber-500/50 hover:bg-zinc-900 transition-colors"
            >
              Browse local jobs <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-800 bg-zinc-900/50 py-12">
        <div className="mx-auto max-w-4xl px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-bold text-amber-400">{value}</p>
              <p className="mt-1 text-sm text-zinc-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-zinc-900/50 border-b border-zinc-800 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-12 text-center">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {howItWorks.map(({ title, desc }, i) => (
              <div key={title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 text-lg font-bold">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-zinc-100 mb-2">{title}</h3>
                <p className="text-sm text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">Browse by category</h2>
        <p className="mx-auto max-w-xl text-sm text-zinc-400 mb-10 text-center">
          Pick what you need done and post it — your job goes live on the local board right away.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories.map(({ name, icon: Icon, jobs }) => (
            <Link
              key={name}
              href={`/post-quest?category=${encodeURIComponent(name)}`}
              className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 hover:border-amber-500/50 hover:bg-zinc-800 transition-all group"
            >
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-zinc-100 text-center">{name}</h3>
              <p className="mt-1 text-xs font-medium text-amber-400/80 text-center">{jobs}</p>
              <p className="mt-2 text-sm text-zinc-400 text-center group-hover:text-zinc-200 transition-colors">Request this service →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How payments work */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6 sm:p-10">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">How payments work</h2>
          </div>
          <p className="text-sm text-zinc-300 mb-6">
            TryHardly is a marketplace that connects people who need local help with workers who can do it. We are an
            intermediary — we are not the service provider. Payments are processed by{' '}
            <span className="font-semibold text-zinc-100">Stripe</span>, and worker payouts are handled through{' '}
            <span className="font-semibold text-zinc-100">Stripe Connect</span> after completed-task payment capture.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <p className="text-sm font-semibold text-zinc-100 mb-1">Posting is free</p>
              <p className="text-xs text-zinc-400">Customers never pay to post a job. Your payment method is authorized at booking, and the agreed charge is captured for completed work under platform rules.</p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <p className="text-sm font-semibold text-zinc-100 mb-1">12% worker fee</p>
              <p className="text-xs text-zinc-400">TryHardly takes a flat 12% platform service fee from worker payouts on completed paid jobs.</p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <p className="text-sm font-semibold text-zinc-100 mb-1">Paid after completion</p>
              <p className="text-xs text-zinc-400">Payouts are initiated through Stripe Connect after payment capture for completed tasks.</p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            See full pricing &amp; fees <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Trust signals */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">What you can count on</h2>
        <p className="mx-auto max-w-2xl text-sm text-zinc-400 mb-10 text-center">
          TryHardly is early and focused on local neighborhood jobs while we grow city by city, so the board
          is intentionally small right now. Here is exactly what is live today.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {trustSignals.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 text-center sm:text-left">
              <div className="mx-auto sm:mx-0 mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 mb-1">{title}</h3>
              <p className="text-xs text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Ready to get something done?</h2>
        <p className="mx-auto mt-4 max-w-xl text-zinc-400 mb-10">
          Post the job you have been putting off, or pick up paid work a few streets away.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/post-quest"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-8 py-3.5 font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            Post a job free <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/questboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-8 py-3.5 font-semibold transition hover:border-amber-500/50 hover:bg-zinc-900"
          >
            Browse local work
          </Link>
        </div>
      </section>

    </div>
  );
}
