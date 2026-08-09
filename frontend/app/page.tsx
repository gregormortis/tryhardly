'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, MapPin, Shield, Star, Users, Wrench, Hammer, Check, Banknote } from 'lucide-react';

const stats = [
  { value: 'Free', label: 'To post a job' },
  { value: '12%', label: 'Flat worker fee' },
  { value: 'Stripe', label: 'Payments & payouts' },
  { value: 'Redding', label: 'First launch city' },
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
  { title: 'Post the job — free', desc: 'Describe the task, set your budget, and post it in minutes. Yard work, moving help, handyman jobs, cleaning, errands.' },
  { title: 'Pick a local worker', desc: 'Nearby workers apply. Compare their bids, ratings, and completed jobs before you choose.' },
  { title: 'Pay through Stripe', desc: 'The payment method is authorized when you book, and the agreed amount is captured once the job is done.' },
];

const trustSignals = [
  { icon: Shield, title: 'Stripe-Powered Payments', desc: 'Payments are processed by Stripe. Worker payouts run through Stripe Connect after the charge for a completed job is captured.' },
  { icon: Star, title: 'Reviews From Real Jobs', desc: 'Ratings and reviews come from jobs completed on TryHardly — not imported from anywhere else.' },
  { icon: Users, title: 'Profiles That Earn Their History', desc: 'A worker profile grows as they complete jobs, so their track record is built here in the open.' },
  { icon: Banknote, title: 'Clear Pay Up Front', desc: 'Every job lists its pay before anyone applies, so there is nothing to haggle over later.' },
  { icon: Check, title: 'One Place To Manage It', desc: 'Post the work, review applicants, message, and close it out in the same place.' },
  { icon: MapPin, title: 'Neighborhood Jobs Only', desc: 'Built for hands-on local work — errands, hauling, repairs, and help around the house.' },
];

export default function HomePage() {
  const [zip, setZip] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (zip.trim()) {
      window.location.href = `/jobs?zip=${zip.trim()}`;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400 mb-5">
          <MapPin className="h-3 w-3" /> Local jobs. Real neighbors. Real pay.
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-5">
          Hire local help,<br />or get paid to do the work
        </h1>
        <p className="mx-auto max-w-2xl text-base sm:text-lg text-zinc-300 mb-3">
          TryHardly connects neighbors who need a hand with people nearby who want paid work — yard work,
          moving help, handyman tasks, cleaning, and errands.
        </p>
        <p className="mx-auto max-w-xl text-sm text-zinc-500 mb-8">
          Free to post. 12% flat worker fee. Stripe-powered payments.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-xl mx-auto mb-6">
          <Link
            href="/post-a-job"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition-colors"
          >
            Post a job free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-sm font-bold text-zinc-100 hover:border-amber-500/50 hover:bg-zinc-900 transition-colors"
          >
            Find local work
          </Link>
        </div>

        <form onSubmit={handleSearch} className="max-w-md mx-auto">
          <label htmlFor="zip" className="block text-xs text-zinc-400 mb-2">
            Enter your ZIP to open the local job board — every job lists its neighborhood and city.
          </label>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <input
              id="zip"
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="ZIP code"
              maxLength={5}
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
      <section id="how-it-works" className="mx-auto max-w-4xl px-6 py-20">
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
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">Browse by category</h2>
        <p className="mx-auto max-w-xl text-sm text-zinc-400 mb-10 text-center">
          Post a request in any category today — local workers get alerts the moment your job goes live. More categories added weekly.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories.map(({ name, icon: Icon, jobs }) => (
            <Link
              key={name}
              href={`/post-a-job?category=${encodeURIComponent(name)}`}
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
      <section className="border-t border-zinc-800 bg-zinc-900/50 py-16">
        <div className="mx-auto max-w-4xl px-6">
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
        </div>
      </section>

      {/* Trust signals */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">Built on trust</h2>
        <p className="mx-auto max-w-2xl text-sm text-zinc-400 mb-10 text-center">
          TryHardly is early. We are focused on local neighborhood jobs and growing one city at a time, starting in{' '}
          <Link href="/redding" className="font-semibold text-amber-400 hover:text-amber-300 transition-colors">Redding</Link>.
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
          Post the job you have been putting off, or start picking up paid work near you.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/post-a-job"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-8 py-3.5 font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            Post a job free <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-8 py-3.5 font-semibold transition hover:border-amber-500/50 hover:bg-zinc-900"
          >
            Browse local work
          </Link>
        </div>
      </section>

    </div>
  );
}
