import { useState, useEffect } from 'react';
import { Target, CheckCircle2, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getLifeAreaOverview,
  updateLifeAreaOverview,
  getLifeAreaGoals,
  createLifeAreaGoal,
  updateLifeAreaGoal,
  deleteLifeAreaGoal,
  getLifeAreaTasks,
  createLifeAreaTask,
  updateLifeAreaTask,
  deleteLifeAreaTask,
  type LifeAreaGoal,
  type LifeAreaTask,
} from '../../lib/lifeAreas';

type LifeAreaDashboardProps = {
  areaKey: string;
  areaName: string;
  areaColor: string;
  description: string;
};

export function LifeAreaDashboard({ areaKey, areaName, areaColor, description }: LifeAreaDashboardProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [goals, setGoals] = useState<LifeAreaGoal[]>([]);
  const [tasks, setTasks] = useState<LifeAreaTask[]>([]);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalTitle, setEditingGoalTitle] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, areaKey]);

  async function loadData() {
    if (!user) return;

    const [overviewData, goalsData, tasksData] = await Promise.all([
      getLifeAreaOverview(user.id, areaKey),
      getLifeAreaGoals(user.id, areaKey),
      getLifeAreaTasks(user.id, areaKey),
    ]);

    if (overviewData) {
      setSummary(overviewData.summary || '');
      setNotes(overviewData.notes || '');
    }
    setGoals(goalsData);
    setTasks(tasksData);
  }

  async function saveSummary() {
    if (!user) return;
    await updateLifeAreaOverview(user.id, areaKey, { summary });
    setIsEditingSummary(false);
  }

  async function saveNotes() {
    if (!user) return;
    await updateLifeAreaOverview(user.id, areaKey, { notes });
    setIsEditingNotes(false);
  }

  async function addGoal() {
    if (!user || !newGoalTitle.trim()) return;
    await createLifeAreaGoal(user.id, areaKey, newGoalTitle.trim());
    setNewGoalTitle('');
    loadData();
  }

  async function toggleGoalCompletion(goal: LifeAreaGoal) {
    if (!user) return;
    const newStatus = goal.status === 'completed' ? 'active' : 'completed';
    await updateLifeAreaGoal(goal.id, { status: newStatus });
    loadData();
  }

  async function updateGoalProgress(goalId: string, progress: number) {
    if (!user) return;
    await updateLifeAreaGoal(goalId, { progress });
    loadData();
  }

  async function startEditingGoal(goal: LifeAreaGoal) {
    setEditingGoalId(goal.id);
    setEditingGoalTitle(goal.title);
  }

  async function saveGoalTitle(goalId: string) {
    if (!user || !editingGoalTitle.trim()) return;
    await updateLifeAreaGoal(goalId, { title: editingGoalTitle.trim() });
    setEditingGoalId(null);
    setEditingGoalTitle('');
    loadData();
  }

  async function removeGoal(goalId: string) {
    if (!user) return;
    if (confirm('Delete this goal?')) {
      await deleteLifeAreaGoal(goalId);
      loadData();
    }
  }

  async function addTask() {
    if (!user || !newTaskTitle.trim()) return;
    await createLifeAreaTask(user.id, areaKey, newTaskTitle.trim());
    setNewTaskTitle('');
    loadData();
  }

  async function toggleTaskCompletion(task: LifeAreaTask) {
    if (!user) return;
    await updateLifeAreaTask(task.id, { completed: !task.completed });
    loadData();
  }

  async function removeTask(taskId: string) {
    if (!user) return;
    await deleteLifeAreaTask(taskId);
    loadData();
  }

  const activeGoals = goals.filter(g => g.status !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${areaColor} rounded-lg p-6 text-white shadow-lg`}>
        <h1 className="text-3xl font-bold mb-2">{areaName}</h1>
        <p className="text-white/90">{description}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-gray-800">{goals.length}</div>
          <div className="text-sm text-gray-600">Total Goals</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border-l-4 border-green-500">
          <div className="text-2xl font-bold text-gray-800">{activeGoals.length}</div>
          <div className="text-sm text-gray-600">Active Goals</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border-l-4 border-amber-500">
          <div className="text-2xl font-bold text-gray-800">{avgProgress}%</div>
          <div className="text-sm text-gray-600">Avg Progress</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border-l-4 border-purple-500">
          <div className="text-2xl font-bold text-gray-800">{activeTasks.length}</div>
          <div className="text-sm text-gray-600">Active Tasks</div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-white rounded-lg p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Overview</h2>
          {!isEditingSummary && (
            <button
              onClick={() => setIsEditingSummary(true)}
              className="text-gray-600 hover:text-gray-800"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
        </div>
        {isEditingSummary ? (
          <div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Describe the current state of this area..."
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveSummary}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => setIsEditingSummary(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">{summary || 'Click edit to add an overview...'}</p>
        )}
      </div>

      {/* Goals Section */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-500" />
          Goals
        </h2>

        {/* Add New Goal */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
            placeholder="Add a new goal..."
            className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addGoal}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add
          </button>
        </div>

        {/* Active Goals */}
        <div className="space-y-4 mb-6">
          {activeGoals.map((goal) => (
            <div key={goal.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                {editingGoalId === goal.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editingGoalTitle}
                      onChange={(e) => setEditingGoalTitle(e.target.value)}
                      className="flex-1 border rounded px-2 py-1"
                    />
                    <button
                      onClick={() => saveGoalTitle(goal.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingGoalId(null)}
                      className="text-gray-600 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-800">{goal.title}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditingGoal(goal)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleGoalCompletion(goal)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => removeGoal(goal.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={goal.progress}
                  onChange={(e) => updateGoalProgress(goal.id, parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-600 w-12">{goal.progress}%</span>
              </div>
            </div>
          ))}
          {activeGoals.length === 0 && (
            <p className="text-gray-500 text-center py-4">No active goals yet</p>
          )}
        </div>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-600 mb-3">Completed</h3>
            <div className="space-y-2">
              {completedGoals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 line-through">{goal.title}</span>
                  <button
                    onClick={() => removeGoal(goal.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Tasks */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Tasks</h2>

        {/* Add New Task */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a quick task..."
            className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addTask}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Active Tasks */}
        <div className="space-y-2 mb-4">
          {activeTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTaskCompletion(task)}
                className="w-5 h-5 rounded border-gray-300"
              />
              <span className="flex-1 text-gray-800">{task.title}</span>
              <button
                onClick={() => removeTask(task.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {activeTasks.length === 0 && (
            <p className="text-gray-500 text-center py-4">No active tasks</p>
          )}
        </div>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-600 mb-2">Completed</h3>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="flex-1 text-gray-600 line-through">{task.title}</span>
                  <button
                    onClick={() => removeTask(task.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-lg p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Notes & Ideas</h2>
          {!isEditingNotes && (
            <button
              onClick={() => setIsEditingNotes(true)}
              className="text-gray-600 hover:text-gray-800"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
        </div>
        {isEditingNotes ? (
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
              placeholder="Jot down thoughts, ideas, or plans..."
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveNotes}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => setIsEditingNotes(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 whitespace-pre-wrap">{notes || 'Click edit to add notes...'}</p>
        )}
      </div>
    </div>
  );
}
