import { useState, useEffect } from 'react';
import { Brain, Mail, Check, MessageCircle, Volume2, Zap, Calendar, Sparkles, Heart, Lightbulb, Users, Shield, LayoutGrid as Layout, Activity, Info, Anchor, Eye, Compass, Wind, Network, Map, ArrowRight, Layers, Target, BarChart3, AlertCircle, GitBranch, ChevronDown, ChevronLeft, ChevronRight, Instagram, Linkedin, StickyNote, Bell, ShoppingCart, UtensilsCrossed, Trophy, Camera, Star, CheckCircle, Leaf, Plus, Frame } from 'lucide-react';
import InteractiveProblemSection from './InteractiveProblemSection';
import StackCards from './StackCards';
import SpaceExplainer from './SpaceExplainer';
import SpacesModeToggle from './SpacesModeToggle';
import WidgetPalette from './WidgetPalette';
import RegulationHero from './RegulationHero';
import RegulationIsIsnt from './RegulationIsIsnt';
import BehaviouralPatterns from './BehaviouralPatterns';
import CognitiveContexts from './CognitiveContexts';
import DailyAlignment from './DailyAlignment';
import AIExplanation from './AIExplanation';
import SignalsSection from './SignalsSection';
import MindPatternBackground from './MindPatternBackground';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import CookieNotice from './CookieNotice';
import WaitlistForm from './WaitlistForm';
import NeuralNetworkBackground from './NeuralNetworkBackground';
import InteractiveNeuralAnimation from './InteractiveNeuralAnimation';
import ThoughtFlowBackground from './ThoughtFlowBackground';
import GuardRailsPage from './GuardRailsPage';
import UnsubscribePage from './UnsubscribePage';
import SharedMindsLogo from './assets/shared_minds_logo_2.svg';
import FounderImage from './assets/image.png';

/**
 * IMAGE CONFIGURATION
 *
 * To change any image on the website, update the URLs below.
 * See IMAGE_GUIDE.md for detailed instructions on which image appears where.
 */
const IMAGE_CONFIG = {
  hero: {
    url: 'https://images.pexels.com/photos/5212700/pexels-photo-5212700.jpeg',
    alt: 'Person thinking and planning'
  },
  audiences: {
    adhd: {
      url: 'https://images.pexels.com/photos/5212317/pexels-photo-5212317.jpeg?auto=compress&cs=tinysrgb&w=800',
      alt: 'Person with ADHD working thoughtfully'
    },
    parents: {
      url: 'https://images.pexels.com/photos/3184405/pexels-photo-3184405.jpeg?auto=compress&cs=tinysrgb&w=800',
      alt: 'Parent managing family life'
    },
    professionals: {
      url: 'https://images.pexels.com/photos/3184296/pexels-photo-3184296.jpeg?auto=compress&cs=tinysrgb&w=800',
      alt: 'Professional managing multiple projects'
    },
    creatives: {
      url: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800',
      alt: 'Creative person organizing ideas'
    }
  },
  guardrails: {
    url: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg',
    alt: 'Focused work environment'
  },
  regulation: {
    url: 'https://images.pexels.com/photos/3759657/pexels-photo-3759657.jpeg',
    alt: 'Calm and regulated environment'
  }
};

