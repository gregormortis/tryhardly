'use client';

import { useState } from 'react';

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is Tryhardly?',
        a: 'Tryhardly is a gamified freelance marketplace where every project is a quest, freelancers are adventurers, and clients are quest givers. We combine RPG mechanics with professional work to make freelancing more engaging and rewarding.'
      },
      {
        q: 'How do I create an account?',
        a: 'Click "Sign Up" in the navigation, choose whether you want to be an adventurer (freelancer) or quest giver (client), and fill in your details. You can start browsing quests immediately!'
      },
      {
        q: 'Is Tryhardly free to join?',
        a: 'Yes! Creating an account is completely free. We only charge commission when you complete quests as an adventurer.'
      }
    ]
  },
  {
    category: 'For Adventurers (Freelancers)',
    questions: [
      {
        q: 'How does the marketplace fee work?',
        a: 'Workers pay a flat 12% marketplace fee on completed paid jobs — the same rate at every rank. There are no tiers, no listing fees, and no subscriptions. You only pay when you get paid.'
      },
      {
        q: 'Do higher ranks pay a lower fee?',
        a: 'No. The fee is a flat 12% whether you are Novice or Legendary. Ranks reward trust, visibility, and access — like skill badges and guild leadership — not a cheaper cut.'
      },
      {
        q: 'How do I level up and rank up?',
        a: 'Complete quests well to earn XP. XP balances cash earned, rating quality, on-time and consistent completion, verified credentials, and guild contribution. Higher ranks (Novice → Apprentice → Journeyman → Expert → Legendary) unlock trust and visibility. See the Ranks & Progression page for the full requirements.'
      },
      {
        q: 'What are guilds?',
        a: 'Guilds are groups of adventurers who work together. Join an existing guild or create your own. Guild members can collaborate on large quests, share knowledge, and build their reputation together.'
      },
      {
        q: 'How do I get paid?',
        a: 'Marketplace payments are processed through Stripe. When a customer books, their payment method is authorized — this is not a final charge. Once the task is completed, that authorization is captured under platform rules, and your payout is initiated through Stripe Connect after the completed-task payment capture. You can then transfer it to your bank account or PayPal.'
      }
    ]
  },
  {
    category: 'For Quest Givers (Clients)',
    questions: [
      {
        q: 'How do I post a quest?',
        a: 'Click "Post Quest" in the navigation, describe your project needs, set a budget and timeline, and publish. Adventurers will start applying immediately!'
      },
      {
        q: 'How much does it cost to post?',
        a: 'Posting quests is free! You only pay the agreed amount to the adventurer who completes your quest. No hidden fees or subscription costs.'
      },
      {
        q: 'What if I\'m not satisfied with the work?',
        a: 'We have a resolution process. If the work doesn\'t meet the quest requirements, you can request revisions or open a dispute. Our team will mediate to ensure fair outcomes.'
      },
      {
        q: 'Can I hire the same adventurer again?',
        a: 'Absolutely! You can save favorite adventurers and send them direct quest invites for future projects. Building long-term partnerships is encouraged.'
      }
    ]
  },
  {
    category: 'Payment & Security',
    questions: [
      {
        q: 'Is my payment secure?',
        a: 'Yes! Marketplace payments are processed through Stripe. Your payment method is authorized at booking, the charge is captured for completed work under platform rules, and worker payouts are made through Stripe Connect after completed-task payment capture. If a quest is cancelled before capture, the authorization is voided and no final charge is created.'
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept credit cards, debit cards, PayPal, and bank transfers. Payouts can be sent via PayPal or direct deposit.'
      },
      {
        q: 'Are there any refunds?',
        a: 'If a quest is cancelled before work begins, full refunds are issued. For completed work, refunds are handled through our dispute resolution process based on whether requirements were met.'
      }
    ]
  },
  {
    category: 'Features & Gameplay',
    questions: [
      {
        q: 'What are achievements and skill badges?',
        a: 'Achievements are milestone badges (e.g. completing your first quest or reaching level 50). Skill badges are different: clients rate each skill you performed on a job (mowing, fencing, hauling, etc.), and you earn Bronze, Silver, Gold, or Platinum tiers per skill once you have enough high ratings. Both display on your profile to show proven expertise.'
      },
      {
        q: 'Can I see quest history?',
        a: 'Yes! Your profile includes a complete quest log showing all completed, active, and failed quests. This serves as your portfolio and proof of experience.'
      },
      {
        q: 'What\'s the leaderboard?',
        a: 'The leaderboard ranks adventurers by XP, quests completed, and earnings. Top performers get featured placement and bonus opportunities.'
      }
    ]
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-950 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-300">
            Everything you need to know about your Tryhardly adventure
          </p>
        </div>

        {/* Always-visible payments summary so the key money flow is readable
            without expanding the accordion (and in static fetches/SEO). */}
        <div className="mb-12 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-amber-400 mb-4">Payments and payouts</h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>
                <strong>Authorized at booking.</strong> When a customer books a quest, their payment
                method is authorized through Stripe. This is not a final charge.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>
                <strong>Captured for completed work.</strong> The charge is captured only after the
                task is completed, under platform rules.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>
                <strong>Worker payout follows capture.</strong> Worker payouts are initiated through
                Stripe Connect after the completed-task payment capture.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>
                <strong>Cancel before capture, no charge.</strong> If a quest is cancelled before the
                charge is captured, the authorization is voided and no final charge is created.
              </span>
            </li>
          </ul>
        </div>

        <div className="space-y-12">
          {faqs.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              <h2 className="text-3xl font-bold text-amber-400 mb-6">{section.category}</h2>
              <div className="space-y-4">
                {section.questions.map((faq, faqIdx) => {
                  const key = `${sectionIdx}-${faqIdx}`;
                  const isOpen = openIndex === key;
                  
                  return (
                    <div
                      key={key}
                      className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : key)}
                        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-800/50 transition-colors"
                      >
                        <span className="font-semibold text-gray-100">{faq.q}</span>
                        <span className="text-amber-400 text-2xl">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <div className="px-6 py-4 border-t border-gray-800 text-gray-300">
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

        <div className="mt-16 bg-gradient-to-r from-amber-900/20 to-purple-900/20 border border-amber-500/50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-amber-400 mb-4">Still have questions?</h3>
          <p className="text-gray-300 mb-6">
            Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
          </p>
          <a
            href="/contact"
            className="inline-block bg-amber-600 hover:bg-amber-700 text-black font-bold px-8 py-3 rounded-lg transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
