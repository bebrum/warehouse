import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { dayName, formatDateLong, formatDateShort, getTodayISO, getWeekDays, shiftWeek } from '../dateUtils.js';
import DeliveryCard from './DeliveryCard.jsx';
import DeliveryForm from './DeliveryForm.jsx';
import Modal from './Modal.jsx';
import TaskCard from './TaskCard.jsx';
import TaskForm from './TaskForm.jsx';

const WEEK_SWIPE_TRANSITION_MS = 560;

const plural = (count, one, few, many) => {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
};

function deliveryEventsForDate(delivery, date) {
  const events = [];
  if (delivery.expected_date === date) events.push({ kind: 'arrival', label: 'Приезд', delivery });
  if (delivery.dispatch_date === date) events.push({ kind: 'dispatch', label: 'Отправка', delivery });
  if (delivery.received_date === date && delivery.received_date !== delivery.expected_date) events.push({ kind: 'received', label: 'Принята', delivery });
  return events;
}

function uniqueRequestNumbersFromDelivery(delivery) {
  const numbers = [];
  for (const box of delivery.boxes || []) {
    for (const request of box.requests || []) {
      if (!numbers.includes(request.number)) numbers.push(request.number);
    }
  }
  return numbers;
}

function truncateText(value, maxLength = 140) {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}


function formatWorkWeekRange(days) {
  if (!days.length) return '';
  const parse = (isoDate) => {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const first = parse(days[0]);
  const last = parse(days[days.length - 1]);
  const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();
  const sameYear = first.getFullYear() === last.getFullYear();

  if (sameMonth) {
    const monthYear = last.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    return `${first.getDate()} — ${last.getDate()} ${monthYear}`;
  }

  const firstOptions = sameYear
    ? { day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  return `${first.toLocaleDateString('ru-RU', firstOptions)} — ${last.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

function getWorkWeekDays(anchor) {
  return getWeekDays(anchor).slice(0, 5);
}

function DayEventCard({ type, item, eventLabel, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const isTask = type === 'task';
  const requestNumbers = isTask
    ? (item.requests || []).map((request) => request.number)
    : uniqueRequestNumbersFromDelivery(item);
  const title = isTask ? item.title : item.title;
  const description = truncateText(item.description);
  const metaLine = isTask
    ? [item.planned_date ? formatDateLong(item.planned_date) : 'Дата не назначена', item.planned_time?.slice(0, 5)].filter(Boolean).join(', ')
    : [
        eventLabel,
        item.expected_date ? `приезд: ${formatDateLong(item.expected_date)}` : null,
        item.dispatch_date ? `отправка: ${formatDateLong(item.dispatch_date)}` : null,
      ].filter(Boolean).join(' · ');
  const detailsLine = isTask
    ? `${requestNumbers.length} ${plural(requestNumbers.length, 'счёт', 'счёта', 'счетов')}`
    : `${item.boxes?.length || 0} ${plural(item.boxes?.length || 0, 'коробка', 'коробки', 'коробок')} · ${requestNumbers.length} ${plural(requestNumbers.length, 'счёт', 'счёта', 'счетов')}`;
  const cardClass = isTask
    ? `day-event-card task-event-card task-status-${item.status}`
    : `day-event-card delivery-event-card delivery-status-${item.status}`;

  return (
    <article className={`${cardClass} ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
      <button className="day-event-summary" type="button" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}>
        <div className="day-event-summary-main">
          <div className="day-event-topline">
            <span className={`task-kicker ${isTask ? 'task-type' : 'delivery-type'}`}>{isTask ? 'Задача' : 'Курьерская доставка'}</span>
            {!isTask && eventLabel && <span className="event-badge compact-event-badge">{eventLabel}</span>}
          </div>
          <h4>{title}</h4>
          {description && <p>{description}</p>}
          <div className="day-event-compact-meta">
            <span>{metaLine}</span>
            <span>{detailsLine}</span>
          </div>
          {!!requestNumbers.length && (
            <div className="chips compact-chips">
              {requestNumbers.slice(0, 4).map((number) => (
                <span key={number} className={`chip ${isTask ? 'task-chip' : 'delivery-chip'}`}>{number}</span>
              ))}
              {requestNumbers.length > 4 && <span className="chip muted-chip">+{requestNumbers.length - 4}</span>}
            </div>
          )}
        </div>
        <div className="day-event-summary-side">
          <span className={`status-pill ${isTask ? `task-status-${item.status}` : `delivery-status-${item.status}`}`}>{item.status_label}</span>
          <span className="expand-hint">{expanded ? 'Свернуть' : 'Развернуть'}</span>
        </div>
      </button>

      {expanded && (
        <div className="day-event-expanded-body">
          {isTask ? (
            <TaskCard task={item} onChanged={onChanged} />
          ) : (
            <DeliveryCard delivery={item} onChanged={onChanged} />
          )}
        </div>
      )}
    </article>
  );
}

