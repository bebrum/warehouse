export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
export const BACKEND_ROOT = API_URL.replace(/\/api\/?$/, '');

function buildHeaders(options) {
  if (options.body instanceof FormData) {
    return options.headers || undefined;
  }
  return {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
}

function errorMessageFromPayload(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload || fallback;
  if (payload.detail) return payload.detail;
  if (payload.error) return payload.error;
  if (payload.message) return payload.message;
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return fallback;
  }
}

async function readResponseBody(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (isJson) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildHeaders(options),
  });

  // Важно: тело Response можно прочитать только один раз.
  // Поэтому сначала читаем его в payload, а потом используем payload и для ok, и для ошибок.
  const payload = await readResponseBody(response);

  if (!response.ok) {
    const fallback = `Ошибка API: ${response.status} ${response.statusText || ''}`.trim();
    throw new Error(errorMessageFromPayload(payload, fallback));
  }

  return payload;
}

const withQuery = (path, params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  return `${path}${search.toString() ? `?${search}` : ''}`;
};

export const api = {
  listTasks: (params = {}) => request(withQuery('/tasks/', params)),
  createTask: (payload) => request('/tasks/', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id, payload) => request(`/tasks/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTask: (id) => request(`/tasks/${id}/`, { method: 'DELETE' }),
  addTaskComment: (task, text) => request('/task-comments/', { method: 'POST', body: JSON.stringify({ task, text }) }),
  uploadTaskAttachment: (task, file) => {
    const form = new FormData();
    form.append('task', task);
    form.append('file', file);
    return request('/task-attachments/', { method: 'POST', body: form });
  },

  listDeliveries: (params = {}) => request(withQuery('/deliveries/', params)),
  createDelivery: (payload) => request('/deliveries/', { method: 'POST', body: JSON.stringify(payload) }),
  updateDelivery: (id, payload) => request(`/deliveries/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteDelivery: (id) => request(`/deliveries/${id}/`, { method: 'DELETE' }),
  addDeliveryComment: (delivery, text) => request('/delivery-comments/', { method: 'POST', body: JSON.stringify({ delivery, text }) }),
  uploadDeliveryAttachment: (delivery, file) => {
    const form = new FormData();
    form.append('delivery', delivery);
    form.append('file', file);
    return request('/delivery-attachments/', { method: 'POST', body: form });
  },
  uploadBoxAttachment: (box, file) => {
    const form = new FormData();
    form.append('box', box);
    form.append('file', file);
    return request('/box-attachments/', { method: 'POST', body: form });
  },

  listDayNotes: (params = {}) => request(withQuery('/day-notes/', params)),
  createDayNote: (payload) => request('/day-notes/', { method: 'POST', body: JSON.stringify(payload) }),
  updateDayNote: (id, payload) => request(`/day-notes/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),

  uploadOneCFile: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/onec-imports/upload/', { method: 'POST', body: form });
  },
  listOneCEvents: (params = {}) => request(withQuery('/onec-events/', params)),
  oneCStats: (params = {}) => request(withQuery('/onec-events/stats/', params)),
  oneCVitrines: (params = {}) => request(withQuery('/onec-events/vitrines/', params)),
  oneCDictionaries: () => request('/onec-events/dictionaries/'),
  oneCStatusChoices: (params = {}) => request(withQuery('/onec-events/status-choices/', params)),
};
