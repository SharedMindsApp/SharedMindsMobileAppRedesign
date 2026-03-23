import { PlannerShell } from '../PlannerShell';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getTodosForPeriod, updateTodo, deleteTodo, getOrCreateMonthlyEntry, createTodo } from '../../../lib/planningService';
import type { PlanningTodo } from '../../../lib/planningService';

export function TodoList() {
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<PlanningTodo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const data = await getTodosForPeriod('month');
      setTodos(data);
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (todo: PlanningTodo) => {
    try {
      await updateTodo(todo.id, { completed: !todo.completed });
      await loadTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo(id);
      await loadTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      const now = new Date();
      const entry = await getOrCreateMonthlyEntry(now.getFullYear(), now.getMonth() + 1);
      await createTodo({ entry_id: entry.id, title: newTodoTitle, order_index: todos.length });
      setNewTodoTitle('');
      await loadTodos();
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  };

  const completedCount = todos.filter(t => t.completed).length;

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
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-emerald-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">To-Do List</h1>
          </div>
          <p className="text-slate-600">Unified task execution view</p>
        </div>

        {todos.length > 0 && (
          <div className="bg-emerald-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-emerald-800">
              {completedCount} of {todos.length} completed
            </p>
          </div>
        )}

        <form onSubmit={handleAdd} className="bg-white rounded-xl p-4 border border-slate-200 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </form>

        <div className="space-y-2">
          {todos.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No tasks yet</h3>
              <p className="text-slate-600">Add your first task to get started</p>
            </div>
          ) : (
            todos.map((todo) => (
              <div key={todo.id} className="bg-white rounded-lg p-4 border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
                <button
                  onClick={() => handleToggle(todo)}
                  className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                    todo.completed
                      ? 'bg-emerald-600 border-emerald-600'
                      : 'border-slate-300 hover:border-emerald-400'
                  }`}
                >
                  {todo.completed && (
                    <CheckSquare className="w-4 h-4 text-white" />
                  )}
                </button>
                <span className={`flex-1 ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {todo.title}
                </span>
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="flex-shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
