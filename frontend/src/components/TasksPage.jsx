import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import TaskCard from './TaskCard.jsx';
import TaskForm from './TaskForm.jsx';

export default function TasksPage({ tasks, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    if (filter === 'undated') return tasks.filter((task) => !task.planned_date);
    return tasks.filter((task) => task.status === filter);
  }, [tasks, filter]);

  return (
    <section className="tasks-page">
      <div className="toolbar panel">
        <div>
          <p className="eyebrow">Задачи</p>
          <h2>Короткие поручения и напоминания</h2>
          <p className="muted">Короткие поручения с датой, статусом, комментариями и привязкой к счетам.</p>
        </div>
        <div className="toolbar-actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Все</option>
            <option value="undated">Без даты</option>
            <option value="not_started">Не начато</option>
            <option value="in_progress">Начато</option>
            <option value="done">Выполнено</option>
          </select>
          <button className="primary" onClick={() => setShowForm(true)}>+ Новая задача</button>
        </div>
      </div>

      <div className="task-list">
        {filteredTasks.length ? filteredTasks.map((task) => <TaskCard key={task.id} task={task} onChanged={onChanged} />) : (
          <div className="empty-state">Задач в этом фильтре нет.</div>
        )}
      </div>

      {showForm && (
        <Modal title="Новая задача" subtitle="Короткое поручение" onClose={() => setShowForm(false)}>
          <TaskForm onSaved={async () => { setShowForm(false); await onChanged?.(); }} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </section>
  );
}
