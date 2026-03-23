import { PlannerShell } from '../PlannerShell';
import { Lightbulb, Target, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getActiveGoals, getTodosForPeriod, getOrCreateMonthlyEntry, createTodo } from '../../../lib/planningService';
import type { LongTermGoal } from '../../../lib/visionService';
import type { PlanningTodo } from '../../../lib/planningService';

export function GoalActionPlan() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<LongTermGoal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [todos, setTodos] = useState<PlanningTodo[]>([]);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [goalsData, todosData] = await Promise.all([
        getActiveGoals(),
        getTodosForPeriod('month')
      ]);
      setGoals(goalsData);
      setTodos(todosData);
      if (goalsData.length > 0 && !selectedGoal) {
        setSelectedGoal(goalsData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle.trim()) return;

    try {
      const now = new Date();
      const entry = await getOrCreateMonthlyEntry(now.getFullYear(), now.getMonth() + 1);
      await createTodo({
        entry_id: entry.id,
        title: `[Goal] ${newActionTitle}`,
        order_index: todos.length
      });
      setNewActionTitle('');
      await loadData();
    } catch (error) {
      console.error('Error creating action:', error);
    }
  };

  const selectedGoalData = goals.find(g => g.id === selectedGoal);
  const relatedTodos = todos.filter(t => t.title.startsWith('[Goal]'));

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-5xl mx-auto p-8">
          <p className="text-slate-600">Loading...</p>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-yellow-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Goal Action Plan</h1>
          </div>
          <p className="text-slate-600">Break goals into meaningful steps</p>
        </div>

        {goals.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No active goals</h3>
            <p className="text-slate-600">Create goals in the Vision section to plan actions</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Goal</label>
              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400"
              >
                {goals.map(goal => (
                  <option key={goal.id} value={goal.id}>{goal.title}</option>
                ))}
              </select>
            </div>

            {selectedGoalData && (
              <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                <h3 className="font-semibold text-yellow-900 mb-2">{selectedGoalData.title}</h3>
                {selectedGoalData.intent_notes && (
                  <p className="text-sm text-yellow-800 mt-2">{selectedGoalData.intent_notes}</p>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-4">Define Next Actions</h3>
              <form onSubmit={handleAddAction} className="mb-6">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newActionTitle}
                    onChange={(e) => setNewActionTitle(e.target.value)}
                    placeholder="What's the next step?"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </form>

              {relatedTodos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Recent Goal Actions</h4>
                  {relatedTodos.slice(0, 5).map(todo => (
                    <div key={todo.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                        {todo.title.replace('[Goal] ', '')}
                      </span>
                      {todo.completed && (
                        <span className="text-xs text-emerald-600">Completed</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-2">Reflection</h3>
              <p className="text-sm text-slate-600 mb-3">What's blocking progress?</p>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 resize-none"
                rows={4}
                placeholder="Reflect on what's making this goal challenging or what support you need..."
              />
            </div>
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
