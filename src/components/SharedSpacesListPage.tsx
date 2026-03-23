import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, ArrowRight, Plus, Home, User, ChevronDown, Target, MessageCircle, Settings, ArrowLeft } from 'lucide-react';
import { getSharedSpaces, Household } from '../lib/household';
import { isStandaloneApp } from '../lib/appContext';

export function SharedSpacesListPage() {
  const [spaces, setSpaces] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSpacesMenu, setShowSpacesMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  // Phase 9A: Detect mobile/installed app
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || isStandaloneApp();
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadSharedSpaces();
  }, []);

  const loadSharedSpaces = async () => {
    try {
      setLoading(true);
      const sharedSpaces = await getSharedSpaces();
      setSpaces(sharedSpaces);

      if (sharedSpaces.length === 1) {
        navigate(`/spaces/${sharedSpaces[0].id}`);
      }
    } catch (err) {
      console.error('Error loading shared spaces:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading shared spaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="bg-white border-b border-gray-200 shadow-sm relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Back Button */}
              <button
                onClick={() => navigate('/spaces')}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors touch-manipulation"
                aria-label="Back to main navigation"
              >
                <ArrowLeft size={20} />
              </button>
              
              <div>
                <h1 className="text-lg font-bold text-gray-900">Shared Spaces</h1>
                <p className="text-xs text-gray-500">Collaborative dashboards</p>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Home size={18} />
                  Dashboard
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowSpacesMenu(!showSpacesMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 transition-colors"
                  >
                    <Users size={18} />
                    Spaces
                    <ChevronDown size={16} className={`transition-transform ${showSpacesMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showSpacesMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSpacesMenu(false)}
                      ></div>
                      <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[60]">
                        <button
                          onClick={() => {
                            setShowSpacesMenu(false);
                            navigate('/spaces/personal');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <User size={16} />
                          Personal Space
                        </button>
                        <button
                          onClick={() => {
                            setShowSpacesMenu(false);
                            navigate('/spaces/shared');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Users size={16} />
                          Shared Spaces
                        </button>
                        <button
                          onClick={() => {
                            setShowSpacesMenu(false);
                            navigate('/guardrails');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Target size={16} />
                          Teams
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => navigate('/guardrails')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Target size={18} />
                  Guardrails
                </button>

                <button
                  onClick={() => navigate('/messages')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle size={18} />
                  Messages
                </button>

                <button
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={18} />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Your Shared Spaces</h1>
          <p className="text-lg text-gray-600">Select a space to collaborate with your team</p>
        </div>

        {spaces.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users size={32} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No Shared Spaces</h2>
            <p className="text-gray-600 mb-6">You are not a member of any shared spaces yet.</p>
            <button
              onClick={() => navigate('/onboarding/household')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              <Plus size={20} />
              Create a Shared Space
            </button>
          </div>
        ) : (
          // Phase 9A: Mobile shows OS-style grid, desktop shows list
          isMobile ? (
            <div className="grid grid-cols-4 gap-6 sm:gap-8">
              {spaces.map((space) => (
                <button
                  key={space.id}
                  onClick={() => navigate(`/spaces/${space.id}`)}
                  className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-500 flex items-center justify-center shadow-lg">
                    <Users size={40} className="text-white" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-900 font-medium text-center max-w-[80px] sm:max-w-[96px] truncate">
                    {space.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {spaces.map((space) => (
                <button
                  key={space.id}
                  onClick={() => navigate(`/spaces/${space.id}`)}
                  className="w-full bg-white rounded-xl shadow-md border border-gray-200 hover:border-amber-500 hover:shadow-lg transition-all p-6 text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                        <Users size={24} className="text-amber-600 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{space.name}</h3>
                        <p className="text-sm text-gray-500">
                          {space.plan === 'premium' ? (
                            <span className="text-teal-600 font-medium">Premium Plan</span>
                          ) : (
                            <span className="text-gray-500">Free Plan</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={24} className="text-gray-400 group-hover:text-amber-600 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
