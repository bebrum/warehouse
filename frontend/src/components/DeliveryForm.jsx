import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatRequestNumbersError, parseRequestNumbers } from '../requestNumbers.js';

const emptyDelivery = {
  title: '',
  description: '',
  status: 'expected',
  expected_date: '',
  received_date: '',
  dispatch_date: '',
  dispatch_time: '',
  courier_name: '',
  tracking_number: '',
  sender: '',
  recipient: '',
  storage_place: '',
};

const emptyBox = () => ({ box_code: '', note: '', request_numbers: '', files: [] });

export default function DeliveryForm({ defaultDate = '', defaultDateField = 'expected_date', onSaved, onCancel }) {
  const [form, setForm] = useState({ ...emptyDelivery, [defaultDateField]: defaultDate || '' });
  const [boxes, setBoxes] = useState([emptyBox()]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const preparedBoxes = useMemo(() => boxes.map((box, index) => {
    const numbers = parseRequestNumbers(box.request_numbers);
    return {
      ...box,
      box_code: box.box_code.trim() || `Коробка ${index + 1}`,
      request_numbers: numbers,
      error: formatRequestNumbersError(numbers),
    };
  }), [boxes]);

  const hasBoxError = preparedBoxes.some((box) => box.error || !box.request_numbers.length);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setBoxField = (index, field, value) => setBoxes((current) => current.map((box, boxIndex) => boxIndex === index ? { ...box, [field]: value } : box));
  const setBoxFiles = (index, value) => setBoxes((current) => current.map((box, boxIndex) => boxIndex === index ? { ...box, files: value } : box));
  const addBox = () => setBoxes((current) => [...current, emptyBox()]);
  const removeBox = (index) => setBoxes((current) => current.length === 1 ? current : current.filter((_, boxIndex) => boxIndex !== index));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (hasBoxError) {
      setError('Проверь коробки: у каждой должен быть минимум один счёт в формате В3-00516/26.');
      return;
    }
    setSaving(true);

    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        expected_date: form.expected_date || null,
        received_date: form.received_date || null,
        dispatch_date: form.dispatch_date || null,
        dispatch_time: form.dispatch_time || null,
        boxes_data: preparedBoxes.map((box) => ({
          box_code: box.box_code,
          note: box.note.trim(),
          request_numbers: box.request_numbers,
        })),
      };

      const delivery = await api.createDelivery(payload);
      for (const file of files) {
        await api.uploadDeliveryAttachment(delivery.id, file);
      }
      for (const [index, sourceBox] of boxes.entries()) {
        const savedBox = delivery.boxes?.[index];
        if (!savedBox) continue;
        for (const file of sourceBox.files || []) {
          await api.uploadBoxAttachment(savedBox.id, file);
        }
      }
      setForm({ ...emptyDelivery, [defaultDateField]: defaultDate || '' });
      setBoxes([emptyBox()]);
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
          Название доставки
          <input value={form.title} onChange={(e) => setField('title', e.target.value)} required placeholder="Название доставки" />
        </label>

        <label>
          Состояние
          <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
            <option value="expected">Ожидается</option>
            <option value="received">Принята</option>
            <option value="assembling">Собирается к отправке</option>
            <option value="ready">Готова к отправке</option>
            <option value="shipped">Отправлена</option>
            <option value="done">Завершена</option>
            <option value="cancelled">Отменена</option>
          </select>
        </label>

        <label>
          Должна приехать
          <input type="date" value={form.expected_date || ''} onChange={(e) => setField('expected_date', e.target.value)} />
        </label>

        <label>
          Принята
          <input type="date" value={form.received_date || ''} onChange={(e) => setField('received_date', e.target.value)} />
        </label>

        <label>
          Собрать/отправить
          <input type="date" value={form.dispatch_date || ''} onChange={(e) => setField('dispatch_date', e.target.value)} />
        </label>

        <label>
          Время отправки
          <input type="time" value={form.dispatch_time || ''} onChange={(e) => setField('dispatch_time', e.target.value)} />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Курьер / служба
          <input value={form.courier_name} onChange={(e) => setField('courier_name', e.target.value)} placeholder="Название службы или ФИО" />
        </label>
        <label>
          Трек / накладная
          <input value={form.tracking_number} onChange={(e) => setField('tracking_number', e.target.value)} placeholder="Значение" />
        </label>
        <label>
          Откуда
          <input value={form.sender} onChange={(e) => setField('sender', e.target.value)} placeholder="Значение" />
        </label>
        <label>
          Куда
          <input value={form.recipient} onChange={(e) => setField('recipient', e.target.value)} placeholder="Значение" />
        </label>
        <label>
          Место хранения
          <input value={form.storage_place} onChange={(e) => setField('storage_place', e.target.value)} placeholder="Значение" />
        </label>
      </div>

      <label>
        Описание
        <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Комментарий" />
      </label>

      <section className="box-editor">
        <div className="subsection-title">
          <div>
            <h3>Коробки и счета</h3>
            <p className="muted">Каждая коробка хранит один или несколько счетов. Номера автоматически нормализуются и привязываются к коробке.</p>
          </div>
          <button type="button" className="small" onClick={addBox}>+ Коробка</button>
        </div>

        {boxes.map((box, index) => {
          const prepared = preparedBoxes[index];
          return (
            <div key={index} className="box-form-card">
              <div className="box-form-header">
                <strong>Коробка {index + 1}</strong>
                <button type="button" className="small danger" disabled={boxes.length === 1} onClick={() => removeBox(index)}>Удалить</button>
              </div>
              <div className="form-grid">
                <label>
                  Маркировка коробки
                  <input value={box.box_code} onChange={(e) => setBoxField(index, 'box_code', e.target.value)} placeholder={`Коробка ${index + 1}`} />
                </label>
                <label>
                  Счета в коробке
                  <input value={box.request_numbers} onChange={(e) => setBoxField(index, 'request_numbers', e.target.value)} required placeholder="Счёт вида В3-00516/26" />
                </label>
              </div>
              {!!prepared.request_numbers.length && !prepared.error && (
                <div className="chips">{prepared.request_numbers.map((number) => <span key={number} className="chip delivery-chip">{number}</span>)}</div>
              )}
              {prepared.error && <div className="field-error">{prepared.error}</div>}
              {!prepared.request_numbers.length && <div className="field-hint">Добавь минимум один счёт для этой коробки.</div>}
              <label>
                Комментарий к коробке
                <textarea value={box.note} onChange={(e) => setBoxField(index, 'note', e.target.value)} placeholder="Комментарий" />
              </label>
              <label>
                Фото коробки
                <input type="file" accept="image/*" multiple onChange={(e) => setBoxFiles(index, Array.from(e.target.files || []))} />
              </label>
              {!!box.files?.length && <div className="field-hint">Выбрано файлов: {box.files.length}</div>}
            </div>
          );
        })}
      </section>

      <label>
        Фото / картинки доставки
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
      </label>

      {error && <pre className="error-box">{error}</pre>}

      <div className="form-actions">
        <button className="primary delivery-primary" disabled={saving || hasBoxError}>{saving ? 'Сохраняю...' : 'Сохранить доставку'}</button>
        {onCancel && <button type="button" className="ghost" onClick={onCancel}>Отмена</button>}
      </div>
    </form>
  );
}
