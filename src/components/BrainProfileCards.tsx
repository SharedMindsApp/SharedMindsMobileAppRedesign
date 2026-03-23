import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Edit2, Eye, EyeOff, Save, Share2, X, ChevronLeft, Settings } from 'lucide-react';
import { getBrainProfileCards, updateProfileCard, toggleCardVisibility } from '../lib/brainProfile';
import { BrainProfileCard } from '../lib/brainProfileTypes';

export function BrainProfileCards() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<BrainProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const data = await getBrainProfileCards();
      setCards(data);
    } catch (err) {
      console.error('Error loading profile cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (card: BrainProfileCard) => {
    setEditingCard(card.id);
    setEditedContent(card.content.join('\n'));
  };

  const handleSaveEdit = async (cardId: string) => {
    try {
      const newContent = editedContent.split('\n').filter(line => line.trim());
      await updateProfileCard(cardId, newContent);
      setEditingCard(null);
      await loadCards();
    } catch (err) {
      console.error('Error updating card:', err);
    }
  };

  const handleToggleVisibility = async (cardId: string, currentVisibility: boolean) => {
    try {
      await toggleCardVisibility(cardId, !currentVisibility);
      await loadCards();
    } catch (err) {
      console.error('Error toggling card visibility:', err);
    }
  };

  const getCardIcon = (cardType: string) => {
    switch (cardType) {
      case 'how_brain_works':
        return '🧠';
      case 'communication':
        return '💬';
      case 'struggling':
        return '🆘';
      case 'support_others':
        return '🤝';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4 inline-block">
            <Brain size={48} className="text-blue-600" />
          </div>
          <p className="text-gray-600">Loading your brain profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ChevronLeft size={20} />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Brain size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Brain Profile</h1>
                <p className="text-gray-600">Your personalized communication and support guide</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/brain-profile/onboarding')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings size={18} />
                Retake
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Share2 size={18} />
                Share
              </button>
            </div>
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Brain size={48} className="text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Profile Yet</h2>
            <p className="text-gray-600 mb-6">
              Complete the brain profile onboarding to create your personalized cards.
            </p>
            <button
              onClick={() => navigate('/brain-profile/onboarding')}
              className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-opacity ${
                  card.is_visible ? 'opacity-100' : 'opacity-60'
                }`}
              >
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getCardIcon(card.card_type)}</span>
                      <h2 className="text-2xl font-bold">{card.title}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleVisibility(card.id, card.is_visible)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        title={card.is_visible ? 'Hide card' : 'Show card'}
                      >
                        {card.is_visible ? <Eye size={20} /> : <EyeOff size={20} />}
                      </button>
                      {editingCard === card.id ? (
                        <button
                          onClick={() => handleSaveEdit(card.id)}
                          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          <Save size={20} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(card)}
                          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          <Edit2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {editingCard === card.id ? (
                    <div>
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                        placeholder="Enter each point on a new line"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Each line will become a separate point
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {card.content.map((point, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-blue-600 font-bold mt-1">•</span>
                          <span className="text-gray-700 text-lg leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-gray-900 mb-2">About Your Brain Profile</h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            These cards are generated from your responses and are designed to help others understand
            how to communicate and work with you effectively. You can edit any card to add or remove
            information, and hide cards you don't want to share. Your profile is completely private
            unless you choose to share it.
          </p>
        </div>
      </div>
    </div>
  );
}
