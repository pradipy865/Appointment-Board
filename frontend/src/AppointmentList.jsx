import React from "react";

function formatTime(t) {
  return t;
}

export default function AppointmentList({
  appointments,
  onEdit,
  onComplete,
  onCancel,
}) {
  if (appointments.length === 0) {
    return <p className="empty-state">No appointments match the current filters.</p>;
  }

  return (
    <table className="appointment-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Description</th>
          <th>Date</th>
          <th>Time</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {appointments.map((a) => (
          <tr key={a.id} className={`status-row status-${a.status}`}>
            <td>{a.title}</td>
            <td className="description-cell">{a.description}</td>
            <td>{a.date}</td>
            <td>
              {formatTime(a.start_time)} - {formatTime(a.end_time)}
            </td>
            <td>
              <span className={`status-badge status-${a.status}`}>{a.status}</span>
            </td>
            <td className="actions-cell">
              {a.status === "scheduled" && (
                <>
                  <button onClick={() => onEdit(a)}>Edit</button>
                  <button onClick={() => onComplete(a.id)}>Complete</button>
                  <button className="danger" onClick={() => onCancel(a.id)}>
                    Cancel
                  </button>
                </>
              )}
              {a.status !== "scheduled" && <span className="no-actions">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
