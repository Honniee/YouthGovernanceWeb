const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// ============================================================================
// COUNCIL ROLES
// ============================================================================

export async function getCouncilRoles() {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/council/roles`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!res.ok) throw new Error('Failed to fetch council roles');
  const json = await res.json();
  return json?.data || [];
}

export async function createRole(payload) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/council/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to create role');
  const json = await res.json();
  return json?.data;
}

export async function updateRole(id, payload) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/council/roles/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to update role');
  const json = await res.json();
  return json?.data;
}

export async function deleteRole(id) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/council/roles/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to delete role');
  const json = await res.json();
  return json?.success;
}

// ============================================================================
// COUNCIL MEMBERS
// ============================================================================

export async function getCouncilMembers() {
  const res = await fetch(`${API_BASE}/council/members`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to fetch council members');
  const json = await res.json();
  return json?.data || [];
}

export async function getAllCouncilMembers() {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/council/members/all`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!res.ok) throw new Error('Failed to fetch council members');
  const json = await res.json();
  return json?.data || [];
}

export async function createMember(payload) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/council/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to create member');
  }
  return json?.data;
}

export async function updateMember(id, payload) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/council/members/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to update member');
  const json = await res.json();
  return json?.data;
}

export async function deleteMember(id) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/council/members/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to delete member');
  const json = await res.json();
  return json?.success;
}

export async function bulkUpdateMembers(ids, action) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/council/members/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include',
    body: JSON.stringify({ ids, action })
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || 'Failed to perform bulk operation');
  }
  return await res.json();
}

// ============================================================================
// COUNCIL PAGE
// ============================================================================

export async function getCouncilPage() {
  const res = await fetch(`${API_BASE}/council/page`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to fetch council page');
  const json = await res.json();
  return json?.data || { hero_url_1: null, hero_url_2: null, hero_url_3: null };
}

export async function updateCouncilPage(payload) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/council/page`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to update council page');
  const json = await res.json();
  return json?.data;
}

export async function uploadCouncilHero(idx, file) {
  const token = localStorage.getItem('authToken');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/council/page/hero/${idx}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include',
    body: form
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to upload hero');
  }
  return json;
}

export async function logExport(format, type, count, exportType = 'all') {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/council/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include',
    body: JSON.stringify({ format, type, count, exportType })
  });
  if (!res.ok) {
    console.error('Failed to log export');
  }
  return res.json().catch(() => ({ success: false }));
}

export default { 
  // Roles
  getCouncilRoles,
  createRole,
  updateRole,
  deleteRole,
  // Members
  getCouncilMembers,
  getAllCouncilMembers,
  createMember,
  updateMember,
  deleteMember,
  bulkUpdateMembers,
  // Page
  getCouncilPage,
  updateCouncilPage,
  uploadCouncilHero,
  // Export
  logExport
};