export default function CalendarBoard({ tasks, deliveries, notes, onChanged }) {
  const [anchor, setAnchor] = useState(getTodayISO());
  const [modal, setModal] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [weekTransition, setWeekTransition] = useState(null);
  const days = useMemo(() => getWorkWeekDays(anchor), [anchor]);
  const today = getTodayISO();

  const noteByDate = Object.fromEntries(notes.map((note) => [note.date, note]));

  const changeWeek = (nextAnchor, direction = 'next') => {
    if (nextAnchor === anchor || weekTransition) return;

    const currentAnchor = anchor;
    setWeekTransition({
      fromAnchor: currentAnchor,
      toAnchor: nextAnchor,
      direction,
      key: `${currentAnchor}-${nextAnchor}-${Date.now()}`,
    });

    setAnchor(nextAnchor);
    window.setTimeout(() => {
      setWeekTransition(null);
    }, WEEK_SWIPE_TRANSITION_MS);
  };

  const goToToday = () => {
    const todayAnchor = getTodayISO();
    if (todayAnchor === anchor) return;
    changeWeek(todayAnchor, todayAnchor > anchor ? 'next' : 'prev');
  };

  const saveNote = async (date) => {
    const text = noteDrafts[date] ?? noteByDate[date]?.text ?? '';
    if (noteByDate[date]) {
      await api.updateDayNote(noteByDate[date].id, { text });
    } else {
      await api.createDayNote({ date, text });
    }
    await onChanged?.();
  };

  const renderDayDetails = (date) => {
    const dayTasks = tasks.filter((task) => task.planned_date === date);
    const deliveryEvents = deliveries.flatMap((delivery) => deliveryEventsForDate(delivery, date));
    const currentNote = noteDrafts[date] ?? noteByDate[date]?.text ?? '';
    const totalEvents = dayTasks.length + deliveryEvents.length;

    return (
      <Modal title={`${dayName(date)}, ${formatDateShort(date)}`} subtitle="День календаря" wide onClose={() => setModal(null)}>
        <div className="day-detail-layout">
          <aside className="day-detail-left">
            <div className="day-brief-card">
              <p className="eyebrow">Кратко о дне</p>
              <div className="day-brief-number">{formatDateShort(date)}</div>
              <div className="day-brief-stats">
                <span className="mini-pill task-mini">{dayTasks.length} {plural(dayTasks.length, 'задача', 'задачи', 'задач')}</span>
                <span className="mini-pill delivery-mini">{deliveryEvents.length} {plural(deliveryEvents.length, 'доставка', 'доставки', 'доставок')}</span>
              </div>
              <div className="day-detail-actions">
                <button className="primary" onClick={() => setModal({ type: 'task', date })}>+ Задача</button>
                <button className="delivery-primary" onClick={() => setModal({ type: 'delivery', date })}>+ Курьер</button>
              </div>
            </div>

            <section className="day-note-detail">
              <label>
                Комментарий дня
                <textarea
                  value={currentNote}
                  onChange={(e) => setNoteDrafts((current) => ({ ...current, [date]: e.target.value }))}
                  placeholder="Комментарий"
                />
              </label>
              <button className="small" onClick={() => saveNote(date)}>Сохранить комментарий</button>
            </section>
          </aside>

          <section className="day-detail-right">
            <div className="subsection-title day-events-title">
              <div>
                <h3>События дня</h3>
                <p className="muted">Карточки открываются по нажатию. По умолчанию показана краткая информация.</p>
              </div>
              <span className="counter small-counter">{totalEvents}</span>
            </div>

            {totalEvents ? (
              <div className="day-events-rail">
                {dayTasks.map((task) => (
                  <DayEventCard key={`task-${task.id}`} type="task" item={task} onChanged={onChanged} />
                ))}
                {deliveryEvents.map((event) => (
                  <DayEventCard key={`${event.kind}-${event.delivery.id}`} type="delivery" item={event.delivery} eventLabel={event.label} onChanged={onChanged} />
                ))}
              </div>
            ) : (
              <div className="empty-state">На этот день нет задач и курьерских доставок.</div>
            )}
          </section>
        </div>
      </Modal>
    );
  };


  const renderDayCard = (date, index, keyPrefix = '') => {
    const dayTasks = tasks.filter((task) => task.planned_date === date);
    const deliveryEvents = deliveries.flatMap((delivery) => deliveryEventsForDate(delivery, date));
    const hasEvents = dayTasks.length || deliveryEvents.length;
    const currentNote = noteDrafts[date] ?? noteByDate[date]?.text ?? '';

    return (
      <article
        key={`${keyPrefix}${date}`}
        className={`day-card ${date === today ? 'is-today' : ''} ${hasEvents ? 'has-events' : ''}`}
        style={{ '--card-index': index }}
        role="button"
        tabIndex={0}
        onClick={() => setModal({ type: 'day', date })}
        onKeyDown={(event) => event.key === 'Enter' && setModal({ type: 'day', date })}
      >
        <header className="day-header">
          <div>
            <p>{dayName(date)}</p>
            <strong>{formatDateShort(date)}</strong>
          </div>
          <span className="day-counter">{dayTasks.length + deliveryEvents.length}</span>
        </header>

        <div className="day-summary">
          {hasEvents ? (
            <>
              {!!dayTasks.length && <span className="mini-pill task-mini">{dayTasks.length} {plural(dayTasks.length, 'задача', 'задачи', 'задач')}</span>}
              {!!deliveryEvents.length && <span className="mini-pill delivery-mini">{deliveryEvents.length} {plural(deliveryEvents.length, 'доставка', 'доставки', 'доставок')}</span>}
            </>
          ) : <span className="mini-empty compact-empty">Нет событий</span>}
        </div>

        {currentNote && <p className="day-note-preview">{currentNote}</p>}

        <div className="day-actions" onClick={(event) => event.stopPropagation()}>
          <button className="primary small" onClick={() => setModal({ type: 'task', date })}>+ Задача</button>
          <button className="delivery-primary small" onClick={() => setModal({ type: 'delivery', date })}>+ Курьер</button>
        </div>
      </article>
    );
  };

  const renderWeekGrid = (weekDays, className, keyPrefix = '') => (
    <div className={`calendar-grid ${className}`}>
      {weekDays.map((date, index) => renderDayCard(date, index, keyPrefix))}
    </div>
  );

  const renderWeekSwipe = () => {
    if (!weekTransition) return renderWeekGrid(days, 'week-layer week-current');

    const fromDays = getWorkWeekDays(weekTransition.fromAnchor);
    const toDays = getWorkWeekDays(weekTransition.toAnchor);
    const isNext = weekTransition.direction === 'next';
    const firstPanelDays = isNext ? fromDays : toDays;
    const secondPanelDays = isNext ? toDays : fromDays;

    return (
      <div className={`calendar-swipe-viewport is-animating swipe-${weekTransition.direction}`} key={weekTransition.key}>
        <div className={`calendar-swipe-track swipe-track-${weekTransition.direction}`}>
          <div className="calendar-swipe-panel">
            {renderWeekGrid(firstPanelDays, 'week-layer', `swipe-a-${weekTransition.key}-`)}
          </div>
          <div className="calendar-swipe-panel">
            {renderWeekGrid(secondPanelDays, 'week-layer', `swipe-b-${weekTransition.key}-`)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="calendar-page">
      <div className="toolbar panel">
        <div>
          <p className="eyebrow">Календарь</p>
          <h2>{formatWorkWeekRange(days)}</h2>
        </div>
        <div className="toolbar-actions">
          <button onClick={() => changeWeek(shiftWeek(anchor, -1), 'prev')}>← Прошлая</button>
          <button onClick={goToToday}>Сегодня</button>
          <button onClick={() => changeWeek(shiftWeek(anchor, 1), 'next')}>Следующая →</button>
        </div>
      </div>

      <div className={`calendar-week-viewport ${weekTransition ? 'is-animating' : ''}`}>
        {renderWeekSwipe()}
      </div>

      {modal?.type === 'day' && renderDayDetails(modal.date)}
      {modal?.type === 'task' && (
        <Modal title="Новая задача" subtitle={modal.date ? `Дата: ${formatDateShort(modal.date)}` : 'Задачи'} onClose={() => setModal(null)}>
          <TaskForm defaultDate={modal.date || ''} onSaved={async () => { setModal(null); await onChanged?.(); }} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === 'delivery' && (
        <Modal title="Новая курьерская доставка" subtitle={modal.date ? `Дата приезда: ${formatDateShort(modal.date)}` : 'Курьеры'} wide onClose={() => setModal(null)}>
          <DeliveryForm defaultDate={modal.date || ''} defaultDateField="expected_date" onSaved={async () => { setModal(null); await onChanged?.(); }} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </section>
  );
}
