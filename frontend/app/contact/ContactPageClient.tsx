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
    <div className="min-h-screen bg-canvas py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6 text-strong">
            Contact Us
          </h1>
          <p className="text-xl text-body">
            Have questions? We&apos;re here to help local workers and customers succeed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-surface p-8 rounded-lg border border-line">
            <h2 className="text-2xl font-bold text-accent-text mb-6">Send us a message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-body mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2 text-strong focus:border-accent focus:outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-body mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2 text-strong focus:border-accent focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-body mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2 text-strong focus:border-accent focus:outline-none"
                  placeholder="What's this about?"
                />
              </div>
              <div>
                <label className="block text-body mb-2">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2 text-strong focus:border-accent focus:outline-none"
                  placeholder="Tell us more..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-accent hover:bg-accent text-on-accent font-bold py-3 rounded-lg transition-colors"
              >
                Send Message
              </button>
              {submitted && (
                <div className="bg-success/50 border border-success rounded-lg p-4 text-success">
                  Message sent! We&apos;ll get back to you soon.
                </div>
              )}
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div className="bg-surface p-6 rounded-lg border border-line">
              <div className="text-3xl mb-4">📧</div>
              <h3 className="text-xl font-bold text-accent-text mb-2">Email</h3>
              <p className="text-body">support@tryhardly.com</p>
              <p className="text-sm text-muted mt-2">We typically respond within 24 hours</p>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-line">
              <div className="text-3xl mb-4">📍</div>
              <h3 className="text-xl font-bold text-accent-text mb-2">Location</h3>
              <p className="text-body">Based in Redding, California</p>
              <p className="text-sm text-muted mt-2">Serving Shasta County</p>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-line">
              <div className="text-3xl mb-4">❓</div>
              <h3 className="text-xl font-bold text-accent-text mb-2">FAQs</h3>
              <p className="text-body">Check our FAQ section</p>
              <a href="/about" className="text-accent-text hover:text-accent-text-hover text-sm mt-2 inline-block">
                Learn more about Tryhardly →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
