import { Link } from 'react-router-dom';
import {
  Brain,
  Users,
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Heart,
  Shield,
  Calendar,
  Save,
  BarChart3,
  Lightbulb,
  Home,
} from 'lucide-react';
import { FeedbackLoop } from './FeedbackLoop';

export function HowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-blue-50 to-teal-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                <Brain size={24} className="text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                SharedMinds
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Home
              </Link>
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

      <section className="relative py-24 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-blue-300/30 to-teal-300/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-amber-300/20 to-peach-300/20 rounded-full blur-3xl"></div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block mb-6 px-6 py-2 bg-gradient-to-r from-blue-100 to-teal-100 rounded-full border border-blue-200/50">
            <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              Your Roadmap to Household Harmony
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-8 leading-tight">
            How SharedMinds Works
          </h1>

          <p className="text-2xl text-gray-700 max-w-3xl mx-auto mb-12 leading-relaxed">
            SharedMinds is your roadmap for understanding every mind in your home. We guide you through a gentle journey from confusion to clarity, helping each neurotype feel seen, heard, and supported.
          </p>

          <div className="rounded-3xl overflow-hidden shadow-2xl max-w-4xl mx-auto mb-8">
            <img
              src="https://images.pexels.com/photos/4545991/pexels-photo-4545991.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Diverse family supporting each other in warm home environment"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              The Five-Stage Journey
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From first questions to lasting harmony, here's how SharedMinds transforms your household dynamics.
            </p>
          </div>

          <div className="space-y-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src="https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Person peacefully completing assessment at home"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl font-bold mb-6">
                  1
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-6">
                  Personalized Assessment
                </h3>
                <p className="text-xl text-gray-700 leading-relaxed mb-6">
                  Each person completes a gentle, neurodiversity-friendly questionnaire designed to honor how different brains work.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Shield size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Private & Safe</h4>
                      <p className="text-gray-600">Your answers are completely private. No judgment, no pressure, no influence from others.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                      <Save size={24} className="text-teal-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Autosave Progress</h4>
                      <p className="text-gray-600">Take breaks anytime. Your answers save automatically, so you can complete at your own pace.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Brain size={24} className="text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Neurodiversity-Friendly Design</h4>
                      <p className="text-gray-600">Clear language, no cognitive overload, and questions designed for ADHD, Autism, AuDHD, Dyslexia, and all neurotypes.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-2xl font-bold mb-6">
                  2
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-6">
                  Harmony Profile
                </h3>
                <p className="text-xl text-gray-700 leading-relaxed mb-6">
                  See your household through a new lens. Your Harmony Profile reveals how each person's perspective shapes daily life.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                      <Users size={24} className="text-teal-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Side-by-Side Comparisons</h4>
                      <p className="text-gray-600">Discover where you align and where you differ—without blame or judgment.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <BarChart3 size={24} className="text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Emotional Load Mapping</h4>
                      <p className="text-gray-600">See who carries what emotional weight and why it feels invisible to others.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Sparkles size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Neurotype Friction Points & Strengths</h4>
                      <p className="text-gray-600">Understand where your neurotypes clash—and where they beautifully complement each other.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src="https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Couple reviewing insights together with understanding"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src="https://images.pexels.com/photos/3768131/pexels-photo-3768131.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Person reading personalized action plan"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white text-2xl font-bold mb-6">
                  3
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-6">
                  Tailored Action Plan
                </h3>
                <p className="text-xl text-gray-700 leading-relaxed mb-6">
                  Get practical strategies customized to your household's unique neurotype combination.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Lightbulb size={24} className="text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Neurotype-Specific Strategies</h4>
                      <p className="text-gray-600">Recommendations designed for ADHD, Autism, AuDHD, Dyslexia, sensory differences, and more.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                      <Heart size={24} className="text-rose-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Communication Frameworks</h4>
                      <p className="text-gray-600">Learn how to speak each other's language and reduce misunderstandings.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                      <Home size={24} className="text-teal-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Sensory & Executive Support</h4>
                      <p className="text-gray-600">Practical accommodations that honor everyone's needs and create a calmer home.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white text-2xl font-bold mb-6">
                  4
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-6">
                  Improve Together
                </h3>
                <p className="text-xl text-gray-700 leading-relaxed mb-6">
                  SharedMinds grows with you, offering adaptive support and gentle recommendations—no pressure, no streaks, no guilt.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                      <Target size={24} className="text-rose-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Adaptive Suggestions</h4>
                      <p className="text-gray-600">Recommendations that evolve based on what works for your household.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                      <Calendar size={24} className="text-pink-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">No Pressure Approach</h4>
                      <p className="text-gray-600">Progress at your own pace. No gamification, no guilt—just support when you need it.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Sparkles size={24} className="text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Celebrate Small Wins</h4>
                      <p className="text-gray-600">Notice progress without overwhelming expectations. Every step forward matters.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src="https://images.pexels.com/photos/4545987/pexels-photo-4545987.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Family celebrating progress together at home"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src="https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Happy neurodiverse family in harmonious home environment"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 text-white text-2xl font-bold mb-6">
                  5
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-6">
                  Harmony Over Time
                </h3>
                <p className="text-xl text-gray-700 leading-relaxed mb-6">
                  Watch your household transform as understanding deepens, empathy grows, and everyone feels truly seen.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                      <TrendingUp size={24} className="text-violet-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Deeper Empathy</h4>
                      <p className="text-gray-600">Everyone's perspective becomes clearer. Misunderstandings turn into moments of connection.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Heart size={24} className="text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Reduced Conflict</h4>
                      <p className="text-gray-600">Friction points soften as you learn to honor each neurotype's needs.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                      <Home size={24} className="text-pink-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">A Calmer Home</h4>
                      <p className="text-gray-600">Experience a home where every mind feels understood, supported, and safe.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-blue-50/50 py-24 overflow-visible">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
          <FeedbackLoop />
        </div>
      </section>

      <section className="bg-gradient-to-br from-blue-600 via-teal-600 to-emerald-600 py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-8">
            Ready to Start Your Journey?
          </h2>
          <p className="text-2xl text-blue-100 mb-12 leading-relaxed">
            Join thousands of neurodiverse households building understanding and harmony.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Link
              to="/auth/signup"
              className="group bg-white hover:bg-gray-100 text-teal-600 font-bold px-12 py-5 rounded-full transition-all shadow-2xl hover:shadow-3xl text-xl flex items-center gap-3"
            >
              Start Your Free Assessment
              <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="flex justify-center items-center gap-8 flex-wrap text-white/90">
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
              <span className="text-lg">15-20 minutes</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative bg-gradient-to-br from-gray-900 to-slate-900 text-gray-300 py-16">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-teal-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Link to="/" className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                <Brain size={28} className="text-white" />
              </div>
              <span className="text-3xl font-bold text-white">SharedMinds</span>
            </Link>
            <p className="text-gray-400 leading-relaxed text-lg max-w-2xl mx-auto">
              Building harmony in neurodiverse households—one mind at a time.
            </p>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-500">
              &copy; {new Date().getFullYear()} SharedMinds. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
