import { useState } from 'react';
import { api } from '../api.js';
import { formatDateLong, formatDateTime } from '../dateUtils.js';
import AttachmentGallery from './AttachmentGallery.jsx';

export default function TaskCard({ task, onChanged, compact = false }) {
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(task.planned_date || '');
  const [status, setStatus] = useState(task.status);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = async (patch) => {
    setBusy(true);
    setError('');
    try {
      await api.updateTask(task.id, patch);
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveComment = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.addTaskComment(task.id, comment.trim());
      setComment('');
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadFiles = async () => {
    if (!files.length) return;
    setBusy(true);
    setError('');
    try {
      for (const file of files) {
        await api.uploadTaskAttachment(task.id, file);
      }
      setFiles([]);
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeTask = async () => {
    if (!confirm('Удалить задачу?')) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteTask(task.id);
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`item-card task-card task-status-${task.status} ${compact ? 'compact-card' : ''}`}>
      <div className="task-header">
        <div>
          <div className="task-kicker task-type">Задача</div>
          <h3>{task.title}</h3>
        </div>
        <span className={`status-pill task-status-${task.status}`}>{task.status_label}</span>
      </div>

      {task.description && <p className="task-description">{task.description}</p>}

      <div className="task-meta">
        <span>{task.planned_date ? formatDateLong(task.planned_date) : 'Дата не назначена'}</span>
        {task.planned_time && <span>{task.planned_time.slice(0, 5)}</span>}
      </div>

      {!!task.requests?.length && (
        <div className="chips">
          {task.requests.map((request) => <span key={request.id} className="chip task-chip">{request.number}</span>)}
        </div>
      )}

      {!compact && (
        <>
          <div className="task-controls">
            <label>
              Статус
              <select value={status} disabled={busy} onChange={(e) => { setStatus(e.target.value); update({ status: e.target.value }); }}>
                <option value="not_started">Не начато</option>
                <option value="in_progress">Начато</option>
                <option value="done">Выполнено</option>
              </select>
            </label>
            <label>
              Дата
              <input type="date" value={date} disabled={busy} onChange={(e) => setDate(e.target.value)} />
            </label>
            <button className="small" disabled={busy} onClick={() => update({ planned_date: date || null })}>Назначить</button>
            <button className="small ghost" disabled={busy} onClick={() => { setDate(''); update({ planned_date: null }); }}>Убрать дату</button>
            <button className="small danger" disabled={busy} onClick={removeTask}>Удалить</button>
          </div>

          <div className="comments">
            <h4>Комментарии</h4>
            {task.comments?.length ? task.comments.map((item) => (
              <div key={item.id} className="comment">
                <time>{formatDateTime(item.created_at)}</time>
                <p>{item.text}</p>
              </div>
            )) : <p className="muted">Комментариев пока нет.</p>}
            <div className="comment-form">
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Добавить комментарий" />
              <button className="small" disabled={busy} onClick={saveComment}>Добавить</button>
            </div>
          </div>

          <div className="attachments">
            <h4>Вложения</h4>
            <AttachmentGallery attachments={task.attachments || []} />
            <div className="upload-row">
              <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              <button className="small" disabled={busy || !files.length} onClick={uploadFiles}>Загрузить</button>
            </div>
          </div>
        </>
      )}

      {error && <pre className="error-box">{error}</pre>}
    </article>
  );
}
