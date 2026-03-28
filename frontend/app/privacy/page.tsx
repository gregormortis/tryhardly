export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        <div className="text-gray-300 space-y-6">
          <p className="text-sm text-gray-400">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">1. Information We Collect</h2>
            <p className="mb-2">
              We collect information you provide directly to us when you create an account, post or accept quests, and use our services:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Account information (name, email, password)</li>
              <li>Profile information (skills, portfolio, bio)</li>
              <li>Payment information (processed securely through third-party providers)</li>
              <li>Quest and project information</li>
              <li>Communications and messages</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">2. How We Use Your Information</h2>
            <p className="mb-2">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze usage patterns</li>
              <li>Detect and prevent fraud and abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">3. Information Sharing</h2>
            <p className="mb-2">
              We share your information only in these circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>With other users as necessary to facilitate quests</li>
              <li>With service providers who help us operate the platform</li>
              <li>When required by law or to protect rights and safety</li>
              <li>In connection with a merger or acquisition</li>
            </ul>
            <p className="mt-4">
              We never sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">5. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access and update your personal information</li>
              <li>Request deletion of your account</li>
              <li>Opt out of marketing communications</li>
              <li>Export your data</li>
              <li>Object to certain processing of your information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">6. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse cookies or alert you when cookies are being sent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">7. Children's Privacy</h2>
            <p>
              Our service is not intended for users under the age of 18. We do not knowingly collect information from children under 18. If you believe we have collected information from a child, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">8. International Users</h2>
            <p>
              Your information may be transferred to and maintained on servers located outside of your country. By using Tryhardly, you consent to this transfer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">9. Changes to This Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-400 mb-4">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2">Email: privacy@tryhardly.com</p>
          </section>
        </div>
      </div>
    </div>
  );
}
