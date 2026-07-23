const API_BASE = 'http://localhost:3001/api/admin';

export async function createAccount(data: Record<string, any>) {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function assignTherapist(therapistId: number, studentId: number) {
  const res = await fetch(`${API_BASE}/assign-therapist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ therapistId, studentId }),
  });
  return res.json();
}