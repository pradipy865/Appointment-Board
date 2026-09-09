# Appointment Board

A simple appointment board for a small team: view, add, edit, complete, and
cancel appointments, with filtering by date/status and double-booking
prevention.

- **Backend:** Python (Flask) + SQLite
- **Frontend:** React (Vite), plain CSS

## Project structure

```
appointment-board/
  backend/
    app.py             Flask API (creates appointments.db on first run)
    requirements.txt
  frontend/
    src/
      App.jsx           Main app: filters, add/edit panels, notices
      AppointmentForm.jsx  Shared form for add & edit
      AppointmentList.jsx  Table/board of appointments
      api.js             fetch() wrappers for the backend API
      App.css
    index.html
    package.json
    vite.config.js
```

## Running the backend

cd backend
pip install -r requirements.txt
python app.py

## Running the frontend

cd frontend
npm install
npm run dev