type PageType = 'home' | 'privacy' | 'terms' | 'guardrails' | 'spaces' | 'regulation' | 'use-cases' | 'why' | 'unsubscribe';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const urlParams = new URLSearchParams(window.location.search);
      const unsubscribeToken = urlParams.get('token');

      if (hash === 'unsubscribe' || unsubscribeToken) {
        setCurrentPage('unsubscribe');
      } else if (hash === 'privacy') {
        setCurrentPage('privacy');
      } else if (hash === 'terms') {
        setCurrentPage('terms');
      } else if (hash === 'guardrails') {
        setCurrentPage('guardrails');
      } else if (hash === 'spaces') {
        setCurrentPage('spaces');
      } else if (hash === 'regulation') {
        setCurrentPage('regulation');
      } else if (hash.startsWith('use-cases')) {
        setCurrentPage('use-cases');
      } else if (hash === 'why' || hash === 'why-sharedminds-exists') {
        setCurrentPage('why');
      } else {
        setCurrentPage('home');
        window.scrollTo(0, 0);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (page: PageType, section?: string) => {
    setCurrentPage(page);
    if (section) {
      window.location.hash = `${page}#${section}`;
      setTimeout(() => {
        const element = document.getElementById(section);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      window.location.hash = page;
      window.scrollTo(0, 0);
    }
  };

  const scrollToWaitlist = (e: React.MouseEvent) => {
    e.preventDefault();
    const waitlistSection = document.getElementById('waitlist');
    if (waitlistSection) {
      waitlistSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (currentPage === 'unsubscribe') {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    return <UnsubscribePage token={token} />;
  }

  if (currentPage === 'privacy') {
    return (
      <>
        <PrivacyPolicy />
        <CookieNotice />
      </>
    );
  }

  if (currentPage === 'terms') {
    return (
      <>
        <TermsOfService />
        <CookieNotice />
      </>
    );
  }

  if (currentPage === 'guardrails') {
    return <GuardRailsPage />;
  }

  if (currentPage === 'spaces') {
    return <SpacesPage />;
  }

  if (currentPage === 'regulation') {
    return <RegulationPage />;
  }

  if (currentPage === 'use-cases') {
    return <UseCasesPage />;
  }

  if (currentPage === 'why') {
    return <WhySharedMindsPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header scrollToWaitlist={scrollToWaitlist} />

      <main>
        <HeroSection scrollToWaitlist={scrollToWaitlist} />
        <InteractiveProblemSection />
        <PhilosophySection />
        <WhySharedMindsTeaser onNavigate={handleNavigate} />
        <CoreSystemsSection />
        <WhoItsForSection onNavigate={handleNavigate} />
        <WaitlistSection />
      </main>

      <Footer />
      <CookieNotice />
    </div>
  );
}

function Header({ scrollToWaitlist }: { scrollToWaitlist: (e: React.MouseEvent) => void }) {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 text-xl font-semibold text-blue-600">
            <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-10 h-10" />
            SharedMinds
          </a>
          <button
            onClick={scrollToWaitlist}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-medium transition-colors shadow-sm"
          >
            Join the waitlist
          </button>
        </div>
      </nav>
    </header>
  );
}

function HeroSection({ scrollToWaitlist }: { scrollToWaitlist: (e: React.MouseEvent) => void }) {
  return (
    <section className="relative min-h-screen pt-20 flex flex-col lg:flex-row items-center overflow-hidden">

      {/* BACKGROUND ANIMATION */}
      <InteractiveNeuralAnimation />

      {/* CONTENT LAYER: pointer-events-none lets touches pass to the background nodes */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 w-full pointer-events-none mt-auto mb-16 lg:my-0">
        <div className="max-w-2xl text-center lg:text-left">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight mb-6">
            One space for thinking, planning, and shared life.
          </h1>

          {/* pointer-events-auto restores interaction for just this button block */}
          <div className="pointer-events-auto flex justify-center lg:justify-start">
            <button
              onClick={scrollToWaitlist}
              className="bg-slate-900 text-white px-10 py-5 lg:px-12 lg:py-6 rounded-full font-semibold shadow-2xl active:scale-95 transition-transform"
            >
              Join the waitlist
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhilosophySection() {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const philosophies = [
    {
      image: 'https://images.pexels.com/photos/4560083/pexels-photo-4560083.jpeg',
      title: 'Non-linear thinking',
      subtitle: 'Designing for complex thinking — not perfect sequences',
      description: 'SharedMinds is built for environments where ideas, tasks, and responsibilities don\'t follow a straight line. It supports branching thoughts, shifting priorities, and interconnected work.',
      context: 'This is essential for people with non-linear or executive-function challenges — and equally valuable for anyone managing complex projects, teams, or lives.',
      scaleTitle: 'Real-world applications',
      scaleExamples: [
        { label: 'Product teams', detail: 'Managing overlapping sprints, shifting priorities, and dependencies across multiple workstreams' },
        { label: 'Households', detail: 'Coordinating schedules, tasks, and responsibilities where plans constantly shift' },
        { label: 'Creative projects', detail: 'Tracking ideas that branch, merge, and evolve without forcing linear progression' }
      ],
      gradient: 'from-blue-600 to-cyan-600',
    },
    {
      image: 'https://images.pexels.com/photos/7176026/pexels-photo-7176026.jpeg',
      title: 'Reducing shame',
      subtitle: 'Designing systems that don\'t punish friction',
      description: 'Many tools assume consistency, clarity, and momentum. SharedMinds assumes reality: energy fluctuates, context changes, and progress isn\'t linear.',
      context: 'By removing pressure and shame from the system, SharedMinds supports neurodivergent users — while also creating healthier, more sustainable workflows for neurotypical users and teams.',
      scaleTitle: 'Why this matters broadly',
      scaleExamples: [
        { label: 'Burnout prevention', detail: 'Systems that adapt to capacity changes prevent the cycle of overcommitment and guilt' },
        { label: 'Team sustainability', detail: 'Removing implicit pressure creates space for honest communication about workload' },
        { label: 'Long-term execution', detail: 'Sustainable pacing beats unsustainable sprints for any complex, ongoing work' }
      ],
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      image: 'https://images.pexels.com/photos/7376/startup-photos.jpg',
      title: 'Supporting creativity',
      subtitle: 'Helping ideas move forward without flattening them',
      description: 'Creativity often breaks rigid systems. SharedMinds provides structure that adapts — so ideas can evolve into outcomes without losing their original intent.',
      context: 'This benefits creators and founders — and also teams, households, and organisations where innovation and coordination must coexist.',
      scaleTitle: 'Where structure meets flexibility',
      scaleExamples: [
        { label: 'Early-stage startups', detail: 'Maintain strategic clarity while exploring multiple approaches and pivoting rapidly' },
        { label: 'Design systems', detail: 'Track decisions and iterations without losing the reasoning that led there' },
        { label: 'Research work', detail: 'Document exploratory paths and dead ends as valuable context, not failure' }
      ],
      gradient: 'from-amber-600 to-orange-600',
    },
  ];

  return (
    <section className="relative py-24 sm:py-32 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.05),transparent_50%)]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-block mb-6">
            <div className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full text-sm font-semibold shadow-lg">
              <Sparkles className="w-4 h-4" />
              <span>Our Core Beliefs</span>
            </div>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
            The philosophy
          </h2>
          <p className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto">
            Design principles built from cognitive diversity — and useful everywhere complexity exists
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
          {philosophies.map((philosophy, index) => (
            <div
              key={index}
              className="group relative"
            >
              <div className="relative bg-white rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all duration-700 border-2 border-slate-100 hover:border-slate-200 overflow-hidden h-full flex flex-col">
                <div className={`absolute inset-0 bg-gradient-to-br ${philosophy.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-700`}></div>

                <div className="relative h-56 overflow-hidden">
                  <img
                    src={philosophy.image}
                    alt={philosophy.title}
                    loading="lazy"
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${philosophy.gradient} opacity-20`}></div>
                </div>

                <div className="relative p-10 lg:p-12 flex-1 flex flex-col">
                  <h3 className={`text-2xl lg:text-3xl font-bold text-slate-900 mb-3 group-hover:bg-gradient-to-r group-hover:${philosophy.gradient} group-hover:bg-clip-text group-hover:text-transparent transition-all duration-500`}>
                    {philosophy.title}
                  </h3>

                  <p className="text-base font-medium text-slate-700 mb-5 italic">
                    {philosophy.subtitle}
                  </p>

                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    {philosophy.description}
                  </p>

                  <p className="text-base text-slate-600 leading-relaxed mb-6">
                    {philosophy.context}
                  </p>

                  <div className="mt-auto">
                    <button
                      onClick={() => setExpandedCard(expandedCard === index ? null : index)}
                      className={`w-full text-left px-5 py-3 rounded-xl border-2 transition-all duration-300 ${
                        expandedCard === index
                          ? `border-slate-300 bg-slate-50`
                          : `border-slate-200 hover:border-slate-300 hover:bg-slate-50`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">
                          {expandedCard === index ? 'Hide details' : 'Learn why this scales'}
                        </span>
                        <div className={`transform transition-transform duration-300 ${expandedCard === index ? 'rotate-180' : ''}`}>
                          <ChevronDown className="w-4 h-4 text-slate-600" />
                        </div>
                      </div>
                    </button>

                    {expandedCard === index && (
                      <div className="mt-4 space-y-4 animate-slideDown">
                        <div className={`h-1 w-16 rounded-full bg-gradient-to-r ${philosophy.gradient}`}></div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          {philosophy.scaleTitle}
                        </h4>
                        <div className="space-y-3">
                          {philosophy.scaleExamples.map((example, i) => (
                            <div
                              key={i}
                              className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-300 hover:shadow-md"
                              style={{ animationDelay: `${i * 100}ms` }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full bg-gradient-to-r ${philosophy.gradient} flex-shrink-0`}></div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 mb-1">
                                    {example.label}
                                  </p>
                                  <p className="text-sm text-slate-600 leading-relaxed">
                                    {example.detail}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute -bottom-2 -right-2 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                  <div className={`w-full h-full bg-gradient-to-br ${philosophy.gradient} opacity-10 rounded-full blur-2xl`}></div>
                </div>
              </div>

              <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-slate-200/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10 blur-xl rounded-[2.5rem]"></div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <div className="max-w-3xl mx-auto bg-slate-50 rounded-3xl px-10 py-8 border-2 border-slate-100 shadow-lg">
            <p className="text-xl font-semibold text-slate-900 mb-4">
              Designed for neurodivergent needs. Built for everyone navigating complexity.
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              SharedMinds takes lessons from executive function challenges, non-linear thinking, and cognitive overload — and applies them to collaboration, planning, and personal development in everyday life.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhySharedMindsTeaser({ onNavigate }: { onNavigate: (page: PageType) => void }) {
  return (
    <section className="py-24 sm:py-32 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.15),transparent_50%)]"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm font-semibold text-white mb-8 shadow-lg">
            <Lightbulb className="w-4 h-4" />
            <span>Our Story</span>
          </div>
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Most productivity tools assume everyone thinks the same way. We built SharedMinds because that assumption leaves too many people behind.
          </p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-[2.5rem] opacity-75 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
          <div className="relative bg-gradient-to-br from-white via-slate-50 to-white rounded-[2rem] shadow-2xl p-10 sm:p-14 lg:p-16 border border-slate-200/50">
            <div className="text-center mb-10">
              <div className="flex justify-center mb-8">
                <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-24 h-24 sm:w-32 sm:h-32" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-8 tracking-tight leading-tight">
                Why SharedMinds exists
              </h2>
              <div className="max-w-2xl mx-auto space-y-6">
                <p className="text-xl sm:text-2xl text-slate-700 leading-relaxed font-light">
                  SharedMinds wasn't built to enforce productivity.
                </p>
                <p className="text-xl sm:text-2xl text-slate-900 leading-relaxed font-medium">
                  It was built to respect how people actually think, plan, and live — across work, home, and collaboration.
                </p>
              </div>
            </div>

            <div className="flex justify-center mt-12">
              <button
                onClick={() => onNavigate('why')}
                className="group/btn relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-full font-semibold text-lg shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-slate-400/50 active:scale-[0.98]"
              >
                <span className="relative z-10">Why SharedMinds Exists</span>
                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-300 relative z-10" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/30 via-cyan-600/30 to-blue-600/30 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CoreSystemsSection() {
  const systems = [
    {
      icon: Shield,
      title: 'GuardRails',
      headline: 'Focus & structure — without rigidity',
      description: 'GuardRails helps you turn ideas into progress without forcing your brain into rigid workflows. It\'s designed for non-linear thinkers who need clarity, context, and momentum — not pressure.',
      link: '#guardrails',
      linkText: 'Explore GuardRails',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-cyan-500',
      accentColor: 'text-blue-600',
      hoverShadow: 'hover:shadow-blue-500/20',
      badge: 'Clarity',
    },
    {
      icon: Users,
      title: 'Spaces',
      headline: 'Personal and shared thinking, side by side',
      description: 'Spaces help individuals, households, and teams understand how different minds experience the same world. They create shared context, reduce misunderstanding, and make collaboration feel lighter and more human.',
      link: '#spaces',
      linkText: 'Explore Spaces',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-teal-500',
      accentColor: 'text-emerald-600',
      hoverShadow: 'hover:shadow-emerald-500/20',
      badge: 'Connection',
    },
    {
      icon: Activity,
      title: 'Regulation',
      headline: 'Support when thinking isn\'t enough',
      description: 'Regulation helps you recognise overload, stress, and emotional friction — and respond with care instead of self-blame. It\'s about stabilising the nervous system so focus and clarity become possible again.',
      link: '#regulation',
      linkText: 'Explore Regulation',
      gradientFrom: 'from-rose-500',
      gradientTo: 'to-orange-500',
      accentColor: 'text-rose-600',
      hoverShadow: 'hover:shadow-rose-500/20',
      badge: 'Balance',
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.05),transparent_50%)]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
            Three systems. One shared understanding.
          </h2>
          <p className="text-xl sm:text-2xl text-slate-600 leading-relaxed max-w-4xl mx-auto">
            SharedMinds is built around how real minds work — individually, together, and under pressure.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
          {systems.map((system, index) => (
            <a
              key={index}
              href={system.link}
              className={`group relative bg-white rounded-3xl border-2 border-slate-200 p-10 lg:p-12 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-slate-300 ${system.hoverShadow} overflow-hidden`}
            >
              <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${system.gradientFrom} ${system.gradientTo} opacity-0 group-hover:opacity-10 rounded-full blur-3xl transition-opacity duration-500 -mr-32 -mt-32`}></div>

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-8">
                  <div className={`w-20 h-20 bg-gradient-to-br ${system.gradientFrom} ${system.gradientTo} rounded-2xl flex items-center justify-center shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <system.icon className="w-10 h-10 text-white" strokeWidth={2} />
                  </div>
                  <span className={`px-4 py-2 bg-slate-100 ${system.accentColor} rounded-full text-sm font-semibold tracking-wide`}>
                    {system.badge}
                  </span>
                </div>

                <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                  {system.title}
                </h3>

                <p className="text-xl font-semibold text-slate-700 mb-5 leading-snug">
                  {system.headline}
                </p>

                <p className="text-base text-slate-600 leading-relaxed mb-8 min-h-[120px]">
                  {system.description}
                </p>

                <div className={`inline-flex items-center gap-2 ${system.accentColor} font-semibold text-lg group-hover:gap-3 transition-all`}>
                  <span>{system.linkText}</span>
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                </div>
              </div>

              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${system.gradientFrom} ${system.gradientTo} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhoItsForSection({ onNavigate }: { onNavigate: (page: PageType, section?: string) => void }) {
  const audiences = [
    {
      icon: Brain,
      title: 'ADHD & Executive Dysfunction',
      subtitle: 'When starting, switching, or finishing feels harder than it should',
      description: 'For people who care deeply, think creatively, and still struggle with momentum — not because they lack effort, but because their brain works differently.',
      imageUrl: IMAGE_CONFIG.audiences.adhd.url,
      imageAlt: IMAGE_CONFIG.audiences.adhd.alt,
      gradientFrom: 'from-blue-600',
      gradientTo: 'to-cyan-600',
      sectionId: 'personal-development',
    },
    {
      icon: Sparkles,
      title: 'Neurodivergent Thinkers',
      subtitle: 'When standard tools quietly make things worse',
      description: 'For people whose thinking doesn\'t fit linear workflows — and who need systems that adapt, rather than demand adaptation.',
      imageUrl: IMAGE_CONFIG.audiences.parents.url,
      imageAlt: IMAGE_CONFIG.audiences.parents.alt,
      gradientFrom: 'from-emerald-600',
      gradientTo: 'to-teal-600',
      sectionId: 'workplaces-teams',
    },
    {
      icon: Lightbulb,
      title: 'Creators & Builders',
      subtitle: 'When ideas connect faster than lists can keep up',
      description: 'For people who think in webs, patterns, and possibilities — and need space to explore without losing follow-through.',
      imageUrl: IMAGE_CONFIG.audiences.professionals.url,
      imageAlt: IMAGE_CONFIG.audiences.professionals.alt,
      gradientFrom: 'from-amber-600',
      gradientTo: 'to-orange-600',
      sectionId: 'creators-freelancers',
    },
    {
      icon: Compass,
      title: 'People Navigating Complexity',
      subtitle: 'When life or work won\'t fit into simple boxes',
      description: 'For anyone managing overlapping responsibilities, evolving priorities, or shared decision-making — at home or at work.',
      imageUrl: IMAGE_CONFIG.audiences.creatives.url,
      imageAlt: IMAGE_CONFIG.audiences.creatives.alt,
      gradientFrom: 'from-rose-600',
      gradientTo: 'to-pink-600',
      sectionId: 'households-families',
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
            Built for minds that don't work neatly
          </h2>
          <p className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto">
            SharedMinds supports people navigating complexity — in work, life, and collaboration.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-8 lg:gap-10">
          {audiences.map((audience, index) => (
            <button
              key={index}
              onClick={() => onNavigate('use-cases', audience.sectionId)}
              className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 text-left cursor-pointer"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={audience.imageUrl}
                  alt={audience.imageAlt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${audience.gradientFrom} ${audience.gradientTo} opacity-60 group-hover:opacity-50 transition-opacity duration-500`}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

                <div className="absolute top-6 left-6">
                  <div className={`w-16 h-16 bg-gradient-to-br ${audience.gradientFrom} ${audience.gradientTo} rounded-2xl flex items-center justify-center shadow-xl transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                    <audience.icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              <div className="p-8 lg:p-10">
                <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight group-hover:text-slate-800 transition-colors">
                  {audience.title}
                </h3>
                <p className="text-base text-slate-500 mb-4 italic">
                  {audience.subtitle}
                </p>
                <p className="text-base text-slate-600 leading-relaxed mb-6">
                  {audience.description}
                </p>
                <div className="inline-flex items-center gap-2 text-slate-700 group-hover:text-slate-900 transition-colors font-medium">
                  <span>Learn more</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              <div className={`absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r ${audience.gradientFrom} ${audience.gradientTo} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}></div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function WaitlistSection() {
  return (
    <section id="waitlist" className="relative py-24 sm:py-32 bg-gradient-to-b from-white via-blue-50/30 to-slate-50 overflow-hidden">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-violet-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full text-sm font-semibold shadow-lg mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Limited Early Access</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
            Ready to think differently?
          </h2>
          <p className="text-xl sm:text-2xl text-slate-600 max-w-2xl mx-auto mb-8">
            Join the waitlist and be among the first to experience tools built for how your mind actually works
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 mb-8">
            <div className="flex items-center gap-2 text-slate-600">
              <Check className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium">Free to join</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Check className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium">No spam, ever</span>
            </div>
          </div>
        </div>

        <WaitlistForm />

        <div className="mt-12 grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            {
              icon: Shield,
              title: 'Privacy first',
              description: 'Your data stays yours',
              gradient: 'from-blue-600 to-cyan-600'
            },
            {
              icon: Zap,
              title: 'Launch benefits',
              description: 'Exclusive early features',
              gradient: 'from-violet-600 to-purple-600'
            },
            {
              icon: Heart,
              title: 'Built with care',
              description: 'Thoughtfully designed',
              gradient: 'from-rose-600 to-pink-600'
            }
          ].map((benefit, index) => (
            <div key={index} className="group text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/50 hover:bg-white hover:border-slate-300 hover:shadow-lg transition-all duration-300">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${benefit.gradient} shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                <benefit.icon className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">{benefit.title}</h4>
              <p className="text-sm text-slate-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-300 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-10 h-10" />
              <span className="font-semibold text-white text-lg">SharedMinds</span>
            </div>
            <p className="text-slate-400 leading-relaxed mb-6">
              SharedMinds is being built to support non-linear thinking, executive function, and complex lives — with compassion and clarity.
            </p>
            <div className="mb-4">
              <h4 className="text-white font-semibold mb-3 text-sm">Follow Us</h4>
              <div className="flex items-center gap-4">
                <a
                  href="https://instagram.com/sharedminds"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-600 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg"
                  aria-label="Follow us on Instagram"
                >
                  <Instagram className="w-5 h-5 text-slate-300 hover:text-white transition-colors" />
                </a>
                <a
                  href="https://tiktok.com/@sharedminds"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-950 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg"
                  aria-label="Follow us on TikTok"
                >
                  <div className="text-slate-300 hover:text-white transition-colors">
                    <TikTokIcon />
                  </div>
                </a>
                <a
                  href="https://linkedin.com/company/sharedminds"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-blue-700 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg"
                  aria-label="Follow us on LinkedIn"
                >
                  <Linkedin className="w-5 h-5 text-slate-300 hover:text-white transition-colors" />
                </a>
              </div>
            </div>
            <a href="mailto:support@sharedminds.app" className="text-slate-400 hover:text-blue-400 transition-colors text-sm">
              support@sharedminds.app
            </a>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Platform</h3>
            <ul className="space-y-3">
              <li>
                <a href="#guardrails" className="text-slate-400 hover:text-blue-400 transition-colors">
                  GuardRails
                </a>
              </li>
              <li>
                <a href="#spaces" className="text-slate-400 hover:text-blue-400 transition-colors">
                  Spaces
                </a>
              </li>
              <li>
                <a href="#regulation" className="text-slate-400 hover:text-blue-400 transition-colors">
                  Regulation
                </a>
              </li>
              <li>
                <a href="#use-cases" className="text-slate-400 hover:text-blue-400 transition-colors">
                  Use Cases
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <a href="#why" className="text-slate-400 hover:text-blue-400 transition-colors">
                  Why SharedMinds exists
                </a>
              </li>
              <li>
                <a href="#privacy" className="text-slate-400 hover:text-blue-400 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="text-slate-400 hover:text-blue-400 transition-colors">
                  Terms of Service
                </a>
              </li>
              <li className="text-slate-500 text-sm">
                Early-stage project
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} SharedMinds. All rights reserved.
          </p>
          <p className="text-slate-400 text-sm">
            Built with care for neurodivergent minds.
          </p>
        </div>
      </div>
    </footer>
  );
}

function WhySharedMindsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleNavigateHome = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.hash = '';
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/60 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="#" onClick={handleNavigateHome} className="flex items-center gap-2.5 group">
              <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-10 h-10 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-white text-lg">SharedMinds</span>
            </a>
            <a href="#" onClick={handleNavigateHome} className="text-sm text-slate-300 hover:text-cyan-400 transition-colors font-medium">
              Return home
            </a>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative py-20 sm:py-28 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
          <div className="absolute inset-0 opacity-40">
            <NeuralNetworkBackground />
          </div>
          <div className="absolute inset-0 opacity-50">
            <ThoughtFlowBackground />
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/70"></div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-8 sm:p-12 border border-cyan-500/20 shadow-2xl">
              <div className="flex justify-center mb-8">
                <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-24 h-24 sm:w-32 sm:h-32" />
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 mb-8 tracking-tight leading-tight animate-[slideInLeft_1s_ease-out]" style={{ textShadow: '0 0 40px rgba(34, 211, 238, 0.3)' }}>
                Why SharedMinds exists
              </h1>
              <p className="text-2xl sm:text-3xl text-white mb-8 leading-relaxed animate-[slideInLeft_1s_ease-out_0.2s] opacity-0 drop-shadow-lg" style={{ animationFillMode: 'forwards', textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)' }}>
                Most tools weren't designed for how people actually think — or how real life actually works.
              </p>
              <p className="text-xl text-slate-100 leading-relaxed animate-[fadeIn_1s_ease-out_0.4s] opacity-0 drop-shadow-md" style={{ animationFillMode: 'forwards', textShadow: '0 1px 8px rgba(0, 0, 0, 0.5)' }}>
                Modern life, work, and collaboration are complex, non-linear, and interconnected. Yet most tools still assume everyone thinks in straight lines, maintains stable focus, and operates with clear priorities. That mismatch creates friction for almost everyone — and it's especially intense for people whose minds work differently.
              </p>
            </div>
          </div>
        </section>

        <section className="relative py-20 sm:py-24 bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.15),transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(59,130,246,0.15),transparent_70%)]"></div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400 mb-12 text-center animate-[scaleIn_0.8s_ease-out]">
              The problem isn't motivation. It's mismatch.
            </h2>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-3xl p-8 lg:p-10 border-2 border-slate-700/50 shadow-2xl hover:shadow-rose-500/20 transition-all duration-500 hover:scale-[1.02] animate-[slideInLeft_0.8s_ease-out_0.2s] opacity-0" style={{ animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-400/30">
                    <AlertCircle className="w-7 h-7 text-rose-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Most tools assume</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 group">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-rose-400 to-orange-400 mt-2.5 flex-shrink-0 group-hover:scale-150 transition-transform"></div>
                    <p className="text-lg text-slate-300 group-hover:text-white transition-colors">Linear thinking and predictable progress</p>
                  </li>
                  <li className="flex items-start gap-3 group">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-rose-400 to-orange-400 mt-2.5 flex-shrink-0 group-hover:scale-150 transition-transform"></div>
                    <p className="text-lg text-slate-300 group-hover:text-white transition-colors">Stable focus and consistent energy</p>
                  </li>
                  <li className="flex items-start gap-3 group">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-rose-400 to-orange-400 mt-2.5 flex-shrink-0 group-hover:scale-150 transition-transform"></div>
                    <p className="text-lg text-slate-300 group-hover:text-white transition-colors">Clear priorities that stay clear</p>
                  </li>
                  <li className="flex items-start gap-3 group">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-rose-400 to-orange-400 mt-2.5 flex-shrink-0 group-hover:scale-150 transition-transform"></div>
                    <p className="text-lg text-slate-300 group-hover:text-white transition-colors">Predictable capacity and rhythm</p>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-blue-900/90 to-cyan-900/90 backdrop-blur-sm rounded-3xl p-8 lg:p-10 border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-500 hover:scale-[1.02] animate-[slideInRight_0.8s_ease-out_0.2s] opacity-0" style={{ animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 animate-[pulse-glow_3s_ease-in-out_infinite]">
                    <Heart className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Real life involves</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 group">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 mt-2.5 flex-shrink-0 group-hover:scale-150 transition-transform"></div>
                    <p className="text-lg text-cyan-100 group-hover:text-white transition-colors">Overlapping responsibilities and contexts</p>
                  </li>
                  <li className="flex items-start gap-3 group">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 mt-2.5 flex-shrink-0 group-hover:scale-150 transition-transform"></div>
                    <p className="text-lg text-cyan-100 group-hover:text-white transition-colors">Shifting priorities and interruptions</p>
                  </li>
                  <li className="flex items-start gap-3 group">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 mt-2.5 flex-shrink-0 group-hover:scale-150 transition-transform"></div>
                    <p className="text-lg text-cyan-100 group-hover:text-white transition-colors">Cognitive load and mental fatigue</p>
                  </li>
                  <li className="flex items-start gap-3 group">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 mt-2.5 flex-shrink-0 group-hover:scale-150 transition-transform"></div>
                    <p className="text-lg text-cyan-100 group-hover:text-white transition-colors">Collaboration and context loss</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-20 sm:py-24 bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-[float_20s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-[float_25s_ease-in-out_infinite_5s]"></div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 mb-10 text-center animate-[scaleIn_0.8s_ease-out]">
              People don't think in straight lines
            </h2>

            <div className="space-y-8">
              <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-500 hover:scale-[1.02] animate-[fadeIn_0.8s_ease-out_0.2s] opacity-0" style={{ animationFillMode: 'forwards' }}>
                <h3 className="text-xl font-semibold text-emerald-100 mb-6">Humans think in:</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-300 hover:scale-105 group">
                    <Network className="w-5 h-5 text-emerald-400 group-hover:rotate-12 transition-transform" />
                    <span className="text-lg text-emerald-100 group-hover:text-white transition-colors">Connections</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 hover:border-teal-400/40 transition-all duration-300 hover:scale-105 group">
                    <Layers className="w-5 h-5 text-teal-400 group-hover:rotate-12 transition-transform" />
                    <span className="text-lg text-teal-100 group-hover:text-white transition-colors">Context</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:scale-105 group">
                    <GitBranch className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
                    <span className="text-lg text-cyan-100 group-hover:text-white transition-colors">Relationships</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:scale-105 group">
                    <Target className="w-5 h-5 text-blue-400 group-hover:rotate-12 transition-transform" />
                    <span className="text-lg text-blue-100 group-hover:text-white transition-colors">Evolving mental models</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-900/40 to-violet-900/40 backdrop-blur-sm rounded-2xl p-8 border-2 border-blue-500/30 shadow-2xl hover:shadow-blue-500/30 transition-all duration-500 hover:scale-[1.02] animate-[fadeIn_0.8s_ease-out_0.4s] opacity-0" style={{ animationFillMode: 'forwards' }}>
                <h3 className="text-xl font-semibold text-blue-100 mb-4">This applies to:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 group">
                    <div className="p-1 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 mt-0.5">
                      <Check className="w-5 h-5 text-blue-400 flex-shrink-0 group-hover:scale-125 transition-transform" />
                    </div>
                    <p className="text-lg text-blue-100 group-hover:text-white transition-colors">Neurodivergent thinkers navigating executive function challenges</p>
                  </li>
                  <li className="flex items-start gap-3 group">
                    <div className="p-1 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 mt-0.5">
                      <Check className="w-5 h-5 text-violet-400 flex-shrink-0 group-hover:scale-125 transition-transform" />
                    </div>
                    <p className="text-lg text-blue-100 group-hover:text-white transition-colors">Neurotypical thinkers managing complex work and life</p>
                  </li>
                  <li className="flex items-start gap-3 group">
                    <div className="p-1 rounded-lg bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 mt-0.5">
                      <Check className="w-5 h-5 text-purple-400 flex-shrink-0 group-hover:scale-125 transition-transform" />
                    </div>
                    <p className="text-lg text-blue-100 group-hover:text-white transition-colors">Creatives, founders, and independent workers</p>
                  </li>
                  <li className="flex items-start gap-3 group">
                    <div className="p-1 rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 mt-0.5">
                      <Check className="w-5 h-5 text-fuchsia-400 flex-shrink-0 group-hover:scale-125 transition-transform" />
                    </div>
                    <p className="text-lg text-blue-100 group-hover:text-white transition-colors">Teams, households, and collaborative groups</p>
                  </li>
                </ul>
              </div>

              <div className="relative bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-amber-500/50 shadow-2xl overflow-hidden animate-[fadeIn_0.8s_ease-out_0.6s] opacity-0" style={{ animationFillMode: 'forwards' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 animate-[shimmer_3s_linear_infinite]" style={{ backgroundSize: '200% 100%' }}></div>
                <p className="text-lg text-amber-100 leading-relaxed italic relative z-10">
                  <span className="font-semibold text-amber-300">Important:</span> Neurodivergent users often feel the mismatch more intensely — but the mismatch exists for almost everyone.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-20 sm:py-24 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-10 right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-[float_18s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-10 left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-[float_22s_ease-in-out_infinite_4s]"></div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 mb-10 text-center animate-[scaleIn_0.8s_ease-out]">
              A different approach to thinking, planning, and collaboration
            </h2>

            <div className="space-y-6">
              <p className="text-xl text-blue-100 leading-relaxed animate-[fadeIn_0.8s_ease-out_0.2s] opacity-0" style={{ animationFillMode: 'forwards' }}>
                SharedMinds is designed to:
              </p>

              <div className="grid gap-6">
                <div className="flex items-start gap-4 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/20 group">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30">
                    <Shield className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-100 mb-2 group-hover:text-white transition-colors">Hold complexity without collapsing</h3>
                    <p className="text-base text-slate-300 leading-relaxed group-hover:text-slate-200 transition-colors">
                      Support multiple contexts, priorities, and perspectives without forcing everything into a single view or hierarchy.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-gradient-to-r from-violet-900/40 to-purple-900/40 backdrop-blur-sm rounded-2xl p-6 border border-violet-500/30 hover:border-violet-400/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/20 group">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-400/30">
                    <Layers className="w-6 h-6 text-violet-400 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-violet-100 mb-2 group-hover:text-white transition-colors">Preserve context</h3>
                    <p className="text-base text-slate-300 leading-relaxed group-hover:text-slate-200 transition-colors">
                      Keep the why behind decisions visible, so you don't lose track of intent when priorities shift.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-gradient-to-r from-fuchsia-900/40 to-pink-900/40 backdrop-blur-sm rounded-2xl p-6 border border-fuchsia-500/30 hover:border-fuchsia-400/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-fuchsia-500/20 group">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 border border-fuchsia-400/30">
                    <Wind className="w-6 h-6 text-fuchsia-400 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-fuchsia-100 mb-2 group-hover:text-white transition-colors">Support structure and flexibility</h3>
                    <p className="text-base text-slate-300 leading-relaxed group-hover:text-slate-200 transition-colors">
                      Provide clarity and guidance without rigidity — helping you move forward without forcing a single path.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-gradient-to-r from-cyan-900/40 to-teal-900/40 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/20 group">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-400/30">
                    <Eye className="w-6 h-6 text-cyan-400 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-cyan-100 mb-2 group-hover:text-white transition-colors">Make thinking visible and shareable</h3>
                    <p className="text-base text-slate-300 leading-relaxed group-hover:text-slate-200 transition-colors">
                      Help individuals and teams understand how different minds see the same situation — reducing friction and building trust.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-gradient-to-r from-blue-900/50 to-violet-900/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-blue-500/30 shadow-xl animate-[fadeIn_0.8s_ease-out_0.6s] opacity-0" style={{ animationFillMode: 'forwards' }}>
                <p className="text-base text-blue-100 leading-relaxed italic">
                  This isn't about adding features or chasing productivity hacks. It's about designing systems that respect how thinking actually works — for everyone.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-20 sm:py-24 bg-gradient-to-br from-slate-900 via-pink-900/20 to-slate-900 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-[float_24s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl animate-[float_20s_ease-in-out_infinite_6s]"></div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 mb-10 text-center animate-[scaleIn_0.8s_ease-out]">
              Built for different minds — and shared realities
            </h2>

            <div className="space-y-6 mb-10">
              <p className="text-xl text-pink-100 leading-relaxed animate-[fadeIn_0.8s_ease-out_0.2s] opacity-0" style={{ animationFillMode: 'forwards' }}>
                SharedMinds is for:
              </p>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-blue-500/30 hover:border-blue-400/50 hover:scale-[1.02] transition-all duration-500 hover:shadow-blue-500/20 group">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30">
                      <Users className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-100 mb-1 group-hover:text-white transition-colors">Individuals managing complex lives</h3>
                      <p className="text-base text-slate-300 group-hover:text-slate-200 transition-colors">Balancing work, personal projects, family responsibilities, and self-care.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-violet-900/40 to-fuchsia-900/40 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-violet-500/30 hover:border-violet-400/50 hover:scale-[1.02] transition-all duration-500 hover:shadow-violet-500/20 group">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-400/30">
                      <Brain className="w-6 h-6 text-violet-400 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-violet-100 mb-1 group-hover:text-white transition-colors">Neurodivergent users</h3>
                      <p className="text-base text-slate-300 group-hover:text-slate-200 transition-colors">People with ADHD, autism, executive function challenges, or non-linear thinking patterns.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-emerald-500/30 hover:border-emerald-400/50 hover:scale-[1.02] transition-all duration-500 hover:shadow-emerald-500/20 group">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30">
                      <Compass className="w-6 h-6 text-emerald-400 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-emerald-100 mb-1 group-hover:text-white transition-colors">Neurotypical users seeking flexible systems</h3>
                      <p className="text-base text-slate-300 group-hover:text-slate-200 transition-colors">Anyone who finds rigid tools frustrating or limiting.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-amber-500/30 hover:border-amber-400/50 hover:scale-[1.02] transition-all duration-500 hover:shadow-amber-500/20 group">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/30">
                      <Sparkles className="w-6 h-6 text-amber-400 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-amber-100 mb-1 group-hover:text-white transition-colors">Founders, creators, and freelancers</h3>
                      <p className="text-base text-slate-300 group-hover:text-slate-200 transition-colors">Independent workers navigating uncertainty, creativity, and execution simultaneously.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-rose-900/40 to-pink-900/40 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-rose-500/30 hover:border-rose-400/50 hover:scale-[1.02] transition-all duration-500 hover:shadow-rose-500/20 group">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-400/30">
                      <Heart className="w-6 h-6 text-rose-400 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-rose-100 mb-1 group-hover:text-white transition-colors">Teams and households</h3>
                      <p className="text-base text-slate-300 group-hover:text-slate-200 transition-colors">Groups where different minds need to coordinate, collaborate, and understand each other.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm rounded-3xl p-8 lg:p-10 border-2 border-amber-500/50 shadow-2xl overflow-hidden animate-[scaleIn_0.8s_ease-out_0.6s] opacity-0" style={{ animationFillMode: 'forwards' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 animate-[shimmer_4s_linear_infinite]" style={{ backgroundSize: '200% 100%' }}></div>
              <p className="text-xl font-semibold text-amber-100 text-center leading-relaxed relative z-10">
                You don't need a diagnosis to benefit from tools that respect how thinking actually works.
              </p>
            </div>
          </div>
        </section>

        <section className="relative py-20 sm:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <NeuralNetworkBackground />
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 mb-10 text-center animate-[scaleIn_0.8s_ease-out]">
              About the founder
            </h2>

            <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-10 animate-[fadeIn_0.8s_ease-out_0.2s] opacity-0" style={{ animationFillMode: 'forwards' }}>
              <div className="flex-shrink-0 mx-auto md:mx-0 group">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition-opacity"></div>
                  <img
                    src="/founders_profile_picture.jpg"
                    alt="Matthew, founder of SharedMinds"
                    className="relative w-56 h-56 rounded-2xl object-cover shadow-2xl border-4 border-slate-700/50"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="prose prose-lg max-w-none">
                  <div className="space-y-6 text-slate-300 leading-relaxed">
                    <p className="text-lg text-cyan-100">
                      SharedMinds was created by Matthew, a solo founder who spent most of his life believing he was simply disorganised — that the way his mind worked was just "how he was."
                    </p>

                    <p className="text-lg">
                      For years, he tried to adapt to systems that promised clarity and control. Task managers, planners, productivity frameworks. Some helped briefly, most didn't. They never seemed to address the real problem — and because the problem wasn't obvious, it was hard to even name what was missing.
                    </p>

                    <p className="text-lg">
                      What Matthew did know was that he thought differently. He noticed patterns others missed. He connected ideas intuitively. He understood systems as living, interconnected things rather than neat hierarchies. But translating that way of thinking into tools designed for linear workflows always felt forced and incomplete.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="prose prose-lg max-w-none animate-[fadeIn_0.8s_ease-out_0.4s] opacity-0" style={{ animationFillMode: 'forwards' }}>
              <div className="space-y-6 text-slate-300 leading-relaxed">
                <p className="text-lg">
                  It wasn't until much later — through reflection, research, and lived experience — that the underlying issue became clearer: executive function. Not a lack of effort or intelligence, but difficulty with task initiation, context switching, and holding multiple moving parts in mind at once.
                </p>

                <p className="text-lg text-blue-100">
                  Once that clicked, something else became obvious. The tools weren't failing because he was using them wrong — they were failing because they weren't designed for how his mind actually worked.
                </p>

                <p className="text-lg">
                  SharedMinds began as a way to cope with that reality. A way to externalise thinking, reduce cognitive load, and create systems that could hold complexity without collapsing. Over time, it became clear that this wasn't a personal problem at all. Many people — neurodivergent and neurotypical alike — struggle daily with the same invisible friction.
                </p>

                <p className="text-lg text-violet-100 font-semibold">
                  SharedMinds exists to meet that gap.
                </p>

                <div className="relative bg-gradient-to-br from-blue-900/50 to-violet-900/50 backdrop-blur-sm rounded-2xl p-8 mt-8 border-2 border-blue-500/50 shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-violet-500/10 animate-[shimmer_3s_linear_infinite]" style={{ backgroundSize: '200% 100%' }}></div>
                  <p className="text-lg text-blue-100 font-medium italic relative z-10">
                    Not by forcing people to think differently — but by building systems that finally adapt to how people already think.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-20 sm:py-28 bg-gradient-to-br from-slate-900 via-blue-900/30 to-slate-900 overflow-hidden">
          <ThoughtFlowBackground />

          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-violet-500/20 rounded-full blur-3xl animate-[float_15s_ease-in-out_infinite]"></div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 mb-8 tracking-tight animate-[scaleIn_0.8s_ease-out]">
              This isn't about doing more. It's about understanding better.
            </h2>

            <p className="text-xl sm:text-2xl text-cyan-100 mb-12 leading-relaxed max-w-3xl mx-auto animate-[fadeIn_0.8s_ease-out_0.2s] opacity-0" style={{ animationFillMode: 'forwards' }}>
              SharedMinds is about clarity, compassion, and building systems that work with how people actually think — not against it.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-[fadeIn_0.8s_ease-out_0.4s] opacity-0" style={{ animationFillMode: 'forwards' }}>
              <a
                href="#"
                onClick={handleNavigateHome}
                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white rounded-full font-semibold text-lg shadow-lg shadow-blue-500/50 hover:shadow-2xl hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-500"
                style={{ backgroundSize: '200% 100%' }}
              >
                <span>Explore how SharedMinds works</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="#"
                onClick={handleNavigateHome}
                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-800/50 backdrop-blur-sm text-cyan-100 rounded-full font-semibold text-lg border-2 border-cyan-500/30 hover:border-cyan-400/50 hover:bg-slate-800/70 transition-all duration-300 hover:scale-105"
              >
                Return to the home page
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleNavigateHome = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.hash = '';
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="#" onClick={handleNavigateHome} className="flex items-center gap-2.5 text-xl font-semibold text-blue-600">
              <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-10 h-10" />
              SharedMinds
            </a>
            <a href="#" onClick={handleNavigateHome} className="text-slate-600 hover:text-blue-600 transition-colors font-medium">
              Back to home
            </a>
          </div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h1 className="text-4xl font-bold text-slate-900 mb-12">Privacy Policy</h1>

        <div className="space-y-8">
          <section className="bg-white rounded-3xl border border-slate-200/60 p-8 md:p-10 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              What we collect
            </h2>
            <p className="text-slate-600 leading-relaxed">
              When you join our waitlist, we collect your email address and any optional
              preferences you indicate (such as interest in beta access or collaboration).
            </p>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200/60 p-8 md:p-10 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Why we collect it
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We use your email address solely to notify you about SharedMinds updates,
              launch information, and early access opportunities. We will not share your
              information with third parties or use it for any other purpose.
            </p>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200/60 p-8 md:p-10 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Your rights
            </h2>
            <p className="text-slate-600 leading-relaxed">
              You can request to be removed from the waitlist at any time, or request deletion
              of your data. Simply contact us at the email below.
            </p>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200/60 p-8 md:p-10 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Contact
            </h2>
            <p className="text-slate-600 leading-relaxed">
              For any privacy-related questions or requests, please contact us at{' '}
              <a href="mailto:support@sharedminds.app" className="text-blue-600 hover:text-blue-700 font-medium">
                support@sharedminds.app
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SpacesPage() {
  const [widgets, setWidgets] = useState({
    note: { x: 5, y: 8, rotation: -3 },
    calendar: { x: 68, y: 0, rotation: 2 },
    leaf: { x: 48, y: 180, rotation: 8 },
    grocery: { x: 8, y: 280, rotation: 1 },
    bell: { x: 35, y: 140, rotation: -8 },
    meal: { x: 72, y: 360, rotation: -2 },
    achievements: { x: 18, y: 460, rotation: 3 },
    insight: { x: 58, y: 520, rotation: -4 },
    goal: { x: 42, y: 420, rotation: 2 },
    newGroup: { x: 15, y: 100, rotation: -5 },
  });

  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [groceryItems, setGroceryItems] = useState([
    { id: 1, text: 'Organic milk', checked: false },
    { id: 2, text: 'Free-range eggs', checked: false },
    { id: 3, text: 'Sourdough bread', checked: false },
    { id: 4, text: 'Fresh spinach', checked: false },
    { id: 5, text: 'Cherry tomatoes', checked: false },
  ]);
  const [newGroceryItem, setNewGroceryItem] = useState('');

  const [noteText, setNoteText] = useState('Just one thing today: call the dentist. Even if it\'s just to leave a message. That counts as done. You can figure out the rest later.');
  const [isEditingNote, setIsEditingNote] = useState(false);

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleNavigateHome = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.hash = '';
    window.scrollTo(0, 0);
  };

  const handleMouseDown = (e: React.MouseEvent, widgetId: string) => {
    const container = (e.target as HTMLElement).closest('.widget-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const parentRect = container.parentElement?.getBoundingClientRect();

    if (!parentRect) return;

    setDragging(widgetId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;

    const container = document.querySelector('.spaces-canvas');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = e.clientY - rect.top - dragOffset.y;

    setWidgets(prev => ({
      ...prev,
      [dragging]: {
        ...prev[dragging as keyof typeof prev],
        x: Math.max(0, Math.min(85, x)),
        y: Math.max(0, Math.min(550, y))
      }
    }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const toggleGroceryItem = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setGroceryItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const addGroceryItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (newGroceryItem.trim()) {
      setGroceryItems(prev => [
        ...prev,
        { id: Date.now(), text: newGroceryItem, checked: false }
      ]);
      setNewGroceryItem('');
    }
  };

  const deleteGroceryItem = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setGroceryItems(prev => prev.filter(item => item.id !== id));
  };

  const handleNoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingNote(true);
  };

  const handleNoteBlur = () => {
    setIsEditingNote(false);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteText(e.target.value);
  };

  const handleDateClick = (date: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(date);
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const navigateMonth = (direction: number, e: React.MouseEvent) => {
    e.stopPropagation();
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const goToToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    setSelectedDate(today.getDate());
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="#" onClick={handleNavigateHome} className="flex items-center gap-2.5 group">
              <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-10 h-10 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-slate-900 text-lg">SharedMinds</span>
            </a>
            <a href="#" onClick={handleNavigateHome} className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">
              Return home
            </a>
          </div>
        </nav>
      </header>

      <section className="relative py-32 sm:py-40 overflow-hidden bg-[#FAF7F2]">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `
            linear-gradient(to right, #E5DDD0 1px, transparent 1px),
            linear-gradient(to bottom, #E5DDD0 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16 relative z-10">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 tracking-tight leading-tight">
              Spaces
            </h1>
            <p className="text-2xl sm:text-3xl text-slate-700 leading-relaxed max-w-3xl mx-auto font-light">
              Flexible canvases for thinking, planning, and shared life
            </p>
          </div>

          <div
            className="relative h-[600px] max-w-6xl mx-auto spaces-canvas"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="widget-container absolute w-56 bg-[#FFF9C4] rounded-3xl shadow-lg p-6 transform transition-transform duration-300 border-2 border-yellow-200 cursor-move hover:shadow-2xl"
              style={{
                left: `${widgets.note.x}%`,
                top: `${widgets.note.y}px`,
                rotate: `${dragging === 'note' ? 0 : widgets.note.rotation}deg`,
                zIndex: dragging === 'note' ? 50 : 10
              }}
              onMouseDown={(e) => handleMouseDown(e, 'note')}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-yellow-300 rounded-lg flex items-center justify-center">
                  <StickyNote className="w-4 h-4 text-yellow-700" />
                </div>
                <Star className="w-4 h-4 text-yellow-500 ml-auto" />
              </div>
              {isEditingNote ? (
                <textarea
                  className="text-sm text-slate-700 leading-relaxed w-full bg-transparent border-none outline-none resize-none"
                  value={noteText}
                  onChange={handleNoteChange}
                  onBlur={handleNoteBlur}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  rows={4}
                />
              ) : (
                <p
                  className="text-sm text-slate-700 leading-relaxed cursor-text hover:bg-yellow-100/50 rounded p-1 -m-1"
                  onClick={handleNoteClick}
                >
                  {noteText}
                </p>
              )}
            </div>

            <div
              className="widget-container absolute w-80 bg-white rounded-3xl shadow-xl p-6 transform transition-transform duration-300 border-2 border-blue-200 cursor-move hover:shadow-2xl"
              style={{
                left: `${widgets.calendar.x}%`,
                top: `${widgets.calendar.y}px`,
                rotate: `${dragging === 'calendar' ? 0 : widgets.calendar.rotation}deg`,
                zIndex: dragging === 'calendar' ? 50 : 10
              }}
              onMouseDown={(e) => handleMouseDown(e, 'calendar')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-slate-800">Calendar</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={goToToday}
                    className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center hover:bg-emerald-600 transition-colors"
                    title="Go to today"
                  >
                    <CheckCircle className="w-4 h-4 text-white" />
                  </button>
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                    <Layout className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 mb-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={(e) => navigateMonth(-1, e)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex flex-col items-center">
                    <div className="text-lg font-bold">{monthNames[selectedMonth]} {selectedYear}</div>
                  </div>
                  <button
                    onClick={(e) => navigateMonth(1, e)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-center text-sm opacity-90">
                  Selected: {monthNames[selectedMonth]} {selectedDate}, {selectedYear}
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-xs text-slate-600 mb-2 font-semibold">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center py-1">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-xs">
                {(() => {
                  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
                  const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
                  const todayDate = new Date();
                  const isCurrentMonth = selectedMonth === todayDate.getMonth() && selectedYear === todayDate.getFullYear();
                  const todayDay = todayDate.getDate();

                  const cells = [];

                  for (let i = 0; i < firstDay; i++) {
                    cells.push(<div key={`empty-${i}`} className="text-center py-2"></div>);
                  }

                  for (let day = 1; day <= daysInMonth; day++) {
                    const isSelected = day === selectedDate && selectedMonth === selectedMonth;
                    const isToday = isCurrentMonth && day === todayDay;

                    cells.push(
                      <div
                        key={day}
                        className={`text-center py-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-500 text-white font-bold shadow-md scale-110'
                            : isToday
                            ? 'bg-emerald-100 text-emerald-800 font-semibold ring-2 ring-emerald-400'
                            : 'text-slate-700 hover:bg-blue-50 hover:scale-105'
                        }`}
                        onClick={(e) => handleDateClick(day, e)}
                      >
                        {day}
                      </div>
                    );
                  }

                  return cells;
                })()}
              </div>
            </div>

            <div
              className="widget-container absolute w-48 h-48 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full shadow-2xl flex items-center justify-center transform transition-all duration-300 cursor-move hover:shadow-2xl"
              style={{
                left: `${widgets.leaf.x}%`,
                top: `${widgets.leaf.y}px`,
                rotate: `${dragging === 'leaf' ? 0 : widgets.leaf.rotation}deg`,
                scale: dragging === 'leaf' ? '1.1' : '1',
                zIndex: dragging === 'leaf' ? 50 : 10
              }}
              onMouseDown={(e) => handleMouseDown(e, 'leaf')}
            >
              <Leaf className="w-24 h-24 text-white" strokeWidth={1.5} />
            </div>

            <div
              className="widget-container absolute w-64 bg-[#B3F0E6] rounded-3xl shadow-lg p-6 transform transition-transform duration-300 border-2 border-cyan-300 cursor-move hover:shadow-2xl"
              style={{
                left: `${widgets.grocery.x}%`,
                top: `${widgets.grocery.y}px`,
                rotate: `${dragging === 'grocery' ? 0 : widgets.grocery.rotation}deg`,
                zIndex: dragging === 'grocery' ? 50 : 10
              }}
              onMouseDown={(e) => handleMouseDown(e, 'grocery')}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-slate-800">Grocery List</span>
                <div className="ml-auto w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {groceryItems.filter(item => !item.checked).length}
                </div>
              </div>
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {groceryItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm group">
                    <div
                      className={`w-4 h-4 border-2 rounded cursor-pointer flex items-center justify-center transition-colors ${
                        item.checked
                          ? 'bg-cyan-600 border-cyan-600'
                          : 'border-cyan-600 hover:bg-cyan-100'
                      }`}
                      onClick={(e) => toggleGroceryItem(item.id, e)}
                    >
                      {item.checked && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`flex-1 ${item.checked ? 'line-through text-slate-500' : 'text-slate-700'}`}>
                      {item.text}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                      onClick={(e) => deleteGroceryItem(item.id, e)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={newGroceryItem}
                  onChange={(e) => setNewGroceryItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addGroceryItem(e as any);
                  }}
                  placeholder="Add item..."
                  className="flex-1 px-2 py-1 text-sm border border-cyan-300 rounded bg-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={addGroceryItem}
                  className="px-3 py-1 bg-cyan-500 text-white rounded text-sm hover:bg-cyan-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className="widget-container absolute w-16 h-16 bg-pink-100 rounded-2xl shadow-lg flex items-center justify-center transform transition-all duration-300 cursor-move hover:shadow-2xl"
              style={{
                left: `${widgets.bell.x}%`,
                top: `${widgets.bell.y}px`,
                rotate: `${dragging === 'bell' ? 0 : widgets.bell.rotation}deg`,
                scale: dragging === 'bell' ? '1.1' : '1',
                zIndex: dragging === 'bell' ? 50 : 10
              }}
              onMouseDown={(e) => handleMouseDown(e, 'bell')}
            >
              <Bell className="w-8 h-8 text-pink-500" />
            </div>

            <div
              className="widget-container absolute w-60 bg-[#FFE0B3] rounded-3xl shadow-lg p-5 transform transition-transform duration-300 border-2 border-orange-200 cursor-move hover:shadow-2xl"
              style={{
                left: `${widgets.meal.x}%`,
                top: `${widgets.meal.y}px`,
                rotate: `${dragging === 'meal' ? 0 : widgets.meal.rotation}deg`,
                zIndex: dragging === 'meal' ? 50 : 10
              }}
              onMouseDown={(e) => handleMouseDown(e, 'meal')}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-slate-800">Meal Plan</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="py-1.5 border-b border-orange-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-700 font-medium">Mon</span>
                    <span className="text-orange-600">3/3</span>
                  </div>
                  <p className="text-xs text-slate-600">Avocado toast, Pasta primavera, Salmon</p>
                </div>
                <div className="py-1.5 border-b border-orange-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-700 font-medium">Tue</span>
                    <span className="text-orange-600">2/3</span>
                  </div>
                  <p className="text-xs text-slate-600">Smoothie bowl, Thai curry</p>
                </div>
                <div className="py-1.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-700 font-medium">Wed</span>
                    <span className="text-orange-600">3/3</span>
                  </div>
                  <p className="text-xs text-slate-600">Yogurt parfait, Salad, Tacos</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">+4 more days</p>
            </div>

            <div
              className="widget-container absolute w-56 bg-white rounded-3xl shadow-lg p-5 transform transition-transform duration-300 border-2 border-slate-200 cursor-move hover:shadow-2xl"
              style={{
                left: `${widgets.achievements.x}%`,
                top: `${widgets.achievements.y}px`,
                rotate: `${dragging === 'achievements' ? 0 : widgets.achievements.rotation}deg`,
                zIndex: dragging === 'achievements' ? 50 : 10
              }}
              onMouseDown={(e) => handleMouseDown(e, 'achievements')}
            >
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-slate-800 text-sm">Achievements</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-amber-50 rounded-lg p-2">
                  <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800">Early Bird</p>
                    <p className="text-xs text-slate-500">7-day streak</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2">
                  <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800">Task Master</p>
                    <p className="text-xs text-slate-500">50 tasks done</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-2">
                  <div className="w-8 h-8 bg-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800">Team Player</p>
                    <p className="text-xs text-slate-500">Shared 10 items</p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="widget-container absolute w-52 bg-[#E6D5F5] rounded-3xl shadow-lg p-4 transform transition-transform duration-300 border-2 border-purple-200 cursor-move hover:shadow-2xl"
              style={{
                left: `${widgets.insight.x}%`,
                top: `${widgets.insight.y}px`,
                rotate: `${dragging === 'insight' ? 0 : widgets.insight.rotation}deg`,
                zIndex: dragging === 'insight' ? 50 : 10
              }}
              onMouseDown={(e) => handleMouseDown(e, 'insight')}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-slate-800 text-sm">Insight</span>
              </div>
              <div className="bg-purple-100 rounded-lg px-3 py-2 mb-2">
                <p className="text-xs text-purple-700 leading-relaxed">You're most productive on Tuesday mornings - 73% of your tasks get completed before noon on Tuesdays</p>
              </div>
              <div className="inline-block bg-purple-200 rounded-full px-3 py-1">
                <p className="text-xs text-purple-800">productivity</p>
              </div>
            </div>

            <div
              className="widget-container absolute w-52 bg-emerald-100 rounded-3xl shadow-lg p-5 transform transition-transform duration-300 border-2 border-emerald-200 cursor-move hover:shadow-2xl"
              style={{
                left: `${widgets.goal.x}%`,
                top: `${widgets.goal.y}px`,
                rotate: `${dragging === 'goal' ? 0 : widgets.goal.rotation}deg`,
                zIndex: dragging === 'goal' ? 50 : 10
              }}
              onMouseDown={(e) => handleMouseDown(e, 'goal')}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-slate-800">Goal</span>
              </div>
              <p className="text-sm text-slate-800 font-medium mb-3">Run 100 miles this month</p>
              <div className="bg-white rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-600">Progress</span>
                  <span className="text-xs font-semibold text-emerald-600">67%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                </div>
                <p className="text-xs text-slate-600 text-center">67 / 100 miles</p>
              </div>
            </div>

            <div
              className="widget-container absolute w-56 bg-white rounded-3xl shadow-lg p-5 transform transition-transform duration-300 border-2 border-slate-200 cursor-move hover:shadow-2xl"
              style={{
                left: `${widgets.newGroup.x}%`,
                top: `${widgets.newGroup.y}px`,
                rotate: `${dragging === 'newGroup' ? 0 : widgets.newGroup.rotation}deg`,
                zIndex: dragging === 'newGroup' ? 50 : 10
              }}
              onMouseDown={(e) => handleMouseDown(e, 'newGroup')}
            >
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200">
                <Frame className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-800 text-sm">New Group</span>
                <button className="ml-auto text-slate-400 hover:text-slate-600">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-center py-8">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Layout className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-8 w-20 h-20 bg-gradient-to-br from-orange-400 to-blue-600 rounded-full shadow-2xl flex items-center justify-center z-20 hover:scale-110 transition-transform duration-300 cursor-pointer">
          <MessageCircle className="w-10 h-10 text-white" />
        </div>

        <div className="absolute top-[200px] left-[45%] w-3 h-3 bg-blue-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-[350px] right-[18%] w-2 h-2 bg-yellow-400 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-[200px] left-[25%] w-2.5 h-2.5 bg-pink-400 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '1s' }}></div>

        <svg className="absolute top-[50px] right-[35%] w-16 h-16 text-blue-300 opacity-40" viewBox="0 0 100 100" fill="none">
          <path d="M10,50 Q25,25 50,50 T90,50" stroke="currentColor" strokeWidth="3" fill="none" />
        </svg>

        <svg className="absolute bottom-[150px] left-[40%] w-20 h-20 text-emerald-300 opacity-40" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
        </svg>
      </section>

      <section className="relative py-20 sm:py-24 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(to right, rgb(203 213 225 / 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(203 213 225 / 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="space-y-6 text-lg text-slate-700 leading-relaxed">
            <p className="text-xl sm:text-2xl font-medium text-slate-900">
              Spaces are the heart of SharedMinds.
            </p>
            <p>
              They're open, visual canvases where thoughts, plans, and responsibilities can live outside your head — and evolve as life changes.
            </p>
            <p>
              Unlike traditional tools that force everything into lists or timelines, Spaces let you organise information spatially, visually, and contextually.
            </p>
            <p className="font-medium text-slate-900">
              You decide how structured or loose they are.
            </p>
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-24 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(to right, rgb(59 130 246 / 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(59 130 246 / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-8 sm:mb-12 text-center">
            What is a Space?
          </h2>
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-start">
            <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-blue-100 p-6 sm:p-8 lg:p-10 shadow-lg">
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed mb-4 sm:mb-6">
                A Space is an interactive canvas where you can place widgets, notes, plans, and context side by side.
              </p>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed mb-4 sm:mb-6">
                Think of it as:
              </p>
              <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                <li className="flex items-start gap-2 sm:gap-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full mt-2 sm:mt-2.5 flex-shrink-0"></div>
                  <span className="text-sm sm:text-base lg:text-lg text-slate-700">a whiteboard that remembers things</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-600 rounded-full mt-2 sm:mt-2.5 flex-shrink-0"></div>
                  <span className="text-sm sm:text-base lg:text-lg text-slate-700">a dashboard you can reshape at any time</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full mt-2 sm:mt-2.5 flex-shrink-0"></div>
                  <span className="text-sm sm:text-base lg:text-lg text-slate-700">a shared surface for thinking, not just tracking</span>
                </li>
              </ul>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed">
                Spaces work alone or together — and they integrate directly with GuardRails so planning and execution stay connected.
              </p>
            </div>
            <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-blue-100 p-6 sm:p-8 shadow-lg">
              <SpaceExplainer />
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-24 bg-white overflow-hidden">
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: `
            linear-gradient(to right, rgb(16 185 129 / 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(16 185 129 / 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}></div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border-2 border-emerald-200 p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center">
                  <Layout className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Personal Spaces
                </h2>
              </div>
              <p className="text-lg font-medium text-emerald-900 mb-6">
                Your private thinking environment
              </p>
              <p className="text-slate-700 leading-relaxed mb-6">
                Personal Spaces are just for you.
              </p>
              <p className="text-slate-700 leading-relaxed mb-6">
                They're designed for:
              </p>
              <ul className="space-y-2 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">thinking out loud</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">organising messy ideas</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">planning without pressure</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">reflecting, experimenting, and resetting</span>
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed italic">
                Nothing here needs to be "ready" or "presentable".
              </p>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  What you can do in a Personal Space
                </h3>
                <p className="text-slate-700 leading-relaxed mb-4">
                  Drop in widgets like:
                </p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                    <span>notes</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                    <span>tasks</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                    <span>goals</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                    <span>habits</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                    <span>calendars</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                    <span>reminders</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Move things around visually to match how you think</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Group ideas spatially instead of hierarchically</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Use it as a scratchpad, planner, or personal dashboard</span>
                  </li>
                </ul>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  How it connects to GuardRails
                </h3>
                <p className="text-slate-700 leading-relaxed mb-4">
                  Personal Spaces sync with GuardRails automatically:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-slate-700">Tasks placed in a Space can flow into Task Flow</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-slate-700">Projects can be visualised before being structured</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-slate-700">Focus Mode can reference what's in your Space</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-slate-700">Nothing gets "lost" when ideas turn into action</span>
                  </li>
                </ul>
                <p className="text-slate-800 font-medium italic">
                  This is where thinking becomes manageable before it becomes organised.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-24 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 overflow-hidden">
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: `
            linear-gradient(to right, rgb(99 102 241 / 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(99 102 241 / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}></div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 sm:p-10 text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  Shared Spaces
                </h2>
              </div>
              <p className="text-xl font-medium mb-6 text-blue-100">
                Shared understanding, not just shared files
              </p>
              <p className="text-blue-50 leading-relaxed mb-6">
                Shared Spaces are designed for coordination and collaboration — without the confusion that usually comes with it.
              </p>
              <p className="text-blue-50 leading-relaxed mb-6">
                They're ideal for:
              </p>
              <ul className="space-y-2 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-50">households</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-50">teams</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-50">creative collaborators</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-50">founders and co-builders</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-50">any situation where people need shared context</span>
                </li>
              </ul>
              <p className="text-blue-50 leading-relaxed">
                Instead of fragmented chats, documents, and to-do lists, Shared Spaces give everyone the same picture.
              </p>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  What makes Shared Spaces different
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Everyone sees the same information, laid out visually</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Conversations live next to the work they're about</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Decisions, notes, and plans stay connected</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Roles and permissions are clear, not implicit</span>
                  </li>
                </ul>
                <p className="text-slate-800 font-medium mt-6 italic">
                  You're not just sharing tasks — you're sharing understanding.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  Examples of Shared Spaces
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                    <span className="text-slate-700">A household planning space</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0"></div>
                    <span className="text-slate-700">A startup project canvas</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                    <span className="text-slate-700">A shared creative board</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0"></div>
                    <span className="text-slate-700">A coordination space for care, events, or logistics</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-24 bg-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `
            linear-gradient(to right, rgb(148 163 184 / 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(148 163 184 / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-8 sm:mb-12 text-center">
            Widgets: building blocks of a Space
          </h2>
          <WidgetPalette />
        </div>
      </section>

      <section className="relative py-20 sm:py-24 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: `
            linear-gradient(to right, rgb(100 116 139 / 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(100 116 139 / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-8 sm:mb-12 text-center">
            One system, two modes
          </h2>
          <SpacesModeToggle />
        </div>
      </section>

      <section className="relative py-20 sm:py-24 bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `
            linear-gradient(to right, rgb(148 163 184 / 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(148 163 184 / 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8">
            Why Spaces matter
          </h2>
          <div className="space-y-6 text-lg leading-relaxed">
            <p className="text-slate-300">
              Most organisation tools fail because they:
            </p>
            <ul className="space-y-3 ml-6">
              <li className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">force linear thinking</span>
              </li>
              <li className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">hide context</span>
              </li>
              <li className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">separate planning from execution</span>
              </li>
              <li className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">treat collaboration as an afterthought</span>
              </li>
            </ul>
            <p className="text-white font-medium text-xl pt-4">
              Spaces solve this by giving people a place to think together — or alone — without friction.
            </p>
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-24 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: `
            linear-gradient(to right, rgb(203 213 225 / 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(203 213 225 / 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8 text-center">
            Designed for different minds, useful for everyone
          </h2>
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-3xl p-8">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                Spaces are especially helpful for people who:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">think visually</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">struggle with working memory</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">manage multiple overlapping responsibilities</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">feel overwhelmed by rigid systems</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-3xl p-8">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                But they're just as valuable for:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">teams</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">families</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">planners</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">creatives</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">anyone managing complexity</span>
                </li>
              </ul>
            </div>
          </div>
          <p className="text-center text-xl font-medium text-slate-900 italic">
            Good systems help everyone. Great systems adapt.
          </p>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.2),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(6,182,212,0.2),transparent_60%)]"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Explore Spaces in SharedMinds
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            Join the waitlist to experience a calmer way to organise thinking and shared life.
          </p>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-700/50">
            <WaitlistForm />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function RegulationPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleNavigateHome = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.hash = '';
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="#" onClick={handleNavigateHome} className="flex items-center gap-2.5 group">
              <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-10 h-10 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-slate-900 text-lg">SharedMinds</span>
            </a>
            <a href="#" onClick={handleNavigateHome} className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">
              Return home
            </a>
          </div>
        </nav>
      </header>

      <main className="relative">
        <MindPatternBackground />
        <RegulationHero />
        <RegulationIsIsnt />
        <BehaviouralPatterns />

        <SignalsSection />

        <CognitiveContexts />
        <DailyAlignment />

        {/* Insights Section */}
        <section className="py-32 sm:py-40 bg-gradient-to-b from-white via-slate-50/30 to-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
                Insights, not analytics
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Instead of dashboards and scores, Regulation offers insights that help you reflect on what unfolded — compared with what you intended.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 mb-12">
              <div className="group bg-white/80 backdrop-blur-sm rounded-3xl p-8 border-2 border-slate-200/60 transition-all duration-500 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/30 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 transition-all duration-300 group-hover:bg-blue-100 group-hover:scale-110">
                  <Compass className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">How your attention moved</h3>
                <p className="text-slate-600 leading-relaxed">Understand where your focus went throughout the day.</p>
              </div>

              <div className="group bg-white/80 backdrop-blur-sm rounded-3xl p-8 border-2 border-slate-200/60 transition-all duration-500 hover:bg-white hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-100/30 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center mb-5 transition-all duration-300 group-hover:bg-cyan-100 group-hover:scale-110">
                  <Target className="w-7 h-7 text-cyan-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Building vs expanding</h3>
                <p className="text-slate-600 leading-relaxed">Notice when you're deepening work vs. spreading wider.</p>
              </div>

              <div className="group bg-white/80 backdrop-blur-sm rounded-3xl p-8 border-2 border-slate-200/60 transition-all duration-500 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/30 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 transition-all duration-300 group-hover:bg-blue-100 group-hover:scale-110">
                  <Shield className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">What support was around</h3>
                <p className="text-slate-600 leading-relaxed">See which GuardRails or structures were helpful.</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-3xl p-8 border-2 border-blue-100/60">
              <p className="text-center text-lg text-slate-800 font-medium leading-relaxed">
                Nothing here means you did anything wrong.
              </p>
            </div>
          </div>
        </section>

        <AIExplanation />

        {/* Who Regulation Is For */}
        <section className="py-32 sm:py-40 bg-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-20 text-center tracking-tight">
              Who Regulation is for
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="group bg-gradient-to-br from-blue-50/80 to-cyan-50/50 rounded-3xl p-10 border-2 border-blue-100/60 transition-all duration-500 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100/40 hover:-translate-y-2">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">For neurodivergent users</h3>
                <p className="text-lg text-slate-700 leading-relaxed">
                  Helps externalise executive load, reduce shame, and replace self-blame with understanding.
                </p>
              </div>

              <div className="group bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-3xl p-10 border-2 border-slate-200/80 transition-all duration-500 hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-2">
                <div className="w-14 h-14 rounded-2xl bg-slate-600 flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">For neurotypical users</h3>
                <p className="text-lg text-slate-700 leading-relaxed">
                  Supports clarity, reflection, and sustainable pace — especially in complex or collaborative work.
                </p>
              </div>

              <div className="group bg-gradient-to-br from-cyan-50/80 to-blue-50/50 rounded-3xl p-10 border-2 border-cyan-100/60 transition-all duration-500 hover:border-cyan-200 hover:shadow-2xl hover:shadow-cyan-100/40 hover:-translate-y-2">
                <div className="w-14 h-14 rounded-2xl bg-cyan-600 flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110">
                  <Network className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">For teams & households</h3>
                <p className="text-lg text-slate-700 leading-relaxed">
                  Creates shared awareness without micromanagement or pressure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How Regulation Fits */}
        <section className="py-32 sm:py-40 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-12 text-center tracking-tight">
              How Regulation fits with SharedMinds
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
              <a href="/guardrails" className="group flex items-center gap-4 bg-white rounded-3xl px-8 py-5 border-2 border-blue-200/60 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/30 hover:-translate-y-1 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <span className="font-semibold text-slate-900 text-lg">GuardRails</span>
              </a>

              <ArrowRight className="w-7 h-7 text-blue-400 rotate-90 sm:rotate-0 transition-transform duration-300" />

              <div className="group flex items-center gap-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl px-8 py-5 border-2 border-blue-300/60 shadow-md transition-all duration-300 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-100/40 hover:scale-105">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                  <Compass className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-slate-900 text-lg">Regulation</span>
              </div>

              <ArrowRight className="w-7 h-7 text-blue-400 rotate-90 sm:rotate-0 transition-transform duration-300" />

              <a href="/spaces" className="group flex items-center gap-4 bg-white rounded-3xl px-8 py-5 border-2 border-blue-200/60 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/30 hover:-translate-y-1 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                  <Layout className="w-6 h-6 text-blue-600" />
                </div>
                <span className="font-semibold text-slate-900 text-lg">Spaces</span>
              </a>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-10 border-2 border-slate-200/60">
              <p className="text-xl text-slate-700 text-center leading-relaxed">
                Regulation sits quietly alongside GuardRails and Spaces — offering orientation when things feel scattered, and stepping back when you don't need it.
              </p>
            </div>
          </div>
        </section>

        {/* Closing Section */}
        <section className="py-32 sm:py-40 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
          </div>

          <div className="relative max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-8 tracking-tight leading-tight">
              Regulation exists to support self-trust — not replace it.
            </h2>

            <p className="text-xl text-slate-600 mb-16 leading-relaxed max-w-3xl mx-auto">
              A quiet, observant layer that helps you see patterns, orient yourself, and respond with clarity — always on your terms.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <a
                href="#"
                onClick={handleNavigateHome}
                className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <span>Explore how SharedMinds works</span>
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </a>

              <a
                href="#use-cases"
                className="inline-flex items-center gap-2 px-10 py-5 bg-white text-slate-700 rounded-full font-semibold text-lg border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 shadow-sm hover:shadow-lg"
              >
                View use cases
              </a>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28 bg-gradient-to-br from-blue-900 via-slate-900 to-blue-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.2),transparent_60%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(6,182,212,0.2),transparent_60%)]"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Experience Regulation in SharedMinds
            </h2>
            <p className="text-xl text-blue-100 mb-10 leading-relaxed">
              Join the waitlist for a system that helps you stay grounded without losing autonomy.
            </p>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-700/50">
              <WaitlistForm />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function UseCasesPage() {
  const handleNavigateHome = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.hash = '';
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash && hash !== 'use-cases') {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  const useCases = [
    {
      id: 'households-families',
      title: 'Households & Families',
      problem: 'Managing a household means coordinating schedules, tracking shared responsibilities, making decisions together, and remembering who needs what when — all while everyone processes information differently and has different executive function capacities.',
      solution: 'SharedMinds helps families create shared visibility without demanding constant check-ins. GuardRails make expectations clear (who\'s picking up the kids, what needs to happen before bedtime). Spaces let each person organize their own tasks while keeping shared responsibilities visible. Regulation tools help everyone notice when things are getting overwhelming before they boil over.',
      icon: Users,
      gradientFrom: 'from-blue-600',
      gradientTo: 'to-cyan-600',
      imageUrl: 'https://images.pexels.com/photos/4260325/pexels-photo-4260325.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Family coordinating together',
    },
    {
      id: 'workplaces-teams',
      title: 'Workplaces & Teams',
      problem: 'Teams fail not because people don\'t care, but because different brains process the same project differently. What\'s obvious to one person is invisible to another. Misalignment compounds until someone burns out or communication breaks down completely.',
      solution: 'SharedMinds makes cognitive differences visible and workable. Spaces help teams understand how different people are tracking the same project. GuardRails clarify what "done" means and when to check in. Regulation awareness helps teams notice overload patterns before they cause conflict or turnover.',
      icon: Network,
      gradientFrom: 'from-emerald-600',
      gradientTo: 'to-teal-600',
      imageUrl: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Team collaborating in workplace',
    },
    {
      id: 'founders-startups',
      title: 'Founders & Startups',
      problem: 'Early-stage projects demand constant context-switching, unclear priorities, and decisions that affect everything downstream — all with limited time, unclear information, and the weight of getting it right. It\'s cognitively brutal, especially for neurodivergent founders.',
      solution: 'SharedMinds supports the kind of thinking that startup life demands: holding multiple possibilities at once, pivoting without losing context, and coordinating with co-founders or early team members who see the problem differently. It\'s built for people building something that doesn\'t exist yet.',
      icon: Zap,
      gradientFrom: 'from-amber-600',
      gradientTo: 'to-orange-600',
      imageUrl: 'https://images.pexels.com/photos/3184306/pexels-photo-3184306.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Startup founders working together',
    },
    {
      id: 'creators-freelancers',
      title: 'Creators & Freelancers',
      problem: 'Creative work isn\'t linear. Ideas branch, projects overlap, client needs shift, and the administrative work of being your own business is constant. Standard task managers feel like they\'re built for someone else\'s brain.',
      solution: 'SharedMinds lets you think in the interconnected, non-linear way that creative work actually happens. Track projects that are "in progress" in five different ways without guilt. Use Spaces to separate client work from personal projects without losing the thread. Regulation tools help you notice when you\'re overcommitting or avoiding the hard parts.',
      icon: Lightbulb,
      gradientFrom: 'from-violet-600',
      gradientTo: 'to-purple-600',
      imageUrl: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Creative professional working',
    },
    {
      id: 'project-managers',
      title: 'Project Managers & Coordinators',
      problem: 'You\'re responsible for keeping everything aligned, but the people you\'re coordinating think differently, work differently, and need different kinds of support. The tools you have either oversimplify or overwhelm.',
      solution: 'SharedMinds helps you coordinate without controlling. It makes different perspectives visible, clarifies expectations without micromanaging, and helps you notice where communication is breaking down before it becomes a crisis. It respects that coordination is cognitive labor — and treats it accordingly.',
      icon: Map,
      gradientFrom: 'from-rose-600',
      gradientTo: 'to-pink-600',
      imageUrl: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Project manager coordinating tasks',
    },
    {
      id: 'personal-development',
      title: 'Personal Development',
      problem: 'You\'re working on yourself — therapy goals, habit building, understanding your own patterns — but progress isn\'t linear, and you need to track things that don\'t fit neatly into "complete" or "incomplete."',
      solution: 'SharedMinds supports reflective, ongoing growth that doesn\'t fit traditional productivity models. Track patterns over time, notice what regulation strategies actually help, and build awareness without judgment. It\'s designed for people doing the deep, ongoing work of understanding how they function.',
      icon: Heart,
      gradientFrom: 'from-indigo-600',
      gradientTo: 'to-blue-600',
      imageUrl: 'https://images.pexels.com/photos/3760514/pexels-photo-3760514.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Person reflecting on personal growth',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="#" onClick={handleNavigateHome} className="flex items-center gap-2.5 text-xl font-semibold text-blue-400">
              <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-10 h-10" />
              SharedMinds
            </a>
            <a href="#" onClick={handleNavigateHome} className="text-slate-300 hover:text-blue-400 transition-colors font-medium">
              Back to home
            </a>
          </div>
        </nav>
      </header>

      <section className="py-16 sm:py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_60%)]"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            One system. Many contexts.
          </h1>
          <p className="text-xl sm:text-2xl text-slate-300 leading-relaxed max-w-3xl mx-auto mb-10">
            SharedMinds adapts to how people think, live, and work — whether that's at home, in a team, or inside a complex project.
          </p>
          <div className="inline-block bg-gradient-to-br from-blue-600 to-cyan-600 backdrop-blur-sm border border-blue-400/40 rounded-2xl px-8 py-6 shadow-xl">
            <p className="text-white font-medium leading-relaxed mb-2">
              The same core systems — GuardRails, Spaces, Regulation — adapt to context.
            </p>
            <p className="text-blue-100 text-sm">
              Complexity lives in real life, not in the interface.
            </p>
          </div>
        </div>
      </section>

      <section className="relative bg-slate-900 pb-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              id={useCase.id}
              className="sticky mb-8"
              style={{ top: `${80 + index * 20}px` }}
            >
              <div
                className="relative bg-white rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-blue-500/10"
                style={{
                  transform: `scale(${1 - index * 0.02})`,
                  transformOrigin: 'top center'
                }}
              >
                <div className="grid lg:grid-cols-2 gap-0">
                  <div className="relative h-96 lg:h-auto overflow-hidden">
                    <img
                      src={useCase.imageUrl}
                      alt={useCase.imageAlt}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br ${useCase.gradientFrom} ${useCase.gradientTo} opacity-40`}></div>
                    <div className="absolute top-8 left-8">
                      <div className={`w-20 h-20 bg-gradient-to-br ${useCase.gradientFrom} ${useCase.gradientTo} rounded-2xl flex items-center justify-center shadow-2xl`}>
                        <useCase.icon className="w-10 h-10 text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                    <div className="absolute bottom-8 left-8 right-8">
                      <div className="bg-black/40 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20">
                        <p className="text-white font-semibold text-lg">
                          {useCase.title}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8">
                      {useCase.title}
                    </h2>

                    <div className="space-y-8">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${useCase.gradientFrom} ${useCase.gradientTo} flex items-center justify-center`}>
                            <AlertCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">
                            The Challenge
                          </h3>
                        </div>
                        <p className="text-base text-slate-600 leading-relaxed pl-13">
                          {useCase.problem}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${useCase.gradientFrom} ${useCase.gradientTo} flex items-center justify-center`}>
                            <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">
                            How SharedMinds Helps
                          </h3>
                        </div>
                        <p className="text-base text-slate-600 leading-relaxed pl-13">
                          {useCase.solution}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r ${useCase.gradientFrom} ${useCase.gradientTo}`}></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-32 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.15),transparent_50%)]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full filter blur-3xl"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full text-sm font-semibold shadow-lg mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Building in Public</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Systems that adapt to you —<br />not the other way around
            </h2>

            <p className="text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto mb-12">
              SharedMinds is being built for people who need tools that respect how their minds actually work: non-linear, context-dependent, and beautifully complex.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">For Real Contexts</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Whether you're managing a household, leading a team, or building a startup — one system that adapts.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Built with Neurodivergent Minds</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Designed with ADHD, autism, and other cognitive differences as core features, not afterthoughts.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Early-Stage Journey</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                These use cases describe our vision and thinking. The product is being actively developed.
              </p>
            </div>
          </div>

          <div className="text-center">
            <div className="inline-block bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl px-10 py-8 shadow-2xl">
              <p className="text-slate-300 text-lg mb-6 leading-relaxed">
                Want to be part of the journey?<br />
                <span className="text-white font-semibold">Join the waitlist and help shape what we're building.</span>
              </p>
              <a
                href="/#waitlist"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/';
                  setTimeout(() => {
                    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105"
              >
                <Mail className="w-5 h-5" />
                Join the Waitlist
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default App;
