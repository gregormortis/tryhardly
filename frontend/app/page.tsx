import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Briefcase,
  Check,
  Clock,
  Hammer,
  Home,
  MapPin,
  Shield,
  Sparkles,
  Star,
  Truck,
  Users,
  Wrench,
  X,
} from "lucide-react";

const stats = [
  { value: "$2.4M+", label: "Paid to local workers" },
  { value: "12,400+", label: "Jobs completed" },
  { value: "4.9", label: "Average rating" },
  { value: "180+", label: "Cities active" },
];

const categories = [
  { name: "Lawn & yard", icon: Home, jobs: "840 open" },
  { name: "Moving help", icon: Truck, jobs: "320 open" },
  { name: "Handyman", icon: Wrench, jobs: "1,120 open" },
  { name: "Cleaning", icon: Sparkles, jobs: "670 open" },
  { name: "Delivery & errands", icon: MapPin, jobs: "410 open" },
  { name: "Assembly & install", icon: Hammer, jobs: "290 open" },
];

const sampleJobs = [
  {
    title: "Furniture assembly — IKEA bedroom set",
    pay: "$85",
    location: "Austin, TX",
    time: "Posted 2h ago",
    tag: "Handyman",
  },
  {
    title: "Same-day yard cleanup before showing",
    pay: "$120",
    location: "Denver, CO",
    time: "Posted 45m ago",
    tag: "Lawn & yard",
  },
  {
    title: "Load & unload moving truck (2 helpers)",
    pay: "$200",
    location: "Chicago, IL",
    time: "Posted 1h ago",
    tag: "Moving",
  },
];

const workers = [
  {
    name: "Marcus T.",
    trade: "Handyman ┬╖ 6 yrs",
    rating: 4.9,
    jobs: 214,
    badge: "Top rated",
  },
  {
    name: "Elena R.",
    trade: "Cleaning ┬╖ 4 yrs",
    rating: 5.0,
    jobs: 189,
    badge: "Verified",
  },
  {
    name: "James K.",
    trade: "Moving ┬╖ 8 yrs",
    rating: 4.8,
    jobs: 312,
    badge: "Pro mover",
  },
];

const trustSignals = [
  {
    icon: Shield,
    title: "Background checks",
    desc: "Workers can verify identity before taking paid jobs.",
  },
  {
    icon: Banknote,
    title: "Secure payments",
    desc: "Funds held until the job is marked complete.",
  },
  {
    icon: BadgeCheck,
    title: "Real reviews",
    desc: "Ratings only from homeowners who hired and paid.",
  },
  {
    icon: Users,
    title: "Local support",
    desc: "Dispute help from people, not chatbots.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-950 to-zinc-950" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-400">
            <MapPin className="h-4 w-4" />
            Local gigs ┬╖ Real people ┬╖ Cash in hand
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            The marketplace{" "}
            <span className="text-amber-400">AI can&apos;t touch.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl">
            Real work. Real money. Real local. Post a job in your neighborhood
            or pick up paid work nearby — no bots, no fantasy fluff, just
            tasks that need a human on site.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3.5 text-base font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              Post a job
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3.5 text-base font-semibold text-zinc-100 transition hover:border-amber-500/50 hover:bg-zinc-800"
            >
              Find work near me
              <Briefcase className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Proof bar */}
      <section className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center sm:text-left">
              <p className="text-2xl font-bold text-amber-400 sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI vs human */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Some jobs need a person in the room
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            AI can draft an email. It can&apos;t haul a couch up three flights,
            fix a leaky faucet, or mow your lawn before the open house.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-500">
              <X className="h-5 w-5 text-red-400/80" />
              What AI handles
            </h3>
            <ul className="mt-6 space-y-3 text-zinc-500">
              <li className="flex gap-3">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                Summaries, scheduling suggestions, price estimates
              </li>
              <li className="flex gap-3">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                Remote tasks with no physical outcome
              </li>
              <li className="flex gap-3">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                Anything that never leaves a screen
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-400">
              <Check className="h-5 w-5" />
              What Tryhardly is for
            </h3>
            <ul className="mt-6 space-y-3 text-zinc-300">
              <li className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                On-site labor — homes, yards, storefronts
              </li>
              <li className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                Skilled and unskilled work with clear pay
              </li>
              <li className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                Neighbors hiring neighbors, paid when it&apos;s done
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Job categories */}
      <section className="border-y border-zinc-800 bg-zinc-900/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Browse by category
          </h2>
          <p className="mt-2 text-zinc-400">
            From quick errands to full-day projects — all local, all human.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(({ name, icon: Icon, jobs }) => (
              <Link
                key={name}
                href="/auth/register"
                className="group flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-amber-500/40 hover:bg-zinc-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 transition group-hover:bg-amber-500/20">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-sm text-zinc-500">{jobs}</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-zinc-600 transition group-hover:text-amber-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          How it works
        </h2>
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 p-8">
            <p className="text-sm font-medium uppercase tracking-wider text-amber-400">
              For homeowners
            </p>
            <ol className="mt-6 space-y-6">
              {[
                "Describe the job, set your budget, and pick a time window.",
                "Review applicants with ratings, photos, and past work.",
                "Pay through the platform when you're satisfied.",
              ].map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-400">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-zinc-300">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-zinc-800 p-8">
            <p className="text-sm font-medium uppercase tracking-wider text-amber-400">
              For workers
            </p>
            <ol className="mt-6 space-y-6">
              {[
                "Create a profile with skills, tools, and your service area.",
                "Browse open jobs on a map or list — apply in one tap.",
                "Get paid fast after the homeowner confirms completion.",
              ].map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-400">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-zinc-300">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Sample jobs */}
      <section className="border-t border-zinc-800 bg-zinc-900/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Jobs near you
              </h2>
              <p className="mt-2 text-zinc-400">
                Sample listings from active markets.
              </p>
            </div>
            <Link
              href="/auth/register"
              className="text-sm font-medium text-amber-400 hover:text-amber-300"
            >
              View all jobs ΓåÆ
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {sampleJobs.map((job) => (
              <article
                key={job.title}
                className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <span className="w-fit rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400">
                  {job.tag}
                </span>
                <h3 className="mt-4 font-semibold leading-snug">
                  {job.title}
                </h3>
                <p className="mt-4 text-2xl font-bold text-amber-400">
                  {job.pay}
                </p>
                <div className="mt-auto space-y-2 pt-6 text-sm text-zinc-500">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {job.time}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Worker profiles */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold tracking-tight">
          Meet local workers
        </h2>
        <p className="mt-2 text-zinc-400">
          Real profiles. Real history. Hire with confidence.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {workers.map((worker) => (
            <div
              key={worker.name}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-zinc-700 text-lg font-bold text-amber-200">
                {worker.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <h3 className="mt-4 font-semibold">{worker.name}</h3>
              <p className="text-sm text-zinc-500">{worker.trade}</p>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="h-4 w-4 fill-amber-400" />
                  {worker.rating}
                </span>
                <span className="text-zinc-500">{worker.jobs} jobs</span>
              </div>
              <span className="mt-4 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                {worker.badge}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-y border-zinc-800 bg-zinc-900/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Built for trust on both sides
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trustSignals.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center sm:text-left"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 sm:mx-0">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to get something done?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-zinc-400">
          Join thousands of homeowners and workers trading real labor for real
          pay — in your city, this week.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-8 py-3.5 font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            Post a job — it&apos;s free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-8 py-3.5 font-semibold transition hover:border-amber-500/50 hover:bg-zinc-900"
          >
            Start earning today
          </Link>
        </div>
      </section>
    </div>
  );
}
