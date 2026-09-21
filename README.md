# SmartOPD – Intelligent Hospital OPD Queue Management System

A web app that replaces paper tokens and crowded waiting rooms in a hospital's Out-Patient Department (OPD).
Patients register and get a digital token, staff call patients from a dashboard, and a public screen (with voice
announcements) shows who is being served.

---

## 1. The problem

In many hospitals, OPD patients stand in long lines just to get a paper token, and nobody knows how long they will wait.
Staff call names by shouting, tokens get lost, and there are no numbers to show which department is busiest.

## 2. The solution

SmartOPD gives every patient a **digital token per department**, keeps a **first-come-first-served (FIFO) queue** in a
MySQL database, lets staff run the queue with one button, and shows the live queue on the patient's phone and on a
waiting-room TV. It also shows an **estimated waiting time** and simple **statistics** for the hospital.

## 3. Features

- Patient registration with form validation (frontend **and** backend)
- Department selection and token generation (e.g. `GM-01`, `CAR-03`)
- Live patient status page: position in queue, patients ahead, estimated wait
- Staff login (JWT + bcrypt) and a staff dashboard
- **Call Next**, **Complete**, **Complete & Call Next** and **Cancel**
- Multiple departments, each with its own separate queue and token numbers
- Public waiting-room display (no login) with **voice announcements**
- Waiting-time estimate that uses the number of active doctors and past service times
- Statistics: totals, department-wise numbers, peak hours
- Python analytics script for historical analysis
- Responsive design (desktop, laptop, tablet, mobile)
- Normal web-app navigation: every page has its own URL, the **← Back / Forward →** buttons and the browser's own
  Back/Forward buttons move between SmartOPD pages, and refreshing keeps you on the same page (see "Navigation" below)

## 4. Patient flow

1. Open the site and click **Patient** → **Continue as Patient**.
2. Fill in name, age, gender and mobile number → **Register & Continue** (saved in MySQL).
3. Choose a department (General Medicine, Cardiology, …).
4. The token is generated and shown: *Your Token: GM-01, Status: WAITING*.
5. Click **View Queue Status**. The page refreshes every 5 seconds and shows position, patients ahead and the
   estimated wait, then "It is your turn" when the token is called.

## 5. Staff flow

1. Click **Staff** and log in (employee ID + password).
2. The dashboard opens on the staff member's own department. Tabs switch between departments.
3. It shows the token being served, the waiting list with positions, and buttons:
   - **Call Next** – serve the oldest waiting patient (only when nobody is being served)
   - **Complete** – finish the current patient
   - **Complete & Call Next** – finish the current patient and call the next one in one step (main button)
   - **Cancel** – cancel a waiting token
4. **Statistics** opens the hospital statistics page. **Logout** clears the login.

## 6. Queue flow

```
Patient registers ──► token created (WAITING)
                              │
                 Call Next / Complete & Call Next
                              ▼
                       SERVING  ──► Complete ──► COMPLETED
   WAITING ──► Cancel ──► CANCELLED
```

- Statuses: `WAITING`, `SERVING`, `COMPLETED`, `CANCELLED`.
- **FIFO:** the oldest `WAITING` token in that department is always called first. Cancelled and completed tokens are skipped.
- Only one token per department is `SERVING` at a time. Invalid moves (e.g. cancelling a serving token) return `409`.
- Every queue change runs in a **database transaction** protected by a per-department lock, so two staff clicking at the
  same time can never call the same patient twice.

## 7. Architecture

```
 ┌─────────────┐   HTTP + JSON    ┌───────────────────┐   SQL (prepared)   ┌────────┐
 │ React (Vite)│ ───────────────► │ Node.js + Express │ ─────────────────► │ MySQL  │
 │  browser    │ ◄─────────────── │    REST API       │ ◄───────────────── │        │
 └─────────────┘  poll every 5 s  └───────────────────┘                    └────────┘
                                                                                ▲
                                        Python analytics (read-only SELECTs) ───┘
```

Backend layers: `routes` → `controllers` (validate input) → `services` (business logic + SQL) → MySQL.
Shared pieces: `middleware` (JWT check, error handler), `config` (database pool, JWT, env check), `utils` (validators).

## 8. Tech stack

| Part | Technology |
|---|---|
| Frontend | React 19, JavaScript, CSS, Vite |
| Backend | Node.js, Express 5 |
| Database | MySQL 8 (`mysql2` driver) |
| Security | JWT (`jsonwebtoken`), bcrypt, CORS |
| Analytics | Python 3 + `mysql-connector-python` |

## 9. Project structure

