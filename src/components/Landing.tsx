import { Link } from 'react-router-dom';
import {
  Heart,
  Users,
  Brain,
  Sparkles,
  MessageCircle,
  Shield,
  Lightbulb,
  ArrowRight,
  Mail,
  CheckCircle,
  Layers,
  Volume2,
  Calendar,
  Zap,
} from 'lucide-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-blue-50 to-teal-50">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.5); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
      `}</style>

      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                <Brain size={24} className="text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                SharedMinds
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/auth/login"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/auth/signup"
                className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold px-6 py-2.5 rounded-full transition-all shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-blue-300/30 to-teal-300/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-amber-300/20 to-peach-300/20 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>

        <div className="relative grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div className="text-center lg:text-left">
            <div className="inline-block mb-6 px-6 py-2 bg-gradient-to-r from-blue-100 to-teal-100 rounded-full border border-blue-200/50">
              <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                For ADHD, Autism, AuDHD, Dyslexia, and all neurodiverse homes
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              Understand
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">Every Mind</span>
                <span className="absolute bottom-2 left-0 w-full h-4 bg-gradient-to-r from-blue-300 to-teal-300 opacity-50 blur-sm"></span>
              </span>
              <br />
              in Your Home.
            </h1>

            <p className="text-xl text-gray-700 mb-12 leading-relaxed">
              SharedMinds helps neurodiverse households build harmony through shared insights, emotional clarity, and personalised support — for ADHD, Autism, AuDHD, Dyslexia, sensory differences, and more.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <Link
                to="/auth/signup"
                className="group bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold px-10 py-5 rounded-full transition-all shadow-xl hover:shadow-2xl flex items-center gap-3 text-lg"
              >
                Start Your Free Assessment
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/how-it-works"
                className="bg-white hover:bg-gray-50 text-gray-900 font-semibold px-10 py-5 rounded-full border-2 border-gray-300 transition-all shadow-lg hover:shadow-xl text-lg"
              >
                How SharedMinds Works
              </Link>
            </div>
          </div>

          <div className="relative lg:block">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Diverse couple having a calm, supportive conversation at home"
                className="w-full h-auto object-cover"
                data-image-id="POS-04"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent"></div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-teal-400 to-blue-400 rounded-3xl opacity-50 blur-2xl"></div>
            <div className="absolute -top-6 -left-6 w-40 h-40 bg-gradient-to-br from-amber-400 to-peach-400 rounded-3xl opacity-50 blur-2xl"></div>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-gray-200/50 text-center hover:bg-white/80 transition-all">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <Users size={32} className="text-blue-600" />
            </div>
            <p className="text-gray-700 font-medium">Multiple Perspectives</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-gray-200/50 text-center hover:bg-white/80 transition-all">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center">
              <Sparkles size={32} className="text-teal-600" />
            </div>
            <p className="text-gray-700 font-medium">AI-Powered Insights</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-gray-200/50 text-center hover:bg-white/80 transition-all">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
              <Heart size={32} className="text-amber-600" />
            </div>
            <p className="text-gray-700 font-medium">Judgment-Free Support</p>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-blue-50/50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Neurodiversity at Home Is Complex
            </h2>
            <p className="text-2xl text-gray-700 max-w-3xl mx-auto mb-4">
              Every brain processes the world differently.
            </p>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              And every home needs its own way of making things work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl overflow-hidden border border-rose-200/50 hover:shadow-2xl transition-all">
              <div className="relative h-48 overflow-hidden">
                <img
                  src="https://images.pexels.com/photos/5699456/pexels-photo-5699456.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Couple navigating communication differences"
                  className="w-full h-full object-cover"
                  data-image-id="ARG-03"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rose-100 to-transparent"></div>
              </div>
              <div className="p-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center mb-6">
                  <MessageCircle size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Communication Mismatches
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  What feels direct to one person feels harsh to another. What seems clear to you gets misunderstood by them. Different neurotypes process language, tone, and context in fundamentally different ways.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl overflow-hidden border border-amber-200/50 hover:shadow-2xl transition-all">
              <div className="relative h-48 overflow-hidden">
                <img
                  src="https://images.pexels.com/photos/3807738/pexels-photo-3807738.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Person experiencing sensory overwhelm with supportive partner"
                  className="w-full h-full object-cover"
                  data-image-id="STRUGGLE-05"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-amber-100 to-transparent"></div>
              </div>
              <div className="p-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center mb-6">
                  <Volume2 size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Sensory Overwhelm & Emotional Fatigue
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Sounds that feel normal to one person are physically painful to another. Social interactions that energize some drain others completely. Sensory and emotional needs vary dramatically across neurotypes.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl overflow-hidden border border-blue-200/50 hover:shadow-2xl transition-all">
              <div className="relative h-48 overflow-hidden">
                <img
                  src="https://images.pexels.com/photos/3777943/pexels-photo-3777943.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Adult experiencing task paralysis and executive dysfunction"
                  className="w-full h-full object-cover"
                  data-image-id="ADHD-04"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-100 to-transparent"></div>
              </div>
              <div className="p-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center mb-6">
                  <Zap size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Task Paralysis & Executive Dysfunction
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  The gap between wanting to do something and being able to start feels insurmountable. Executive function challenges make planning, prioritizing, and initiating tasks incredibly difficult—not from lack of care, but from how the brain works.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-3xl overflow-hidden border border-teal-200/50 hover:shadow-2xl transition-all">
              <div className="relative h-48 overflow-hidden">
                <img
                  src="https://images.pexels.com/photos/4098369/pexels-photo-4098369.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Family navigating different routine needs"
                  className="w-full h-full object-cover"
                  data-image-id="CLUTTER-02"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-100 to-transparent"></div>
              </div>
              <div className="p-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-400 flex items-center justify-center mb-6">
                  <Calendar size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Routine vs Flexibility Conflicts
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  One person thrives on structure and predictability. Another needs spontaneity and flexibility to function. When these needs clash, both people feel trapped and misunderstood, unable to meet in the middle.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A simple, gentle journey from questions to clarity.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto mb-16">
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Users size={40} className="text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                  1
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Take Your Assessment
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Complete a gentle, neurodiversity-friendly questionnaire at your own pace. Everything autosaves, so you can take breaks anytime.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Sparkles size={40} className="text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-xl font-bold">
                  2
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Reveal Your Profile
              </h3>
              <p className="text-gray-600 leading-relaxed">
                See how each person's perspective compares. Discover communication gaps, emotional load mismatches, and daily friction points.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Lightbulb size={40} className="text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center text-xl font-bold">
                  3
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Get Your Action Plan
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Receive practical recommendations tailored to your neurotype mix—ADHD, Autism, AuDHD, Dyslexia, and more.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Heart size={40} className="text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center text-xl font-bold">
                  4
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Improve Together
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Grow with adaptive suggestions and gentle support. No pressure, no streaks—just progress at your own pace.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold px-10 py-5 rounded-full transition-all shadow-xl hover:shadow-2xl text-lg"
            >
              See the Full Journey
              <ArrowRight size={22} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-amber-50 via-blue-50 to-teal-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Simple, Clear Process
            </h2>
            <p className="text-xl text-gray-600">
              From questions to insights in four straightforward steps.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
              <div className="grid md:grid-cols-4 divide-x divide-gray-200">
                <div className="p-8 text-center hover:bg-blue-50/50 transition-colors">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    1
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Answer</h3>
                  <p className="text-sm text-gray-600">
                    Complete the questionnaire at your own pace
                  </p>
                </div>

                <div className="p-8 text-center hover:bg-teal-50/50 transition-colors">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">
                    2
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Compare</h3>
                  <p className="text-sm text-gray-600">
                    AI analyzes differences and patterns
                  </p>
                </div>

                <div className="p-8 text-center hover:bg-amber-50/50 transition-colors">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-2xl font-bold">
                    3
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Understand</h3>
                  <p className="text-sm text-gray-600">
                    Get your harmony report with insights
                  </p>
                </div>

                <div className="p-8 text-center hover:bg-rose-50/50 transition-colors">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white text-2xl font-bold">
                    4
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Take Action</h3>
                  <p className="text-sm text-gray-600">
                    Follow your personalized support plan
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 p-12">
                <div className="text-center text-white">
                  <Layers size={48} className="mx-auto mb-4 opacity-90" />
                  <h3 className="text-2xl font-bold mb-3">Your Personalized Harmony Report</h3>
                  <p className="text-blue-100 max-w-2xl mx-auto text-lg">
                    Your report highlights areas of alignment, reveals perception gaps specific to your neurotypes, and provides actionable steps to build understanding and reduce conflict.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Stories from Neurodiverse Households
            </h2>
            <p className="text-xl text-gray-600">
              Real challenges. Real understanding. Real progress.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl overflow-hidden border border-blue-200/50 hover:shadow-xl transition-all">
              <div className="h-40 overflow-hidden relative">
                <img
                  src="https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Interracial neurodiverse couple smiling together"
                  className="w-full h-full object-cover"
                  data-image-id="POS-01"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-50"></div>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    M
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Maya & Jordan</p>
                    <p className="text-sm text-gray-600">ADHD + Autistic partners</p>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-500 mb-2">Before SharedMinds</p>
                  <p className="text-gray-700">
                    "I needed structure. They needed spontaneity. Every plan became a fight, and we both felt trapped."
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-2">After SharedMinds</p>
                  <p className="text-gray-700">
                    "The report showed us how to create flexible structure. Now we honor both our needs without conflict."
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-3xl overflow-hidden border border-teal-200/50 hover:shadow-xl transition-all">
              <div className="h-40 overflow-hidden relative">
                <img
                  src="https://images.pexels.com/photos/4545987/pexels-photo-4545987.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Parent supporting neurodiverse child at home"
                  className="w-full h-full object-cover"
                  data-image-id="FAMILY-03"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-teal-50"></div>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-emerald-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    R
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Rachel & Family</p>
                    <p className="text-sm text-gray-600">AuDHD parent + sensory-seeking child</p>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-500 mb-2">Before SharedMinds</p>
                  <p className="text-gray-700">
                    "My child's sensory needs drained me completely. I couldn't regulate myself while meeting theirs."
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-2">After SharedMinds</p>
                  <p className="text-gray-700">
                    "We learned to create sensory zones that work for both of us. I can recharge while they thrive."
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl overflow-hidden border border-amber-200/50 hover:shadow-xl transition-all">
              <div className="h-40 overflow-hidden relative">
                <img
                  src="https://images.pexels.com/photos/3768894/pexels-photo-3768894.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Couple working through communication with support"
                  className="w-full h-full object-cover"
                  data-image-id="POS-02"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-50"></div>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    D
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">David & Alex</p>
                    <p className="text-sm text-gray-600">Dyslexic + ADHD partners</p>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-500 mb-2">Before SharedMinds</p>
                  <p className="text-gray-700">
                    "We both struggled with tasks but in different ways. We couldn't support each other because we didn't understand our own challenges."
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-2">After SharedMinds</p>
                  <p className="text-gray-700">
                    "Now we know our individual patterns and create systems that support both neurotypes. We're finally a team."
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl overflow-hidden border border-rose-200/50 hover:shadow-xl transition-all">
              <div className="h-40 overflow-hidden relative">
                <img
                  src="https://images.pexels.com/photos/3768131/pexels-photo-3768131.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Person with executive dysfunction getting partner support"
                  className="w-full h-full object-cover"
                  data-image-id="STRUGGLE-02"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-rose-50"></div>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    S
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Sam & Chris</p>
                    <p className="text-sm text-gray-600">Executive dysfunction + neurotypical partner</p>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-500 mb-2">Before SharedMinds</p>
                  <p className="text-gray-700">
                    "Chris thought I was lazy. I felt broken and ashamed. We were stuck in blame cycles."
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-2">After SharedMinds</p>
                  <p className="text-gray-700">
                    "The report helped Chris understand executive dysfunction. Now they support me without judgment, and I don't feel ashamed."
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-3xl overflow-hidden border border-blue-200/50 hover:shadow-xl transition-all">
              <div className="h-40 overflow-hidden relative">
                <img
                  src="https://images.pexels.com/photos/4545990/pexels-photo-4545990.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Autistic individual in supportive relationship"
                  className="w-full h-full object-cover"
                  data-image-id="FAMILY-02"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-50"></div>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    T
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Taylor & Lee</p>
                    <p className="text-sm text-gray-600">Autistic + ADHD partners</p>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-500 mb-2">Before SharedMinds</p>
                  <p className="text-gray-700">
                    "My sensory needs felt impossible to explain. They took everything personally when I needed space."
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-2">After SharedMinds</p>
                  <p className="text-gray-700">
                    "SharedMinds gave us the language. Now Lee understands my sensory shutdowns aren't rejection—just how I recharge."
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-3xl overflow-hidden border border-amber-200/50 hover:shadow-xl transition-all">
              <div className="h-40 overflow-hidden relative">
                <img
                  src="https://images.pexels.com/photos/3768146/pexels-photo-3768146.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Mixed neurotype family finding harmony"
                  className="w-full h-full object-cover"
                  data-image-id="FAMILY-05"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-50"></div>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    K
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Kim & Pat</p>
                    <p className="text-sm text-gray-600">Anxiety-based EF challenges + ADHD</p>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-500 mb-2">Before SharedMinds</p>
                  <p className="text-gray-700">
                    "My anxiety paralysis looked like avoidance. Their ADHD impulsivity looked like carelessness. We misread each other constantly."
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-2">After SharedMinds</p>
                  <p className="text-gray-700">
                    "We finally see each other's struggles clearly. We've built a system that reduces both my anxiety and their overwhelm."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-blue-50 via-teal-50 to-amber-50 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl shadow-2xl p-12 border border-gray-200/50">
            <Shield size={64} className="mx-auto mb-6 text-blue-600" />
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              SharedMinds will always offer a free starter version so every neurodiverse household can access support.
            </p>
            <div className="inline-block bg-gradient-to-r from-blue-100 to-teal-100 rounded-2xl px-8 py-4 mb-8">
              <p className="text-lg font-semibold text-gray-900">
                Free Assessment + Basic Report
              </p>
              <p className="text-gray-600 mt-1">Always available to everyone</p>
            </div>
            <p className="text-gray-600 mb-8">
              Premium household insights and ongoing support features coming soon.
            </p>
            <Link
              to="/auth/signup"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold px-10 py-5 rounded-full transition-all shadow-xl hover:shadow-2xl text-lg"
            >
              Join Early Access
              <ArrowRight size={22} />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-teal-600 to-emerald-600 animate-gradient"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" style={{animationDelay: '3s'}}></div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-6xl font-bold text-white mb-8 leading-tight">
            Create a calmer, kinder home
            <br />
            — starting today.
          </h2>
          <p className="text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            SharedMinds helps every neurotype feel understood.
          </p>

          <div className="mb-12 rounded-3xl overflow-hidden shadow-2xl max-w-3xl mx-auto">
            <img
              src="https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1000"
              alt="Happy neurodiverse family embracing at home"
              className="w-full h-auto object-cover"
              data-image-id="POS-08"
            />
          </div>

          <Link
            to="/auth/signup"
            className="inline-flex items-center gap-3 bg-white hover:bg-gray-100 text-teal-600 font-bold px-12 py-6 rounded-full transition-all shadow-2xl hover:shadow-3xl text-xl"
          >
            Start Your Free Assessment
            <ArrowRight size={24} />
          </Link>

          <div className="mt-16 flex justify-center items-center gap-8 flex-wrap text-white/90">
            <div className="flex items-center gap-2">
              <CheckCircle size={24} />
              <span className="text-lg">Free to start</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={24} />
              <span className="text-lg">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={24} />
              <span className="text-lg">Takes 15-20 minutes</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative bg-gradient-to-br from-gray-900 to-slate-900 text-gray-300 py-16">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-teal-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                  <Brain size={28} className="text-white" />
                </div>
                <span className="text-3xl font-bold text-white">SharedMinds</span>
              </div>
              <p className="text-gray-400 leading-relaxed text-lg mb-6">
                SharedMinds supports neurodiverse households with compassion, understanding, and practical tools for building harmony at home — for ADHD, Autism, AuDHD, Dyslexia, and all neurotypes.
              </p>
              <div className="flex items-center gap-3 text-gray-400">
                <Mail size={20} />
                <a href="mailto:support@sharedmind.app" className="hover:text-white transition-colors">
                  support@sharedmind.app
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6 text-lg">Product</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/how-it-works" className="text-gray-400 hover:text-white transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/auth/signup" className="text-gray-400 hover:text-white transition-colors">
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link to="/auth/login" className="text-gray-400 hover:text-white transition-colors">
                    Log In
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6 text-lg">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500">
              &copy; {new Date().getFullYear()} SharedMinds. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm">
              Built with care for neurodiverse households everywhere.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
