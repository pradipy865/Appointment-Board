"""
Appointment Board - Backend API

A small Flask + SQLite service for managing team appointments.

Endpoints:
  GET    /api/appointments            list appointments (optional ?date=YYYY-MM-DD&status=scheduled|completed|cancelled)
  POST   /api/appointments            create a new appointment
  PUT    /api/appointments/<id>       edit an existing (scheduled) appointment
  POST   /api/appointments/<id>/complete   mark an appointment completed
  POST   /api/appointments/<id>/cancel     cancel an appointment

Run with:
  pip install -r requirements.txt
  python app.py
The API listens on http://localhost:5000
"""
import os
import sqlite3
from datetime import datetime, date as date_cls
from flask import Flask, jsonify, request, g
from flask_cors import CORS

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "appointments.db")
VALID_STATUSES = {"scheduled", "completed", "cancelled"}

app = Flask(__name__)
CORS(app)  

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'scheduled',
            created_at TEXT NOT NULL
        )
        """
    )
    db.commit()
    db.close()



def parse_time(value):
    """Parse HH:MM (24h) into a comparable value, or return None if invalid."""
    try:
        return datetime.strptime(value, "%H:%M").time()
    except (TypeError, ValueError):
        return None


def parse_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def validate_payload(data):
    """Validate required fields and time logic. Returns a list of error strings."""
    errors = []

    title = (data.get("title") or "").strip()
    date_str = (data.get("date") or "").strip()
    start_str = (data.get("start_time") or "").strip()
    end_str = (data.get("end_time") or "").strip()

    if not title:
        errors.append("Title is required.")
    if not date_str:
        errors.append("Date is required.")
    elif parse_date(date_str) is None:
        errors.append("Date must be in YYYY-MM-DD format.")
    if not start_str:
        errors.append("Start time is required.")
    elif parse_time(start_str) is None:
        errors.append("Start time must be in HH:MM format.")
    if not end_str:
        errors.append("End time is required.")
    elif parse_time(end_str) is None:
        errors.append("End time must be in HH:MM format.")

    # Only compare times if both parsed successfully
    if not errors and parse_time(start_str) and parse_time(end_str):
        if parse_time(end_str) <= parse_time(start_str):
            errors.append("End time must be after start time.")

    return errors


def has_conflict(db, date_str, start_str, end_str, exclude_id=None):
    """Return True if the given time range overlaps an existing, non-cancelled
    appointment on the same date."""
    start = parse_time(start_str)
    end = parse_time(end_str)
    query = (
        "SELECT id, start_time, end_time FROM appointments "
        "WHERE date = ? AND status != 'cancelled'"
    )
    params = [date_str]
    if exclude_id is not None:
        query += " AND id != ?"
        params.append(exclude_id)

    rows = db.execute(query, params).fetchall()
    for row in rows:
        existing_start = parse_time(row["start_time"])
        existing_end = parse_time(row["end_time"])
        
        if start < existing_end and end > existing_start:
            return True
    return False


def row_to_dict(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "date": row["date"],
        "start_time": row["start_time"],
        "end_time": row["end_time"],
        "status": row["status"],
        "created_at": row["created_at"],
    }



@app.route("/api/appointments", methods=["GET"])
def list_appointments():
    db = get_db()
    date_filter = request.args.get("date")
    status_filter = request.args.get("status")

    query = "SELECT * FROM appointments WHERE 1=1"
    params = []

    if date_filter:
        if parse_date(date_filter) is None:
            return jsonify({"error": "Invalid date filter, expected YYYY-MM-DD."}), 400
        query += " AND date = ?"
        params.append(date_filter)

    if status_filter:
        if status_filter not in VALID_STATUSES:
            return jsonify({"error": f"Invalid status filter. Must be one of {sorted(VALID_STATUSES)}."}), 400
        query += " AND status = ?"
        params.append(status_filter)

    query += " ORDER BY date ASC, start_time ASC"

    rows = db.execute(query, params).fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/appointments", methods=["POST"])
def create_appointment():
    data = request.get_json(silent=True) or {}
    errors = validate_payload(data)
    if errors:
        return jsonify({"errors": errors}), 400

    db = get_db()
    date_str = data["date"].strip()
    start_str = data["start_time"].strip()
    end_str = data["end_time"].strip()

    if has_conflict(db, date_str, start_str, end_str):
        return jsonify({"errors": ["That time slot overlaps with an existing appointment."]}), 409

    cursor = db.execute(
        """
        INSERT INTO appointments (title, description, date, start_time, end_time, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'scheduled', ?)
        """,
        (
            data["title"].strip(),
            (data.get("description") or "").strip(),
            date_str,
            start_str,
            end_str,
            datetime.utcnow().isoformat(),
        ),
    )
    db.commit()
    row = db.execute("SELECT * FROM appointments WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(row_to_dict(row)), 201


@app.route("/api/appointments/<int:appointment_id>", methods=["PUT"])
def update_appointment(appointment_id):
    db = get_db()
    row = db.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Appointment not found."}), 404

    if row["status"] != "scheduled":
        return jsonify({"errors": ["Only scheduled appointments can be edited."]}), 400

    data = request.get_json(silent=True) or {}
    errors = validate_payload(data)
    if errors:
        return jsonify({"errors": errors}), 400

    date_str = data["date"].strip()
    start_str = data["start_time"].strip()
    end_str = data["end_time"].strip()

    if has_conflict(db, date_str, start_str, end_str, exclude_id=appointment_id):
        return jsonify({"errors": ["That time slot overlaps with an existing appointment."]}), 409

    db.execute(
        """
        UPDATE appointments
        SET title = ?, description = ?, date = ?, start_time = ?, end_time = ?
        WHERE id = ?
        """,
        (
            data["title"].strip(),
            (data.get("description") or "").strip(),
            date_str,
            start_str,
            end_str,
            appointment_id,
        ),
    )
    db.commit()
    updated = db.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    return jsonify(row_to_dict(updated))


@app.route("/api/appointments/<int:appointment_id>/complete", methods=["POST"])
def complete_appointment(appointment_id):
    db = get_db()
    row = db.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Appointment not found."}), 404
    if row["status"] != "scheduled":
        return jsonify({"errors": ["Only scheduled appointments can be marked completed."]}), 400

    db.execute("UPDATE appointments SET status = 'completed' WHERE id = ?", (appointment_id,))
    db.commit()
    updated = db.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    return jsonify(row_to_dict(updated))


@app.route("/api/appointments/<int:appointment_id>/cancel", methods=["POST"])
def cancel_appointment(appointment_id):
    db = get_db()
    row = db.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Appointment not found."}), 404
    if row["status"] != "scheduled":
        return jsonify({"errors": ["Only scheduled appointments can be cancelled."]}), 400

    db.execute("UPDATE appointments SET status = 'cancelled' WHERE id = ?", (appointment_id,))
    db.commit()
    updated = db.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    return jsonify(row_to_dict(updated))


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
else:
   
    init_db()
