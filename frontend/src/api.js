const API_BASE = "http://localhost:5000/api";

async function handleResponse(res) {
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
  
  }
  if (!res.ok) {
    const message =
      (body && (body.errors ? body.errors.join(" ") : body.error)) ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return body;
}

export function fetchAppointments({ date, status } = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (status) params.set("status", status);
  const query = params.toString();
  return fetch(`${API_BASE}/appointments${query ? `?${query}` : ""}`).then(
    handleResponse
  );
}

export function createAppointment(data) {
  return fetch(`${API_BASE}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);
}

export function updateAppointment(id, data) {
  return fetch(`${API_BASE}/appointments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);
}

export function completeAppointment(id) {
  return fetch(`${API_BASE}/appointments/${id}/complete`, {
    method: "POST",
  }).then(handleResponse);
}

export function cancelAppointment(id) {
  return fetch(`${API_BASE}/appointments/${id}/cancel`, {
    method: "POST",
  }).then(handleResponse);
}
