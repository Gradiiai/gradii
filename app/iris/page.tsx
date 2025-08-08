'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/shared/button';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Sparkles, ArrowRight, CheckCircle, Users, Clock, TrendingUp, Brain, Zap, Target, MessageSquare, FileText, BarChart3 } from 'lucide-react';

export default function IrisPage() {
  const agents = [
    { icon: <Users className="h-5 w-5" />, title: 'Interview Manager', desc: 'Manages interview scheduling and coordination' },
    { icon: <Brain className="h-5 w-5" />, title: 'Autonomous Analyzer', desc: 'Analyzes candidate responses automatically' },
    { icon: <Target className="h-5 w-5" />, title: 'Skill Assessor', desc: 'Evaluates technical and soft skills' },
    { icon: <MessageSquare className="h-5 w-5" />, title: 'Content Reviewer', desc: 'Reviews and scores interview content' },
    { icon: <FileText className="h-5 w-5" />, title: 'Report Generator', desc: 'Creates comprehensive interview reports' },
    { icon: <Zap className="h-5 w-5" />, title: 'Process Optimizer', desc: 'Optimizes hiring workflows' },
    { icon: <BarChart3 className="h-5 w-5" />, title: 'Quality Checker', desc: 'Ensures interview quality standards' },
    { icon: <Clock className="h-5 w-5" />, title: 'Timeline Guardian', desc: 'Manages hiring timelines and deadlines' },
  ];

  const features = [
    {
      category: 'AI Agents',
      title: 'Offload the busywork with custom AI agents',
      description: 'that act, respond, and execute for your hiring team.',
      items: ['Interview Scheduler', 'Candidate Screener', 'Report Writer', 'Quality Assessor', 'Process Optimizer']
    },
    {
      category: 'Autonomous Hiring',
      title: 'Work moves forward on its own with task',
      description: 'assigning, progress tracking, and prioritization.',
      items: ['Auto-assign interviews', 'Progress tracking', 'Smart prioritization']
    },
    {
      category: 'AI Interviews',
      title: 'Every interview becomes notes, tasks,',
      description: 'agendas, and follow-ups, automatically.',
      items: ['Auto transcription', 'Smart summaries', 'Action items']
    },
    {
      category: 'Enterprise AI Search & Ask',
      title: 'Get trusted answers from every corner of',
      description: 'your hiring workspace, instantly and in full context.',
      items: ['Candidate search', 'Interview insights', 'Hiring analytics']
    },
    {
      category: 'AI Creator',
      title: 'Turn ideas into interview questions, assessments,',
      description: 'and reports with zero prompt engineering or manual work.',
      items: ['Question generation', 'Assessment creation', 'Report automation']
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-black" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-6 max-w-6xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 mb-8">
              <Sparkles className="h-4 w-4" />
              <span>Iris</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              The only AI that<br />works <span className="text-purple-400">where</span> you work
            </h1>
            
            <div className="max-w-lg mx-auto mb-12">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-700">
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm">Analyzing candidate responses from latest interview...</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 mb-8">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full px-8 py-3 font-semibold">
                Get Started. It's free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Link href="/landing/contact" className="text-gray-300 hover:text-white font-medium">
                Book a demo
              </Link>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>No setup required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Free forever</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>No credit card</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Agent Selection Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-300">MAKE AI YOUR OWN</h2>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-400 mb-2">YOUR AGENTS</h3>
                <p className="text-gray-500">0 SELECTED</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {agents.map((agent, index) => (
                  <motion.div
                    key={agent.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:border-purple-500/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg group-hover:from-purple-600/30 group-hover:to-pink-600/30 transition-all">
                        {agent.icon}
                      </div>
                    </div>
                    <h4 className="font-semibold text-white mb-1">{agent.title}</h4>
                    <p className="text-sm text-gray-400">{agent.desc}</p>
                  </motion.div>
                ))}
              </div>
              
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl py-3 font-semibold">
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <div className="mt-8 space-y-4">
                <div className="text-gray-400">
                  <h4 className="font-semibold mb-2">AI TOOLS</h4>
                  <p className="text-sm">0 SELECTED</p>
                </div>
                <div className="text-gray-400">
                  <h4 className="font-semibold mb-2">YOUR WORKFLOWS</h4>
                  <p className="text-sm">0 SELECTED</p>
                </div>
                <div className="text-gray-400">
                  <h4 className="font-semibold mb-2">YOUR DATA</h4>
                  <p className="text-sm">0 SELECTED</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative z-10">
                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl p-8 border border-purple-500/30">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                      <Brain className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Your Agents</h3>
                  </div>
                </div>
                
                <div className="mt-8 space-y-4">
                  {['AI Tools', 'Your Workflows', 'Your Data'].map((layer, index) => (
                    <div key={layer} className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                      <h4 className="font-semibold text-gray-300">{layer}</h4>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-6 max-w-6xl text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 text-sm text-gray-400 mb-4">
              <CheckCircle className="h-4 w-4" />
              <span>Save 1 day per week, guaranteed.</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-16">
              150,000+ teams get an unfair<br />advantage using Iris
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800"
            >
              <div className="text-4xl font-bold text-green-400 mb-2">86%</div>
              <div className="text-sm text-gray-400 mb-4">cost savings</div>
              <p className="text-sm text-gray-500">
                Iris's comprehensive capabilities replace the need for dozens of other AI tools.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800"
            >
              <div className="text-4xl font-bold text-green-400 mb-2">1.1 days</div>
              <div className="text-sm text-gray-400 mb-4">saved per week</div>
              <p className="text-sm text-gray-500">
                Iris saves users time by automating the busy work and simplifying execution.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800"
            >
              <div className="text-4xl font-bold text-green-400 mb-2">3X</div>
              <div className="text-sm text-gray-400 mb-4">faster task completion</div>
              <p className="text-sm text-gray-500">
                Teams using Iris finish work faster with AI that has full context of all your work.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-6 max-w-6xl text-center">
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 text-sm text-purple-400 mb-4">
              <Sparkles className="h-4 w-4" />
              <span>AI in every feature</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Your knowledge.<br />Your workflows. Your AI.
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'AI SyncUps & Notetaker', subtitle: 'Start with your idea', image: '📝' },
              { title: 'AI Tools', subtitle: 'Iris creates the brief and tasks', image: '🧠' },
              { title: 'AI Image Generator', subtitle: 'Iris Agents jump in to design', image: '🎨' },
              { title: 'AI Stand-ups & Answers Agent', subtitle: 'Iris loops everyone in and answer questions', image: '💬' },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800 hover:border-purple-500/50 transition-all"
              >
                <div className="text-4xl mb-4">{item.image}</div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.subtitle}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-sm text-gray-400 mb-4">
              <CheckCircle className="h-4 w-4" />
              <span>The complete end-to-end AI stack</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Transform your business with<br />best-in-class AI tools
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 hover:border-purple-500/30 transition-all"
              >
                <div className="mb-6">
                  <h3 className="text-purple-400 font-semibold mb-2">{feature.category}</h3>
                  <h4 className="text-xl font-bold text-white mb-2">{feature.title}</h4>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
                
                <div className="space-y-2">
                  {feature.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-purple-400 rounded-full" />
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-16">
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full px-8 py-3 font-semibold mr-4">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Link href="/landing/contact" className="text-gray-300 hover:text-white font-medium">
              Book a demo
            </Link>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}


