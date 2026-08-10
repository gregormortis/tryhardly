'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, MapPin, Shield, Star, Users, Wrench, Hammer, Check, Banknote } from 'lucide-react';

const stats = [
  { value: 'Free', label: 'To post a job' },
  { value: '100%', label: 'Workers keep their pay' },
  { value: 'No fee', label: 'We take no cut' },
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
  { title: 'Pay them directly', desc: 'Settle up with your worker however you both prefer once the job is done. TryHardly takes no cut of it.' },
];

const trustSignals = [
  { icon: Shield, title: 'No Cut Of Your Pay', desc: 'You pay your worker directly and they keep every dollar. TryHardly takes no commission and charges no fees.' },
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
    <div className="min-h-screen bg-canvas text-strong">

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent-text mb-5">
          <MapPin className="h-3 w-3" /> Local jobs. Real people. Real work.
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-5">
          Real local people<br />for hands-on work
        </h1>
        <p className="mx-auto max-w-2xl text-base sm:text-lg text-body mb-3">
          From licensed contractors to a 16-year-old with a mower, TryHardly connects neighbors
          with local people who do the work. Each profile builds a real record of completed jobs,
          ratings, and reliability.
        </p>
        <p className="mx-auto max-w-xl text-sm text-subtle mb-8">
          Free to post. Free to work. You pay your worker directly.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-xl mx-auto mb-6">
          <Link
            href="/post-a-job"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-on-accent hover:bg-accent transition-colors"
          >
            Post a job free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-6 py-3 text-sm font-bold text-strong hover:border-accent/50 hover:bg-surface transition-colors"
          >
            Find local work
          </Link>
        </div>
        <form onSubmit={handleSearch} className="max-w-md mx-auto">
          <label htmlFor="zip" className="block text-xs text-muted mb-2">
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
              className="flex-1 w-full rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm text-strong placeholder-subtle focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-5 py-2.5 text-sm font-semibold text-body hover:border-accent/50 hover:bg-surface transition-colors"
            >
              Browse local jobs <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        <Link
          href="/for-young-workers"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text hover:text-accent-text-hover transition-colors"
        >
          Are you 16 or 17? See how young workers can get started with a parent
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Stats */}
      <section className="border-y border-line bg-surface py-12">
        <div className="mx-auto max-w-4xl px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-bold text-accent-text">{value}</p>
              <p className="mt-1 text-sm text-muted">{label}</p>
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
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent-text text-lg font-bold">
                {i + 1}
              </div>
              <h3 className="font-semibold text-strong mb-2">{title}</h3>
              <p className="text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">Browse by category</h2>
        <p className="mx-auto max-w-xl text-sm text-muted mb-10 text-center">
          Post a request in any category today — local workers get alerts the moment your job goes live. More categories added weekly.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories.map(({ name, icon: Icon, jobs }) => (
            <Link
              key={name}
              href={`/post-a-job?category=${encodeURIComponent(name)}`}
              className="rounded-xl border border-line-strong bg-raised p-6 hover:border-accent/50 hover:bg-raised transition-all group"
            >
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent-text">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-strong text-center">{name}</h3>
              <p className="mt-1 text-xs font-medium text-accent-text text-center">{jobs}</p>
              <p className="mt-2 text-sm text-muted text-center group-hover:text-body transition-colors">Request this service →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How payments work */}
      <section className="border-t border-line bg-surface py-16">
        <div className="mx-auto max-w-4xl px-6">
        <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5 p-6 sm:p-10">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="h-5 w-5 text-accent-text" />
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">How paying works</h2>
          </div>
          <p className="text-sm text-body mb-6">
            TryHardly introduces you to local workers and keeps the record of how each job
            went. We are not the service provider, and we do not handle the money. You and
            your worker agree an amount here and settle it directly, which also means we
            take no cut of it.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-line-strong bg-surface p-4">
              <p className="text-sm font-semibold text-strong mb-1">Posting is free</p>
              <p className="text-xs text-muted">No posting fee, no booking fee, and no card on file. Describe the job and local workers respond.</p>
            </div>
            <div className="rounded-xl border border-line-strong bg-surface p-4">
              <p className="text-sm font-semibold text-strong mb-1">Workers keep 100%</p>
              <p className="text-xs text-muted">No marketplace fee comes out of a worker&apos;s pay, and there is no charge for leads that go nowhere.</p>
            </div>
            <div className="rounded-xl border border-line-strong bg-surface p-4">
              <p className="text-sm font-semibold text-strong mb-1">You settle directly</p>
              <p className="text-xs text-muted">Cash, Venmo, Zelle, or check — whatever suits you both. Agree the amount and method before work starts.</p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text hover:text-accent-text-hover transition-colors"
          >
            See how it works <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">Built on trust</h2>
        <p className="mx-auto max-w-2xl text-sm text-muted mb-10 text-center">
          TryHardly is early. We are focused on local neighborhood jobs and growing one city at a time, starting in{' '}
          <Link href="/redding" className="font-semibold text-accent-text hover:text-accent-text-hover transition-colors">Redding</Link>.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {trustSignals.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-line-strong bg-raised p-6 text-center sm:text-left">
              <div className="mx-auto sm:mx-0 mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent-text">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-strong mb-1">{title}</h3>
              <p className="text-xs text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Ready to get something done?</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted mb-10">
          Post the job you have been putting off, or start picking up paid work near you.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/post-a-job"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-8 py-3.5 font-semibold text-on-accent transition hover:bg-accent"
          >
            Post a job free <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong px-8 py-3.5 font-semibold transition hover:border-accent/50 hover:bg-surface"
          >
            Browse local work
          </Link>
        </div>
      </section>

    </div>
  );
}
