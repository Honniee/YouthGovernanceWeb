const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const endpoint = `${API_BASE}/system/notice`;

// Helper function to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function getSystemNotice() {
  const res = await fetch(endpoint, { 
    credentials: 'include',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch system notice');
  return res.json();
}

export async function updateSystemNotice(payload) {
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to update system notice');
  return res.json();
}

export default { getSystemNotice, updateSystemNotice };



