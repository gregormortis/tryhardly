'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, send to API
    console.log('Contact form:', formData);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-950 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Contact Us
          </h1>
          <p className="text-xl text-gray-300">
            Have questions? We're here to help adventurers succeed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-800">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Send us a message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="What's this about?"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Tell us more..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-black font-bold py-3 rounded-lg transition-colors"
              >
                Send Message
              </button>
              {submitted && (
                <div className="bg-green-900/50 border border-green-700 rounded-lg p-4 text-green-300">
                  Message sent! We'll get back to you soon.
                </div>
              )}
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <div className="text-3xl mb-4">📧</div>
              <h3 className="text-xl font-bold text-amber-400 mb-2">Email</h3>
              <p className="text-gray-300">support@tryhardly.com</p>
              <p className="text-sm text-gray-400 mt-2">We typically respond within 24 hours</p>
            </div>

            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <div className="text-3xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-amber-400 mb-2">Community</h3>
              <p className="text-gray-300">Join our Discord server</p>
              <p className="text-sm text-gray-400 mt-2">Connect with other adventurers</p>
            </div>

            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <div className="text-3xl mb-4">📍</div>
              <h3 className="text-xl font-bold text-amber-400 mb-2">Location</h3>
              <p className="text-gray-300">Remote-first company</p>
              <p className="text-sm text-gray-400 mt-2">Serving adventurers worldwide</p>
            </div>

            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <div className="text-3xl mb-4">❓</div>
              <h3 className="text-xl font-bold text-amber-400 mb-2">FAQs</h3>
              <p className="text-gray-300">Check our FAQ section</p>
              <a href="/about" className="text-amber-400 hover:text-amber-300 text-sm mt-2 inline-block">
                Learn more about Tryhardly →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
