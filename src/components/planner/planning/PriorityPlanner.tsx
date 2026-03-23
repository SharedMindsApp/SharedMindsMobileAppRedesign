import { PlannerShell } from '../PlannerShell';
import { Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getTodosForPeriod } from '../../../lib/planningService';
import type { PlanningTodo } from '../../../lib/planningService';

export function PriorityPlanner() {
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<PlanningTodo[]>([]);

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const data = await getTodosForPeriod('month');
      setTodos(data.filter(t => !t.completed).slice(0, 5));
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-4xl mx-auto p-8">
          <p className="text-slate-600">Loading...</p>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Priority Planner</h1>
          </div>
          <p className="text-slate-600">Decide what matters now</p>
        </div>

        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200 mb-6">
          <h3 className="font-semibold text-amber-900 mb-2">Top Priorities This Month</h3>
          <p className="text-sm text-amber-800">Focus on 3-5 key tasks that matter most</p>
        </div>

        <div className="space-y-4">
          {todos.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No priorities set</h3>
              <p className="text-slate-600">Add tasks to your to-do list to see them here</p>
            </div>
          ) : (
            todos.map((todo, index) => (
              <div key={todo.id} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800">{todo.title}</h3>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
