import React, { useState, useEffect } from "react";

const emptyForm = {
  title: "",
  description: "",
  date: "",
  start_time: "",
  end_time: "",
};

export default function AppointmentForm({ initialValues, onSubmit, onCancel, submitLabel }) {
  const [form, setForm] = useState(initialValues || emptyForm);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(initialValues || emptyForm);
  }, [initialValues]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);

    const clientErrors = [];
    if (!form.title.trim()) clientErrors.push("Title is required.");
    if (!form.date) clientErrors.push("Date is required.");
    if (!form.start_time) clientErrors.push("Start time is required.");
    if (!form.end_time) clientErrors.push("End time is required.");
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      clientErrors.push("End time must be after start time.");
    }
    if (clientErrors.length) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="appointment-form" onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <div className="form-errors">
          {errors.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
        </div>
      )}

      <label>
        Title *
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          maxLength={120}
        />
      </label>

      <label>
        Description
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
        />
      </label>

      <div className="form-row">
        <label>
          Date *
          <input type="date" name="date" value={form.date} onChange={handleChange} />
        </label>
        <label>
          Start time *
          <input
            type="time"
            name="start_time"
            value={form.start_time}
            onChange={handleChange}
          />
        </label>
        <label>
          End time *
          <input type="time" name="end_time" value={form.end_time} onChange={handleChange} />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
