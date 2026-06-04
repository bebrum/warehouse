import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatRequestNumbersError, parseRequestNumbers } from '../requestNumbers.js';

const emptyForm = {
  title: '',
  description: '',
  status: 'not_started',
  planned_date: '',
  planned_time: '',
  request_numbers: '',
};

export default function TaskForm({ defaultDate = '', onSaved, onCancel }) {
  const [form, setForm] = useState({ ...emptyForm, planned_date: defaultDate || '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const requestNumbers = useMemo(() => parseRequestNumbers(form.request_numbers), [form.request_numbers]);
  const requestError = useMemo(() => formatRequestNumbersError(requestNumbers), [requestNumbers]);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (requestError) {
      setError(requestError);
      return;
    }
    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        planned_date: form.planned_date || null,
        planned_time: form.planned_time || null,
        request_numbers: requestNumbers,
      };

      const task = await api.createTask(payload);
      for (const file of files) {
        await api.uploadTaskAttachment(task.id, file);
      }
      setForm({ ...emptyForm, planned_date: defaultDate || '' });
      setFiles([]);
      await onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="task-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Поручение
          <input value={form.title} onChange={(e) => setField('title', e.target.value)} required placeholder="Краткое название задачи" />
        </label>

        <label>
          Статус
          <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
            <option value="not_started">Не начато</option>
            <option value="in_progress">Начато</option>
            <option value="done">Выполнено</option>
          </select>
        </label>

        <label>
          Дата
          <input type="date" value={form.planned_date || ''} onChange={(e) => setField('planned_date', e.target.value)} />
        </label>

        <label>
          Время
          <input type="time" value={form.planned_time || ''} onChange={(e) => setField('planned_time', e.target.value)} />
        </label>
      </div>

      <label>
        Номера заявок/счетов
        <input value={form.request_numbers} onChange={(e) => setField('request_numbers', e.target.value)} placeholder="Счёт вида В3-00516/26" />
      </label>
      {requestError && <div className="field-error">{requestError}</div>}
      {!!requestNumbers.length && !requestError && (
        <div className="chips">{requestNumbers.map((number) => <span key={number} className="chip task-chip">{number}</span>)}</div>
      )}

      <label>
        Описание
        <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Комментарий" />
      </label>

      <label>
        Фото / картинки к задаче
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
      </label>

      {error && <pre className="error-box">{error}</pre>}

      <div className="form-actions">
        <button className="primary" disabled={saving || !!requestError}>{saving ? 'Сохраняю...' : 'Сохранить задачу'}</button>
        {onCancel && <button type="button" className="ghost" onClick={onCancel}>Отмена</button>}
      </div>
    </form>
  );
}