```
smartopd/
├── backend/            Express API
│   └── src/  config/ controllers/ middleware/ routes/ services/ utils/ server.js
├── frontend/           React app
│   └── src/  components/ hooks/ pages/ services/ App.jsx navigation.js main.jsx
├── database/schema.sql Tables + demo data
├── analytics/          analysis.py, requirements.txt, README.md
└── README.md
```

## 10. Database tables

| Table | Purpose | Key columns |
|---|---|---|
| `hospitals` | The hospital | name, city |
| `departments` | OPD departments | hospital_id → hospitals, name, code (GM, CAR), average_service_minutes |
| `doctors` | Doctors and rooms | hospital_id, department_id → departments, room_number, is_active |
| `staff` | Staff who can log in | employee_id (unique), password_hash (bcrypt), role, department_id |
| `patients` | Registered patients | name, age, gender, mobile |
| `tokens` | One row per queue token | patient_id → patients, department_id → departments, token_number, status, created_at, called_at, completed_at |

`tokens` has a unique key on (`department_id`, `token_number`), so a token number can never be repeated in a department.

## 11. API overview

Base URL: `http://localhost:5000/api`. Errors always look like `{ "success": false, "message": "..." }`.

**Public** (no login)

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/health` | Checks the server and MySQL connection |
| GET | `/departments` | List departments |
| POST | `/patients` | Register a patient |
| POST | `/tokens` | Generate a token `{ patientId, departmentId }` |
| GET | `/tokens/:id` | Token status, position, estimated wait |
| GET | `/queue/:departmentId` | Serving token, waiting tokens with positions |
| POST | `/auth/login` | Staff login → JWT |

**Staff only** (header `Authorization: Bearer <token>`)

| Method | Endpoint | What it does |
|---|---|---|
| POST | `/queue/call-next` | Oldest WAITING → SERVING |
| POST | `/queue/complete` | SERVING → COMPLETED |
| POST | `/queue/complete-and-call-next` | Both in one transaction |
| POST | `/tokens/:id/cancel` | WAITING → CANCELLED |
| GET | `/stats/overview` | Totals and averages |
| GET | `/stats/departments` | Department-wise statistics |
| GET | `/stats/peak-hours` | Tokens per hour of the day (`?departmentId=` optional) |

Status codes: `400` bad input, `401` missing/invalid/expired JWT, `404` not found, `409` invalid state change,
`503` database unavailable, `500` unexpected error (details are never sent to the client).

### Navigation

The app does not use React Router. `frontend/src/navigation.js` uses the browser's **History API** (`pushState` and the
`popstate` event) so every page has a real URL:

| Page | URL |
|---|---|
| Home | `/` |
| Patient welcome / registration | `/patient`, `/patient/register` |
| Department selection / token / status | `/patient/departments`, `/patient/token`, `/patient/status` |
| Staff login / dashboard / statistics | `/staff/login`, `/staff/dashboard`, `/staff/statistics` |
| Public display | `/display` |

- The **← Back** and **Forward →** buttons (top-left) call the browser history, so they always stay inside SmartOPD.
  Back is disabled on the first page you opened, and Forward is disabled when there is no next page.
- Opening the page you are already on does not add a history entry. After login and after a redirect the current entry is
  replaced, so Back never returns to a dead login form.
- The patient's progress (registration, department, token) is kept in `sessionStorage` for the tab. Going Back/Forward or
  refreshing shows the same token and never creates a second patient or token.
- A page that needs an earlier step (for example `/patient/token` typed directly) or a login (`/staff/dashboard`) is
  redirected to the step it needs. Unknown URLs show Home.
- When hosting the built app, the web server must return `index.html` for these paths (`vite preview` and `vite` do this already).

## 12. Polling

The app uses **simple polling, not WebSockets**. `frontend/src/services/polling.js` calls `setInterval` every 5 seconds
to fetch fresh data (`GET queue → update React state`). The patient status page, staff dashboard and public display all
use it through one hook, `usePolling`. When the page closes, `clearInterval` stops the timer, a slow request never
overlaps the next one, and a late response after closing is ignored (no memory leaks or duplicate timers).

## 13. Public display and voice announcement

Open `http://localhost:5173/display` on the waiting-room TV. No login is needed. It shows each department's
**NOW SERVING** token, the **NEXT** tokens and a status message.

Voice uses the browser's built-in **Web Speech API** (`speechSynthesis`), so no extra library is needed.
When the serving token of a department changes, it says *"Token GM-28, please proceed to General Medicine."*

- The same token is never announced twice.
- Opening or refreshing the screen does not replay the current token (the first load is only a baseline).
- Browsers block speech until the user interacts with the page, so someone must click **Enable voice announcements** once.

## 14. Waiting-time calculation

```
estimated wait = ceil(people ahead ÷ active doctors) × average service minutes
```

