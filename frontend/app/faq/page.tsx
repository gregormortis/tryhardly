'use client';

import { useState } from 'react';

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is Tryhardly?',
        a: 'Tryhardly is a local freelance marketplace where every project is a job, freelancers are workers, and clients are customers. We keep it simple and professional while still making good work feel rewarding.'
      },
      {
        q: 'How do I create an account?',
        a: 'Click "Sign Up" in the navigation, choose whether you want to work (freelancer) or hire (customer), and fill in your details. You can start browsing jobs immediately!'
      },
      {
        q: 'Is Tryhardly free to join?',
        a: 'Yes. Creating an account is free. Posting and bidding are free too, and workers keep the full amount they agree on with the customer.'
      }
    ]
  },
  {
    category: 'For Workers',
    questions: [
      {
        q: 'How does the marketplace fee work?',
        a: 'There is no marketplace fee. Workers keep 100% of the amount they agree on with the customer. Posting, bidding, and using TryHardly are free right now.'
      },
      {
        q: 'Does my reputation change what I keep?',
        a: 'No. You keep 100% at every level. A strong reputation earns more trust, visibility, and access, such as skill badges and team leadership.'
      },
      {
        q: 'How does my reputation grow on Tryhardly?',
        a: 'Complete jobs well to build your reputation. It reflects cash earned, rating quality, on-time and consistent completion, verified credentials, and contribution to your crew. A stronger reputation (Novice → Apprentice → Journeyman → Expert → Legendary) unlocks more trust and visibility. See the Reputation & Progress page for the full requirements.'
      },
      {
        q: 'What are guilds?',
        a: 'Guilds are worker-led teams on TryHardly — a way for local workers to team up. They help reliable workers build skills, share standards, mentor newer members, and earn trust through completed local jobs. Join an existing team or start your own, then take on larger jobs together.'
      },
      {
        q: 'How do I get paid?',
        a: 'The customer pays you directly. Agree on the amount, method, and timing before you start. Cash, Venmo, Zelle, and check all work if you both agree. You keep all of it; TryHardly does not take a cut.'
      }
    ]
  },
  {
    category: 'For Customers',
    questions: [
      {
        q: 'How do I post a job?',
        a: 'Click "Post a Job" in the navigation, describe your project needs, set a budget and timeline, and publish. Workers will start applying immediately!'
      },
      {
        q: 'How much does it cost to post?',
        a: 'Posting jobs is free! You only pay the agreed amount to the worker who completes your job. No hidden fees or subscription costs.'
      },
      {
        q: 'What if I\'m not satisfied with the work?',
        a: 'Talk with the worker first and be clear about what needs to be finished. TryHardly keeps the job record and ratings, but payment is between you and the worker. We cannot refund, reverse, or mediate the payment.'
      },
      {
        q: 'Can I hire the same worker again?',
        a: 'Absolutely! You can save favorite workers and send them direct job invites for future projects. Building long-term partnerships is encouraged.'
      }
    ]
  },
  {
    category: 'Direct payment',
    questions: [
      {
        q: 'Does TryHardly process or protect the payment?',
        a: 'No. You and the worker settle payment directly. Agree on the amount, payment method, and timing before work starts. TryHardly keeps the job record and both sides’ ratings, but cannot refund, reverse, or guarantee the payment.'
      },
      {
        q: 'What payment methods can we use?',
        a: 'That is up to you and the worker. Many neighbors use cash, Venmo, Zelle, or check. Agree on the method before the job starts.'
      },
      {
        q: 'Are there any refunds?',
        a: 'No. Because payment happens directly between the customer and worker, TryHardly cannot refund or reverse it. Agree on the payment plan before work begins.'
      }
    ]
  },
  {
    category: 'Features',
    questions: [
      {
        q: 'What are achievements and skill badges?',
        a: 'Achievements are milestone badges (e.g. completing your first job or reaching a major reputation milestone). Skill badges are different: clients rate each skill you performed on a job (mowing, fencing, hauling, etc.), and you earn Bronze, Silver, Gold, or Platinum tiers per skill once you have enough high ratings. Both display on your profile to show proven expertise.'
      },
      {
        q: 'Can I see my job history?',
        a: 'Yes! Your profile includes a complete job history showing all completed, active, and cancelled jobs. This serves as your portfolio and proof of experience.'
      },
      {
        q: 'What\'s the leaderboard?',
        a: 'The leaderboard ranks workers by completed jobs and earnings. Top performers get featured placement and bonus opportunities.'
      }
    ]
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-canvas py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-strong">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-body">
            Everything you need to know about using Tryhardly
          </p>
        </div>

        {/* Always-visible direct-payment summary so the key money flow is readable
            without expanding the accordion (and in static fetches/SEO). */}
        <div className="mb-12 bg-gradient-to-br from-accent/10 to-warning/5 border border-accent/30 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-accent-text mb-4">How direct payment works</h2>
          <ul className="space-y-3 text-body">
            <li className="flex gap-3">
              <span className="text-accent-text mt-1">•</span>
              <span>
                <strong>Agree before work starts.</strong> The customer and worker agree on the amount,
                payment method, and timing directly.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent-text mt-1">•</span>
              <span>
                <strong>Settle directly.</strong> Use cash, Venmo, Zelle, check, or another method you
                both prefer.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent-text mt-1">•</span>
              <span>
                <strong>Workers keep 100%.</strong> TryHardly does not process the payment or take a
                marketplace fee.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent-text mt-1">•</span>
              <span>
                <strong>Know the limit.</strong> TryHardly keeps the job record and ratings, but cannot
                refund, reverse, or guarantee a direct payment.
              </span>
            </li>
          </ul>
        </div>

        <div className="space-y-12">
          {faqs.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              <h2 className="text-3xl font-bold text-accent-text mb-6">{section.category}</h2>
              <div className="space-y-4">
                {section.questions.map((faq, faqIdx) => {
                  const key = `${sectionIdx}-${faqIdx}`;
                  const isOpen = openIndex === key;
                  
                  return (
                    <div
                      key={key}
                      className="bg-surface border border-line rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : key)}
                        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-raised transition-colors"
                      >
                        <span className="font-semibold text-strong">{faq.q}</span>
                        <span className="text-accent-text text-2xl">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <div className="px-6 py-4 border-t border-line text-body">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-accent/20/20 to-info/20 border border-accent/50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-accent-text mb-4">Still have questions?</h3>
          <p className="text-body mb-6">
            Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
          </p>
          <a
            href="/contact"
            className="inline-block bg-accent hover:bg-accent text-on-accent font-bold px-8 py-3 rounded-lg transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
