/**
 * Body Transformation Activation Card
 * 
 * Inviting card that prompts users to start tracking their body transformation
 * Fun, engaging design that makes them want to participate
 */

import { useState } from 'react';
import { Sparkles, TrendingUp, Target, Heart, ArrowRight } from 'lucide-react';
import { BodyProfileSetupModal } from './BodyProfileSetupModal';

type BodyTransformationActivationCardProps = {
  onActivated?: () => void;
};

export function BodyTransformationActivationCard({ onActivated }: BodyTransformationActivationCardProps) {
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const handleActivate = () => {
    setShowProfileSetup(true);
  };

  const handleProfileComplete = () => {
    setShowProfileSetup(false);
    if (onActivated) {
      onActivated();
    }
  };

  return (
    <>
      <div className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl border-2 border-blue-200 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2 group-hover:scale-110 transition-transform duration-500" />
        
        <div className="relative p-5 sm:p-8 md:p-10">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>

          {/* Content */}
          <div className="mb-4 sm:mb-6">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
              Track How Your Body Adapts to Training
            </h3>
            <p className="text-gray-700 text-sm sm:text-base md:text-lg leading-relaxed mb-3 sm:mb-4">
              Your body is always changing in response to your movement. Let's understand how your training shapes you over time.
            </p>
            
            {/* Benefits list */}
            <div className="space-y-2.5 sm:space-y-3 mt-4 sm:mt-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 bg-blue-100 rounded-lg mt-0.5 flex-shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-semibold text-gray-900">See Your Progress</p>
                  <p className="text-xs sm:text-sm text-gray-600">Visualize how your body responds to your training patterns</p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 bg-purple-100 rounded-lg mt-0.5 flex-shrink-0">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-semibold text-gray-900">No Pressure, Just Observations</p>
                  <p className="text-xs sm:text-sm text-gray-600">We track changes, not targets. Your journey, your pace.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 bg-pink-100 rounded-lg mt-0.5 flex-shrink-0">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-semibold text-gray-900">Connect Training to Transformation</p>
                  <p className="text-xs sm:text-sm text-gray-600">Discover how your fitness sessions influence your body's changes</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleActivate}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2 group-hover:scale-105 transform"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Profile Setup Modal */}
      {showProfileSetup && (
        <BodyProfileSetupModal
          isOpen={showProfileSetup}
          onClose={() => setShowProfileSetup(false)}
          onComplete={handleProfileComplete}
        />
      )}
    </>
  );
}
