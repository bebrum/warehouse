import DeliveryCard from './DeliveryCard.jsx';
import TaskCard from './TaskCard.jsx';
import { formatDateLong, getTodayISO } from '../dateUtils.js';

export default function TodayPanel({ tasks, deliveries, onChanged }) {
  const today = getTodayISO();
  const todayTasks = tasks.filter((task) => task.planned_date === today || task.planned_date === null);
  const todayDeliveries = deliveries.filter((delivery) => delivery.expected_date === today || delivery.dispatch_date === today);
  const total = todayTasks.length + todayDeliveries.length;

  return (
    <section className="panel today-panel">
      <div className="section-title">
        <div>
          <p className="eyebrow">Сегодня</p>
          <h2>{formatDateLong(today)}</h2>
        </div>
        <span className="counter">{total}</span>
      </div>

      {total ? (
        <div className="today-columns">
          <div>
            <h3>Задачи: {todayTasks.length}</h3>
            <div className="today-list">
              {todayTasks.length ? todayTasks.map((task) => <TaskCard key={task.id} task={task} onChanged={onChanged} compact />) : <div className="mini-empty">Нет задач.</div>}
            </div>
          </div>
          <div>
            <h3>Курьеры: {todayDeliveries.length}</h3>
            <div className="today-list">
              {todayDeliveries.length ? todayDeliveries.map((delivery) => <DeliveryCard key={delivery.id} delivery={delivery} onChanged={onChanged} compact />) : <div className="mini-empty">Нет доставок.</div>}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">На сегодня нет назначенных задач и курьерских действий.</div>
      )}
    </section>
  );
}
