import { ArrowRight, Sparkles, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface IntroScreenProps {
  onBegin: () => void;
}

export function IntroScreen({ onBegin }: IntroScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
      <button
        onClick={() => navigate('/journey')}
        className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm hover:bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 hover:text-gray-900 z-50"
      >
        <Home size={20} />
        <span className="font-medium">Back to Journey</span>
      </button>

      <div className="max-w-2xl w-full">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full blur-3xl -translate-y-32 translate-x-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-rose-200/30 to-pink-200/30 rounded-full blur-3xl translate-y-24 -translate-x-24 animate-pulse" style={{ animationDelay: '1s' }}></div>

          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 transition-transform hover:rotate-6 hover:scale-110 duration-300">
                  <Sparkles size={48} className="text-white" />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-br from-amber-200 to-rose-200 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-4">
              You, As an Individual
            </h1>

            <p className="text-xl text-gray-700 text-center mb-8 leading-relaxed">
              A gentle dive into how your mind works — your strengths, your rhythms, your sensory world.
            </p>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-8 border-2 border-amber-200/50">
              <p className="text-gray-700 leading-relaxed text-center">
                This is not a test. There are no wrong answers. Just honest reflections about how you experience the world.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={onBegin}
                className="group bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 text-white font-bold text-lg px-10 py-5 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center gap-3"
              >
                <span>Begin My Profile</span>
                <ArrowRight size={24} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <p className="text-sm text-gray-500 text-center mt-6">
              Takes about 5-7 minutes
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-2">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/60"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