- **People ahead:** waiting tokens in front of the patient (the patient being served is not counted).
- **Active doctors:** doctors in that department with `is_active = TRUE` (at least 1).
- **Average service minutes:** the average of the last 50 completed visits (called → completed) when there are at
  least 5 good visits; otherwise the department's default `average_service_minutes`. Visits shorter than 1 minute or
  longer than 120 minutes are ignored.

Example: 3 people ahead, 2 doctors, 10 minutes each → ceil(3 ÷ 2) × 10 = **20 minutes**.
It is shown as **"Estimate only"** because real consultations vary.

## 15. Python analytics

`analytics/analysis.py` is a small **read-only** script (only `SELECT`). Node.js does not depend on it.
It reports totals, department-wise counts, average waiting/service time, patients per hour and the peak hour.
See [analytics/README.md](analytics/README.md).

```
cd analytics
pip install -r requirements.txt
python analysis.py          # or: python analysis.py --json
```

## 16. Security

- Passwords are stored only as **bcrypt** hashes; they are never returned or logged.
- Login uses **JWT** (HS256, 8-hour expiry by default). Protected routes reject missing, invalid, expired or wrongly signed tokens.
- The JWT secret and database credentials live only in `backend/.env`, which is **git-ignored**. The server refuses to
  start if the secret is missing, short or the placeholder.
- All SQL uses **prepared statements** (`?` placeholders); user input is never joined into SQL text.
- Input is validated on the backend for every endpoint (ids, ages, genders, lengths, formats).
- Errors return a generic message for unexpected failures. No stack traces, SQL or secrets are sent to clients.
- Login takes the same time for a wrong user or a wrong password (no user guessing).

## 17. Setup

**You need:** Node.js 20.19+ (or 22.12+), MySQL 8, and (optional) Python 3.9+.

### Database setup

```
mysql -u root -p < database/schema.sql
```

This creates the `smartopd` database, all tables and demo data (1 hospital, 2 departments, 2 doctors, 1 staff account).
Run it **once**; to start again, drop the database first (`DROP DATABASE smartopd;`).

### Run the backend

```
cd backend
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env
```

Edit `backend/.env`: set `DB_PASSWORD` to your MySQL password and `JWT_SECRET` to a long random string, e.g.

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```
npm run dev                   # http://localhost:5000  (or: npm start)
```

Check it: open `http://localhost:5000/api/health`.

### Run the frontend

```
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Production build: `npm run build` (output in `frontend/dist`), preview it with `npm run preview`.
Public display: `http://localhost:5173/display`.

**Demo staff login (local development only):** employee ID `STAFF001`, password `staff123`.
Change or remove this account before any real use.

## 18. Testing

Automated test scripts were used during development but are **not included** in this repository. To test manually:

1. `http://localhost:5000/api/health` returns a success message (backend + MySQL connected).
2. Register a patient, pick a department, check the token appears (`GM-01`) and the row exists in the `tokens` table.
3. Log in as staff, press **Call Next**, check the status becomes `SERVING` in MySQL and on the patient page and the display.
4. Press **Complete & Call Next**, check the next patient is `SERVING` and the voice announces it once.
5. Cancel a waiting token, check it is skipped. Open **Statistics** and compare with the database.
6. Try bad input (empty form, wrong password, invalid ids) and confirm clear error messages.

API example:

```
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" \
     -d "{\"employeeId\":\"STAFF001\",\"password\":\"staff123\"}"
```

`npm run lint` (frontend) checks the code style.

## 19. Limitations

- **Privacy:** the public status and queue APIs include patient names, and token ids are sequential, so anyone who can reach the server could look them up. Do not expose it to the internet as-is.
- Staff accounts are seeded in SQL; there is no page to add staff, doctors or departments.
- Every staff member can use every department and the statistics page (no roles or department limits yet).
- Only one patient per department is served at a time, even if the department has several doctors.
- No login rate limiting, no HTTPS setup and no patient accounts.
- Polling every 5 seconds is simple but not instant.
- The waiting time is an estimate, not a promise.
- The API address `http://localhost:5000/api` is set in code (`frontend/src/services/api.js`).
- Voice needs one click per page load and depends on the browser's installed voices.

## 20. Future improvements

- Show only a token number (no names) on public APIs and use unguessable status links
- Roles (admin / receptionist / doctor) and department-restricted staff
- One serving slot per doctor and room numbers in announcements
- SMS or WhatsApp notification when a patient's turn is near
- Admin screens to manage staff, doctors and departments
- WebSockets or Server-Sent Events instead of polling
- Automated tests (Jest / Supertest / Playwright) and a CI pipeline
- Docker setup, HTTPS and environment-based API URL
- Better forecasting from the historical data in `analytics/`
