# SmartOPD Analytics (Python)

A small, **read-only** script that describes the queue history stored in MySQL.
Python is used only for analytics. The Node.js/Express backend remains the real application
and does not depend on this folder.

## What it reports

- Patients registered and tokens issued (completed / waiting / serving / cancelled)
- Average waiting time (token issued → called) and average service time (called → completed)
- Department-wise counts and averages
- Patients per hour of the day and the peak hour

These are historical, descriptive numbers. There is no prediction or machine learning.

Service times under 1 minute or over 120 minutes are ignored (accidental clicks or tokens left
open). If there is no usable data, the report says "not enough data" instead of showing 0.

## Setup

Requires Python 3.9+ and the MySQL database already set up for SmartOPD.

```
pip install -r requirements.txt
```

The only dependency is `mysql-connector-python`. Pandas is not needed for these calculations
(the standard library is enough).

The script reads the database settings from `../backend/.env` (`DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME`). It only runs `SELECT` queries and never prints the password.

## Run

```
python analysis.py           # text report
python analysis.py --json    # same numbers as JSON
```

The figures use the same rules as the backend's `/api/stats` endpoints, so both should agree.
