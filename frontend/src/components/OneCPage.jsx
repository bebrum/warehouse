import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { VLADIVOSTOK_TIME_ZONE } from '../dateUtils.js';

const STATUS_OPTIONS = [
  ['accepted_warehouse', 'Принято на склад БП/СП'],
  ['transferred_to_lab', 'Передано в лабораторию'],
  ['accepted_lab', 'Принято в лаборатории'],
  ['transferred_from_lab', 'Передано из лаборатории'],
  ['done_ready', 'Выполнено / готово к выдаче'],
  ['issued_customer', 'Выдан заказчику'],
  ['other', 'Другой статус'],
];

const BUSINESS_STATUS_OPTIONS = STATUS_OPTIONS.filter(([value]) => value !== 'other');

const PERIOD_OPTIONS_SHORT = [
  ['last_7', 'Последние 7 дней'],
  ['last_30', 'Последние 30 дней'],
  ['current_week', 'Текущая неделя'],
];

const COUNTERPARTY_PERIOD_OPTIONS = [
  ['last_30', 'Последние 30 дней'],
  ['current_quarter', 'Текущий квартал'],
  ['current_year', 'Текущий год'],
];

const LOAD_PERIOD_OPTIONS = [
  ['current_week', 'Текущая неделя'],
  ['last_7', 'Последние 7 дней'],
  ['last_30', 'Последние 30 дней'],
];

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    timeZone: VLADIVOSTOK_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatGeneratedAt(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('ru-RU', {
    timeZone: VLADIVOSTOK_TIME_ZONE,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function countText(value, one, few, many) {
  const number = Number(value || 0);
  const mod10 = number % 10;
  const mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return `${number} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${number} ${few}`;
  return `${number} ${many}`;
}

function StatCard({ label, value, hint }) {
  return (
    <article className="onec-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <p>{hint}</p>}
    </article>
  );
}

function ChartCard({ title, subtitle, right, children }) {
  return (
    <section className="chart-card vitrine-card">
      <div className="vitrine-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {right && <div className="vitrine-card-actions">{right}</div>}
      </div>
      {children}
    </section>
  );
}

function ChartEmpty({ children = 'Нет данных для выбранных фильтров.' }) {
  return <div className="chart-empty">{children}</div>;
}

function ChartBox({ children, height = 320 }) {
  return <div className="rechart-box" style={{ height }}>{children}</div>;
}

function SimpleBarChart({
  data = [],
  valueKey = 'count',
  label = 'Значение',
  secondaryKey = '',
  secondaryLabel = '',
  height = 320,
}) {
  if (!data.length) return <ChartEmpty />;
  const values = data.map((item) => Number(item[valueKey] || 0));
  const max = Math.max(...values, 1);
  const minItemWidth = data.length > 45 ? 34 : data.length > 18 ? 46 : 62;

  return (
    <div className="simple-chart" style={{ minHeight: height }}>
      <div className="simple-chart-scroll">
        <div className="simple-chart-plot" style={{ minWidth: `${Math.max(data.length * minItemWidth, 360)}px` }}>
          {data.map((item, index) => {
            const value = Number(item[valueKey] || 0);
            const heightPercent = value > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
            const secondaryValue = secondaryKey ? Number(item[secondaryKey] || 0) : null;
            return (
              <div className="simple-chart-item" key={`${item.date || item.label}-${index}`}>
                <div className="simple-chart-value">{value.toLocaleString('ru-RU')}</div>
                {secondaryKey && <div className="simple-chart-secondary">{secondaryValue.toLocaleString('ru-RU')}%</div>}
                <div className="simple-chart-bar-wrap">
                  <div className="simple-chart-bar" style={{ height: `${heightPercent}%` }} />
                </div>
                <small title={item.date || item.label}>{item.label || item.date}</small>
              </div>
            );
          })}
        </div>
      </div>
      <div className="simple-chart-legend">
        <span><b className="legend-dot legend-main" />{label}</span>
        {secondaryKey && <span><b className="legend-dot legend-secondary" />{secondaryLabel}</span>}
      </div>
    </div>
  );
}

function WeekdayHourChart({ data = [] }) {
  if (!data.length) return <ChartEmpty />;

  const max = Math.max(...data.flatMap((day) => (day.hours || []).map((item) => item.count || 0)), 1);

  return (
    <div className="weekday-hour-chart" aria-label="Распределение поступлений по рабочим дням и часам">
      <div className="weekday-hour-head">
        <span />
        {Array.from({ length: 10 }, (_, index) => index + 8).map((hour) => (
          <strong key={hour}>{String(hour).padStart(2, '0')}:00</strong>
        ))}
      </div>
      {data.map((day) => (
        <div className="weekday-hour-row" key={day.weekday}>
          <strong className="weekday-hour-label">{day.weekday}</strong>
          {(day.hours || []).map((item) => {
            const intensity = max ? Math.max(0.08, item.count / max) : 0;
            return (
              <div
                className="weekday-hour-cell"
                key={`${day.weekday}-${item.hour}`}
                title={`${day.weekday}, ${String(item.hour).padStart(2, '0')}:00 — ${item.count}`}
                style={{ '--heat': intensity }}
              >
                <span>{item.count ? Number(item.count).toLocaleString('ru-RU') : ''}</span>
              </div>
            );
          })}
        </div>
      ))}
      <div className="weekday-hour-caption">
        <span>Светлее — меньше поступлений</span>
        <span>Темнее — чаще приходят</span>
      </div>
    </div>
  );
}

function EventRow({ event }) {
  return (
    <tr>
      <td>{formatDateTime(event.event_datetime)}</td>
      <td>
        <strong>{event.invoice_number}</strong>
        <div className="table-subtext">{event.is_own_lab ? 'Наша лаборатория' : 'Субподряд'}</div>
      </td>
      <td>{event.counterparty || '—'}</td>
      <td>
        <span className={`onec-status status-${event.status_code}`}>{event.status_label || event.status_raw}</span>
        <div className="table-subtext">{event.status_raw}</div>
      </td>
      <td>{event.work_description || event.service_name || '—'}</td>
      <td>{Number(event.quantity).toLocaleString('ru-RU')}</td>
      <td>{event.barcode || '—'}</td>
      <td>{event.responsible_full_name || '—'}</td>
    </tr>
  );
}

function DataSelect({ label, value, options, onChange, emptyLabel = 'Все' }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel}</option>
        {options.map((item) => {
          const optionValue = Array.isArray(item) ? item[0] : item.value;
          const optionLabel = Array.isArray(item) ? item[1] : item.label;
          const suffix = !Array.isArray(item) && item.events_count ? ` · ${item.events_count}` : '';
          return <option value={optionValue} key={optionValue}>{optionLabel}{suffix}</option>;
        })}
      </select>
    </label>
  );
}

export default function OneCPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsPage, setEventsPage] = useState({ count: 0, page: 1, page_size: 50, total_pages: 1, next: null, previous: null });
  const [stats, setStats] = useState(null);
  const [vitrines, setVitrines] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', own_lab: '1', latest: '', date_from: '', date_to: '', page: 1, page_size: 50 });
  const [vitrineFilters, setVitrineFilters] = useState({
    load_period: 'current_week',
    employee: '',
    employee_status: 'accepted_warehouse',
    employee_period: 'last_7',
    movement_period: 'last_7',
    counterparty: '',
    counterparty_period: 'last_30',
    counterparty_status: 'both',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async (nextFilters = filters, nextVitrineFilters = vitrineFilters) => {
    setError('');
    setLoading(true);
    try {
      const [statsData, vitrinesData, eventsData] = await Promise.all([
        api.oneCStats(),
        api.oneCVitrines(nextVitrineFilters),
        api.listOneCEvents(nextFilters),
      ]);
      setStats(statsData);
      setVitrines(vitrinesData);
      if (Array.isArray(eventsData)) {
        setEvents(eventsData);
        setEventsPage({ count: eventsData.length, page: 1, page_size: eventsData.length || 50, total_pages: 1, next: null, previous: null });
      } else {
        setEvents(eventsData.results || []);
        setEventsPage({
          count: eventsData.count || 0,
          page: eventsData.page || 1,
          page_size: eventsData.page_size || 50,
          total_pages: eventsData.total_pages || 1,
          next: eventsData.next,
          previous: eventsData.previous,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, vitrineFilters]);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const maxArrivalHour = useMemo(() => Math.max(...(stats?.arrival_workweek_heatmap || []).flatMap((day) => (day.hours || []).map((item) => item.count || 0)), 0), [stats]);
  const employeeOptions = vitrines?.employees || [];
  const counterpartyOptions = vitrines?.counterparties || [];

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) {
      setError('Выберите файл .xlsx');
      return;
    }
    setUploading(true);
    setError('');
    setImportResult(null);
    try {
      const result = await api.uploadOneCFile(file);
      setImportResult(result);
      setFile(null);
      await loadData({ ...filters, page: 1 }, vitrineFilters);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? value : 1 }));
  }

  function applyFilters() {
    const nextFilters = { ...filters, page: 1 };
    setFilters(nextFilters);
    loadData(nextFilters, vitrineFilters);
  }

  function setPage(page) {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    loadData(nextFilters, vitrineFilters);
  }

  function updateVitrineFilter(key, value) {
    setVitrineFilters((current) => ({ ...current, [key]: value }));
  }

  function applyVitrineFilters() {
    loadData(filters, vitrineFilters);
  }

  const weekdayLoad = vitrines?.weekday_load?.items || [];
  const employeeChart = vitrines?.employee_chart?.items || [];
  const raisedChart = vitrines?.raised_chart?.items || [];
  const loweredChart = vitrines?.lowered_chart?.items || [];
  const counterpartyChart = vitrines?.counterparty_chart?.items || [];

  return (
    <section className="panel onec-page">
      <div className="section-title">
        <div>
          <p className="eyebrow">Подсервис базы 1С</p>
          <h2>Импорт событий, поиск и витрины</h2>
          <p className="muted">Последний статус прибора считается актуальным. Счета В3/В4/В6 относятся к нашей лаборатории, остальные помечаются как субподряд. В статистике исключаются аномальные счета, которые неделю и более стоят только в статусе «Принято на склад БП/СП».</p>
        </div>
      </div>

      {error && <pre className="error-box">{error}</pre>}

      <div className="onec-layout">
        <form className="upload-panel" onSubmit={handleUpload}>
          <h3>Загрузка выгрузки 1С</h3>
          <p className="muted">Поддерживается .xlsx. Первая строка может быть заголовком: Дата, Счёт, Контрагент, грузополучатель, Услуга1, Описание работ, Количество, Статус, Штрихкод, ФИО ответственного.</p>
          <label>
            Файл .xlsx
            <input type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>
          <button className="primary" type="submit" disabled={uploading}>{uploading ? 'Загрузка...' : 'Загрузить в локальную БД'}</button>
          {importResult && (
            <div className="import-result">
              <strong>Импорт завершён</strong>
              <span>{countText(importResult.rows_created, 'строка добавлена', 'строки добавлены', 'строк добавлено')}</span>
              <span>{countText(importResult.rows_skipped_duplicates, 'дубликат пропущен', 'дубликата пропущено', 'дубликатов пропущено')}</span>
              <span>{countText(importResult.rows_invalid, 'строка с ошибкой', 'строки с ошибкой', 'строк с ошибкой')}</span>
              {importResult.invalid_rows_preview?.length > 0 && <details><summary>Первые ошибки</summary><pre>{importResult.invalid_rows_preview.join('\n')}</pre></details>}
            </div>
          )}
        </form>

        <div className="stats-panel">
          <div className="onec-stat-grid">
            <StatCard label="Принято сегодня" value={stats?.today_accepted_invoices ?? 0} hint="уникальных счетов, без аномалий" />
            <StatCard label="Выполнено сегодня" value={stats?.today_completed_invoices ?? 0} hint="статус Выполнено*" />
            <StatCard label="Выдано сегодня" value={stats?.today_issued_invoices ?? 0} hint="статус Выдан заказчику" />
            <StatCard label="Аномальные счета" value={stats?.anomaly_invoices_count ?? 0} hint="неделя+ только на складе" />
          </div>
          <div className="chart-card">
            <div className="subsection-title">
              <div>
                <h3>Когда чаще всего приходят</h3>
                <p className="muted">Поступления на склад по рабочим дням и часам 08:00–17:00 за последние {stats?.history_days || 90} дней. Подсчёт по уникальным счетам. Максимум в ячейке: {maxArrivalHour}</p>
              </div>
            </div>
            <WeekdayHourChart data={stats?.arrival_workweek_heatmap || []} />
          </div>
        </div>
      </div>

      <div className="chart-card status-showcase">
        <div className="subsection-title">
          <h3>Текущие статусы приборов</h3>
          <p className="muted">По последним событиям, без аномальных счетов и без субподряда</p>
        </div>
        <div className="status-grid">
          {(stats?.current_status_counts || []).map((item) => (
            <div className="status-count-card" key={item.status_code}>
              <span className={`onec-status status-${item.status_code}`}>{item.status_label}</span>
              <strong>{Number(item.count).toLocaleString('ru-RU')}</strong>
            </div>
          ))}
          {(stats?.current_status_counts || []).length === 0 && <p className="muted">Пока нет загруженных данных.</p>}
        </div>
      </div>

      <div className="vitrines-section">
        <div className="subsection-title">
          <div>
            <h3>Витрины данных</h3>
            <p className="muted">Даты считаются по Владивостоку UTC+10. {vitrines?.generated_at ? `Обновлено: ${formatGeneratedAt(vitrines.generated_at)}.` : ''}</p>
          </div>
          <button type="button" className="primary" onClick={applyVitrineFilters} disabled={loading}>{loading ? 'Обновление...' : 'Обновить витрины'}</button>
        </div>

        <div className="vitrine-filter-grid">
          <DataSelect label="Загрузка дней" value={vitrineFilters.load_period} options={LOAD_PERIOD_OPTIONS} emptyLabel="Период" onChange={(value) => updateVitrineFilter('load_period', value || 'current_week')} />
          <DataSelect label="Сотрудник" value={vitrineFilters.employee} options={employeeOptions} emptyLabel="Все сотрудники" onChange={(value) => updateVitrineFilter('employee', value)} />
          <DataSelect label="Статус сотрудника" value={vitrineFilters.employee_status} options={BUSINESS_STATUS_OPTIONS} emptyLabel="Статус" onChange={(value) => updateVitrineFilter('employee_status', value || 'accepted_warehouse')} />
          <DataSelect label="Период сотрудника" value={vitrineFilters.employee_period} options={PERIOD_OPTIONS_SHORT} emptyLabel="Период" onChange={(value) => updateVitrineFilter('employee_period', value || 'last_7')} />
          <DataSelect label="Период поднято/спущено" value={vitrineFilters.movement_period} options={PERIOD_OPTIONS_SHORT} emptyLabel="Период" onChange={(value) => updateVitrineFilter('movement_period', value || 'last_7')} />
          <DataSelect label="Контрагент" value={vitrineFilters.counterparty} options={counterpartyOptions} emptyLabel="Все контрагенты" onChange={(value) => updateVitrineFilter('counterparty', value)} />
          <DataSelect label="Период контрагента" value={vitrineFilters.counterparty_period} options={COUNTERPARTY_PERIOD_OPTIONS} emptyLabel="Период" onChange={(value) => updateVitrineFilter('counterparty_period', value || 'last_30')} />
          <label>
            Статус контрагента
            <select value={vitrineFilters.counterparty_status} onChange={(event) => updateVitrineFilter('counterparty_status', event.target.value)}>
              <option value="both">Принято + выдано</option>
              <option value="accepted">Только принято</option>
              <option value="issued">Только выдано</option>
            </select>
          </label>
        </div>

        <div className="vitrine-grid">
          <ChartCard title="Загрузка дней" subtitle={vitrines?.weekday_load?.caption || 'Уникальные контрагенты по рабочим дням'}>
            <SimpleBarChart
              data={weekdayLoad}
              valueKey="counterparties"
              label="Уникальные контрагенты"
              secondaryKey="percent"
              secondaryLabel="Доля от недельной загрузки"
            />
          </ChartCard>

          <ChartCard title="Подсчёт по сотруднику" subtitle={vitrines?.employee_chart?.caption || 'Уникальные счета по выбранному сотруднику и статусу'}>
            <SimpleBarChart
              data={employeeChart}
              valueKey="count"
              label={vitrines?.employee_chart?.status_label || 'Уникальные счета'}
            />
          </ChartCard>

          <ChartCard title="Поднято приборов" subtitle={vitrines?.raised_chart?.caption || 'Передано в лабораторию, уникальные счета'}>
            <SimpleBarChart
              data={raisedChart}
              valueKey="count"
              label="Передано в лабораторию, уникальные счета"
            />
          </ChartCard>

          <ChartCard title="Спущено приборов" subtitle={vitrines?.lowered_chart?.caption || 'Выполнено*, уникальные счета'}>
            <SimpleBarChart
              data={loweredChart}
              valueKey="count"
              label="Выполнено*, уникальные счета"
            />
          </ChartCard>

          <ChartCard title="Статистика по контрагенту" subtitle={vitrines?.counterparty_chart?.caption || 'Уникальные приборы по выбранному контрагенту'}>
            <SimpleBarChart
              data={counterpartyChart}
              valueKey="count"
              label={vitrines?.counterparty_chart?.status_label || 'Уникальные приборы'}
              height={360}
            />
          </ChartCard>
        </div>
      </div>

      <div className="search-panel">
        <div className="subsection-title">
          <div>
            <h3>Поиск по базе</h3>
            <p className="muted">По умолчанию выводится 50 записей на страницу.</p>
          </div>
          <button type="button" className="primary" onClick={applyFilters} disabled={loading}>{loading ? 'Поиск...' : 'Обновить'}</button>
        </div>
        <div className="filter-grid onec-search-grid">
          <label>
            Поиск
            <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Счёт, контрагент, прибор, штрихкод, ФИО" />
          </label>
          <label>
            Статус
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">Все статусы</option>
              {STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Тип счёта
            <select value={filters.own_lab} onChange={(event) => updateFilter('own_lab', event.target.value)}>
              <option value="">Все</option>
              <option value="1">В3/В4/В6</option>
              <option value="0">Субподряд</option>
            </select>
          </label>
          <label>
            Последние статусы
            <select value={filters.latest} onChange={(event) => updateFilter('latest', event.target.value)}>
              <option value="">Все события</option>
              <option value="1">Только актуальные по прибору</option>
            </select>
          </label>
          <label>
            С даты
            <input type="date" value={filters.date_from} onChange={(event) => updateFilter('date_from', event.target.value)} />
          </label>
          <label>
            По дату
            <input type="date" value={filters.date_to} onChange={(event) => updateFilter('date_to', event.target.value)} />
          </label>
          <label>
            На странице
            <select value={filters.page_size} onChange={(event) => updateFilter('page_size', Number(event.target.value))}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </label>
        </div>
      </div>

      <div className="table-toolbar">
        <span>Найдено: <strong>{eventsPage.count.toLocaleString('ru-RU')}</strong></span>
        <span>Страница {eventsPage.page} из {eventsPage.total_pages}</span>
        <div className="pager">
          <button type="button" onClick={() => setPage(eventsPage.previous)} disabled={!eventsPage.previous || loading}>Назад</button>
          <button type="button" onClick={() => setPage(eventsPage.next)} disabled={!eventsPage.next || loading}>Вперёд</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table onec-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Счёт</th>
              <th>Контрагент</th>
              <th>Статус</th>
              <th>Описание / прибор</th>
              <th>Кол-во</th>
              <th>Штрихкод</th>
              <th>Ответственный</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => <EventRow event={event} key={event.id} />)}
            {!events.length && (
              <tr><td colSpan="8" className="empty-cell">Нет данных по текущим фильтрам.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
