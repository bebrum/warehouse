import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import CalendarBoard from './components/CalendarBoard.jsx';
import CourierPage from './components/CourierPage.jsx';
import TasksPage from './components/TasksPage.jsx';
import TodayPanel from './components/TodayPanel.jsx';
import OneCPage from './components/OneCPage.jsx';
import { VLADIVOSTOK_TIME_ZONE } from './dateUtils.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [tasks, setTasks] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [allTasks, allDeliveries, allNotes] = await Promise.all([
        api.listTasks(),
        api.listDeliveries(),
        api.listDayNotes(),
      ]);
      setTasks(allTasks);
      setDeliveries(allDeliveries);
      setNotes(allNotes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabs = [
    ['calendar', 'Календарь'],
    ['tasks', 'Задачи'],
    ['courier', 'Курьеры'],
    ['onec', 'База 1С'],
  ];

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Локальный складской дашборд</p>
          <h1>Задачи, доставки, коробки и счета</h1>
          <p className="timezone">Время: Владивосток / {VLADIVOSTOK_TIME_ZONE} / UTC+10</p>
        </div>
        <nav className="tabs">
          {tabs.map(([key, label]) => (
            <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{label}</button>
          ))}
        </nav>
      </header>

      {error && <pre className="error-box global-error">{error}</pre>}
      {loading ? <div className="empty-state">Загрузка...</div> : (
        <>
          <TodayPanel tasks={tasks} deliveries={deliveries} onChanged={loadData} />
          {activeTab === 'calendar' && <CalendarBoard tasks={tasks} deliveries={deliveries} notes={notes} onChanged={loadData} />}
          {activeTab === 'tasks' && <TasksPage tasks={tasks} onChanged={loadData} />}
          {activeTab === 'courier' && <CourierPage deliveries={deliveries} onChanged={loadData} />}
          {activeTab === 'onec' && <OneCPage />}
        </>
      )}
    </main>
  );
}
