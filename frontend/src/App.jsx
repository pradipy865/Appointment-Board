import React, { useEffect, useState, useCallback } from "react";
import AppointmentForm from "./AppointmentForm.jsx";
import AppointmentList from "./AppointmentList.jsx";
import {
  fetchAppointments,
  createAppointment,
  updateAppointment,
  completeAppointment,
  cancelAppointment,
} from "./api.js";

export default function App() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [notice, setNotice] = useState("");

  const loadAppointments = useCallback(() => {
    setLoading(true);
    setLoadError("");
    fetchAppointments({ date: dateFilter, status: statusFilter })
      .then((data) => setAppointments(data))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [dateFilter, statusFilter]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  function showNotice(message) {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  }

  async function handleAdd(form) {
    await createAppointment(form);
    setShowAddForm(false);
    showNotice("Appointment added.");
    loadAppointments();
  }

  async function handleEditSubmit(form) {
    await updateAppointment(editingAppointment.id, form);
    setEditingAppointment(null);
    showNotice("Appointment updated.");
    loadAppointments();
  }

  async function handleComplete(id) {
    try {
      await completeAppointment(id);
      showNotice("Appointment marked as completed.");
      loadAppointments();
    } catch (err) {
      showNotice(err.message);
    }
  }

  async function handleCancel(id) {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await cancelAppointment(id);
      showNotice("Appointment cancelled.");
      loadAppointments();
    } catch (err) {
      showNotice(err.message);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Appointment Board</h1>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <section className="toolbar">
        <div className="filters">
          <label>
            Filter by date
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </label>

          <label>
            Filter by status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          {(dateFilter || statusFilter) && (
            <button
              className="secondary"
              onClick={() => {
                setDateFilter("");
                setStatusFilter("");
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        <button onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? "Close" : "Add Appointment"}
        </button>
      </section>

      {showAddForm && (
        <section className="form-panel">
          <h2>New Appointment</h2>
          <AppointmentForm
            onSubmit={handleAdd}
            onCancel={() => setShowAddForm(false)}
            submitLabel="Add Appointment"
          />
        </section>
      )}

      {editingAppointment && (
        <section className="form-panel">
          <h2>Edit Appointment</h2>
          <AppointmentForm
            initialValues={editingAppointment}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingAppointment(null)}
            submitLabel="Save Changes"
          />
        </section>
      )}

      <section className="board">
        {loading && <p>Loading appointments...</p>}
        {loadError && <p className="form-errors">{loadError}</p>}
        {!loading && !loadError && (
          <AppointmentList
            appointments={appointments}
            onEdit={setEditingAppointment}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        )}
      </section>
    </div>
  );
}
