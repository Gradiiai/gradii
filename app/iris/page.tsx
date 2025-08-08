'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/shared/button';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Sparkles } from 'lucide-react';

export default function IrisPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <section className="relative pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-6xl text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400">
              <Sparkles className="h-4 w-4" />
              <span>Iris</span>
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900">The only AI that works with your interviews</h1>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
              Iris connects every interview, assessment, and workflow in Gradii to help you draft, analyze, and automate work across your hiring stack.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button className="bg-black hover:bg-gray-800 text-white rounded-full px-6">Get started</Button>
              <Link href="/landing/contact" className="text-sm font-medium text-gray-700 hover:text-gray-900">Book a demo</Link>
            </div>
          </motion.div>

          <motion.div
            className="mt-14 rounded-3xl bg-white p-6 shadow-xl border overflow-hidden"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="grid md:grid-cols-3 gap-6 text-left">
              {[
                { title: 'Generate', desc: 'Create interview templates, questions, and emails in seconds.' },
                { title: 'Analyze', desc: 'Score interviews and summarize insights instantly.' },
                { title: 'Automate', desc: 'Trigger actions across your ATS, CRM, and internal tools.' },
              ].map((card, i) => (
                <motion.div key={card.title} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="rounded-2xl border p-5">
                  <div className="text-sm font-semibold text-pink-600">{card.title}</div>
                  <div className="mt-1 text-gray-700">{card.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}


