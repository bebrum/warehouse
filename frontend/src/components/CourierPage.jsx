import { useMemo, useState } from 'react';
import { getTodayISO } from '../dateUtils.js';
import DeliveryCard from './DeliveryCard.jsx';
import DeliveryForm from './DeliveryForm.jsx';
import Modal from './Modal.jsx';

export default function CourierPage({ deliveries, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('active');
  const today = getTodayISO();

  const filteredDeliveries = useMemo(() => {
    if (filter === 'all') return deliveries;
    if (filter === 'active') return deliveries.filter((item) => !['done', 'cancelled'].includes(item.status));
    if (filter === 'today') return deliveries.filter((item) => item.expected_date === today || item.dispatch_date === today);
    return deliveries.filter((item) => item.status === filter);
  }, [deliveries, filter, today]);

  return (
    <section className="courier-page">
      <div className="toolbar panel courier-hero">
        <div>
          <p className="eyebrow">Курьерские доставки</p>
          <h2>Доставки, коробки, счета и отправка</h2>
          <p className="muted">Доставка — отдельное дело: ожидаем приезд, принимаем коробки, затем собираем и отправляем в назначенную дату.</p>
        </div>
        <div className="toolbar-actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="active">Активные</option>
            <option value="today">Сегодня</option>
            <option value="all">Все</option>
            <option value="expected">Ожидается</option>
            <option value="received">Принята</option>
            <option value="assembling">Собирается</option>
            <option value="ready">Готова к отправке</option>
            <option value="shipped">Отправлена</option>
            <option value="done">Завершена</option>
            <option value="cancelled">Отменена</option>
          </select>
          <button className="delivery-primary" onClick={() => setShowForm(true)}>+ Курьерская доставка</button>
        </div>
      </div>

      <div className="task-list">
        {filteredDeliveries.length ? filteredDeliveries.map((delivery) => <DeliveryCard key={delivery.id} delivery={delivery} onChanged={onChanged} />) : (
          <div className="empty-state">Курьерских доставок в этом фильтре нет.</div>
        )}
      </div>

      {showForm && (
        <Modal title="Новая курьерская доставка" subtitle="Коробки и счета" wide onClose={() => setShowForm(false)}>
          <DeliveryForm onSaved={async () => { setShowForm(false); await onChanged?.(); }} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </section>
  );
}
