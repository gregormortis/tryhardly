export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Terms of Service
        </h1>
        <div className="text-gray-300 space-y-6">
          <p className="text-sm text-gray-400">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Tryhardly, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">2. Use License</h2>
            <p>
              Permission is granted to temporarily download one copy of the materials on Tryhardly for personal, non-commercial transitory viewing only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">3. Quest Marketplace</h2>
            <p className="mb-2">
              Tryhardly operates as a marketplace connecting quest posters (clients) with adventurers (freelancers). We facilitate but do not employ freelancers.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Quest posters are responsible for accurate quest descriptions</li>
              <li>Adventurers must deliver work as specified in quest requirements</li>
              <li>Payment is held in escrow until quest completion</li>
              <li>Disputes are handled through our resolution process</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">4. Commission Fees</h2>
            <p>
              Tryhardly charges commission fees based on your adventurer level:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
              <li>Novice (Level 1-20): 15%</li>
              <li>Journeyman (Level 21-75): 10%</li>
              <li>Legendary (Level 76+): 5%</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">5. User Conduct</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Post fraudulent or misleading quests</li>
              <li>Harass or threaten other users</li>
              <li>Attempt to circumvent our payment system</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">6. Intellectual Property</h2>
            <p>
              Work products created through Tryhardly belong to the quest poster upon full payment, unless otherwise specified in the quest agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">7. Limitation of Liability</h2>
            <p>
              Tryhardly shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">9. Contact</h2>
            <p>
              For questions about these Terms of Service, please contact us at legal@tryhardly.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
