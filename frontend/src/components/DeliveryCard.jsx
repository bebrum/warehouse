import { useState } from 'react';
import { api } from '../api.js';
import { formatDateLong, formatDateTime } from '../dateUtils.js';
import AttachmentGallery from './AttachmentGallery.jsx';

const deliveryStatuses = [
  ['expected', 'Ожидается'],
  ['received', 'Принята'],
  ['assembling', 'Собирается к отправке'],
  ['ready', 'Готова к отправке'],
  ['shipped', 'Отправлена'],
  ['done', 'Завершена'],
  ['cancelled', 'Отменена'],
];

export default function DeliveryCard({ delivery, onChanged, compact = false }) {
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState(delivery.status);
  const [expectedDate, setExpectedDate] = useState(delivery.expected_date || '');
  const [receivedDate, setReceivedDate] = useState(delivery.received_date || '');
  const [dispatchDate, setDispatchDate] = useState(delivery.dispatch_date || '');
  const [files, setFiles] = useState([]);
  const [boxFiles, setBoxFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = async (patch) => {
    setBusy(true);
    setError('');
    try {
      await api.updateDelivery(delivery.id, patch);
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
      await api.addDeliveryComment(delivery.id, comment.trim());
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
        await api.uploadDeliveryAttachment(delivery.id, file);
      }
      setFiles([]);
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadBoxFiles = async (boxId) => {
    const selected = boxFiles[boxId] || [];
    if (!selected.length) return;
    setBusy(true);
    setError('');
    try {
      for (const file of selected) {
        await api.uploadBoxAttachment(boxId, file);
      }
      setBoxFiles((current) => ({ ...current, [boxId]: [] }));
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeDelivery = async () => {
    if (!confirm('Удалить курьерскую доставку?')) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteDelivery(delivery.id);
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`item-card delivery-card delivery-status-${delivery.status} ${compact ? 'compact-card' : ''}`}>
      <div className="task-header">
        <div>
          <div className="task-kicker delivery-type">Курьерская доставка</div>
          <h3>{delivery.title}</h3>
        </div>
        <span className={`status-pill delivery-status-${delivery.status}`}>{delivery.status_label}</span>
      </div>

      {delivery.description && <p className="task-description">{delivery.description}</p>}

      <div className="delivery-dates">
        <span>Приезд: {delivery.expected_date ? formatDateLong(delivery.expected_date) : 'не назначен'}</span>
        <span>Принята: {delivery.received_date ? formatDateLong(delivery.received_date) : 'нет'}</span>
        <span>Отправка: {delivery.dispatch_date ? formatDateLong(delivery.dispatch_date) : 'не назначена'}{delivery.dispatch_time ? `, ${delivery.dispatch_time.slice(0, 5)}` : ''}</span>
      </div>

      <div className="courier-summary">
        {delivery.courier_name && <span>Курьер/служба: <strong>{delivery.courier_name}</strong></span>}
        {delivery.tracking_number && <span>Трек/накладная: <strong>{delivery.tracking_number}</strong></span>}
        {(delivery.sender || delivery.recipient) && <span>{delivery.sender || '—'} → {delivery.recipient || '—'}</span>}
        {delivery.storage_place && <span>Хранение: {delivery.storage_place}</span>}
      </div>

      {!!delivery.boxes?.length && (
        <div className="box-list">
          <h4>Коробки</h4>
          {delivery.boxes.map((box) => (
            <div key={box.id} className="box-row">
              <strong>{box.box_code || `Коробка #${box.id}`}</strong>
              <div className="chips">
                {box.requests.map((request) => <span key={request.id} className="chip delivery-chip">{request.number}</span>)}
              </div>
              {box.note && <p>{box.note}</p>}
              <AttachmentGallery attachments={box.attachments || []} />
              {!compact && (
                <div className="upload-row box-upload-row">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setBoxFiles((current) => ({ ...current, [box.id]: Array.from(e.target.files || []) }))}
                  />
                  <button className="small" disabled={busy || !(boxFiles[box.id] || []).length} onClick={() => uploadBoxFiles(box.id)}>Загрузить фото коробки</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!compact && (
        <>
          <div className="task-controls">
            <label>
              Состояние
              <select value={status} disabled={busy} onChange={(e) => { setStatus(e.target.value); update({ status: e.target.value }); }}>
                {deliveryStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              Приезд
              <input type="date" value={expectedDate} disabled={busy} onChange={(e) => setExpectedDate(e.target.value)} />
            </label>
            <label>
              Приёмка
              <input type="date" value={receivedDate} disabled={busy} onChange={(e) => setReceivedDate(e.target.value)} />
            </label>
            <label>
              Отправка
              <input type="date" value={dispatchDate} disabled={busy} onChange={(e) => setDispatchDate(e.target.value)} />
            </label>
            <button className="small" disabled={busy} onClick={() => update({ expected_date: expectedDate || null, received_date: receivedDate || null, dispatch_date: dispatchDate || null })}>Сохранить даты</button>
            <button className="small danger" disabled={busy} onClick={removeDelivery}>Удалить</button>
          </div>

          <div className="comments">
            <h4>Комментарии</h4>
            {delivery.comments?.length ? delivery.comments.map((item) => (
              <div key={item.id} className="comment">
                <time>{formatDateTime(item.created_at)}</time>
                <p>{item.text}</p>
              </div>
            )) : <p className="muted">Комментариев пока нет.</p>}
            <div className="comment-form">
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Добавить комментарий по доставке" />
              <button className="small" disabled={busy} onClick={saveComment}>Добавить</button>
            </div>
          </div>

          <div className="attachments">
            <h4>Вложения доставки</h4>
            <AttachmentGallery attachments={delivery.attachments || []} />
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
