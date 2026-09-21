"""SmartOPD historical queue analysis.

Read-only, descriptive analytics over the tokens already stored in MySQL.
The Node.js backend stays the real application; this script only reads data
and prints a report. It never writes to the database and never prints credentials.

Usage:
    python analysis.py            # readable text report
    python analysis.py --json     # same numbers as JSON
"""

import argparse
import json
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

import mysql.connector

ENV_FILE = Path(__file__).resolve().parent.parent / "backend" / ".env"

# Same data-quality window the backend uses: a "visit" shorter than 1 minute or longer
# than 2 hours is treated as an accidental click / forgotten token and ignored.
MIN_VISIT_MINUTES = 1
MAX_VISIT_MINUTES = 120


def load_env(path):
    """Tiny .env reader (KEY=VALUE lines) so no extra package is needed."""
    values = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip("'\"")
    return values


def connect():
    env = load_env(ENV_FILE)
    return mysql.connector.connect(
        host=env.get("DB_HOST", "localhost"),
        port=int(env.get("DB_PORT", 3306)),
        user=env["DB_USER"],
        password=env.get("DB_PASSWORD", ""),
        database=env["DB_NAME"],
    )


def fetch_data():
    connection = connect()
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, name, code FROM departments ORDER BY name")
        departments = cursor.fetchall()
        cursor.execute(
            "SELECT id, department_id, status, created_at, called_at, completed_at FROM tokens"
        )
        tokens = cursor.fetchall()
        cursor.execute("SELECT COUNT(*) AS total FROM patients")
        patients = cursor.fetchone()["total"]
        return departments, tokens, patients
    finally:
        connection.close()


def minutes_between(start, end):
    return (end - start).total_seconds() / 60


def average(values):
    return round(statistics.mean(values), 1) if values else None


def hour_label(hour):
    def twelve(value):
        return (value % 12) or 12

    def suffix(value):
        return "AM" if value % 24 < 12 else "PM"

    if suffix(hour) == suffix(hour + 1):
        return f"{twelve(hour)}–{twelve(hour + 1)} {suffix(hour)}"
    return f"{twelve(hour)} {suffix(hour)}–{twelve(hour + 1)} {suffix(hour + 1)}"


def analyse(departments, tokens, patient_count):
    waits = [minutes_between(t["created_at"], t["called_at"]) for t in tokens if t["called_at"]]
    services = [
        minutes_between(t["called_at"], t["completed_at"])
        for t in tokens
        if t["status"] == "COMPLETED" and t["called_at"] and t["completed_at"]
    ]
    services = [m for m in services if MIN_VISIT_MINUTES <= m <= MAX_VISIT_MINUTES]

    status_counts = Counter(t["status"] for t in tokens)
    per_hour = Counter(t["created_at"].hour for t in tokens)
    hours = [{"hour": h, "label": hour_label(h), "patients": per_hour.get(h, 0)} for h in range(24)]
    peak = max(hours, key=lambda entry: entry["patients"])

    by_department = defaultdict(list)
    for token in tokens:
        by_department[token["department_id"]].append(token)

    department_rows = []
    for department in departments:
        rows = by_department.get(department["id"], [])
        counts = Counter(t["status"] for t in rows)
        dept_waits = [minutes_between(t["created_at"], t["called_at"]) for t in rows if t["called_at"]]
        dept_services = [
            minutes_between(t["called_at"], t["completed_at"])
            for t in rows
            if t["status"] == "COMPLETED" and t["called_at"] and t["completed_at"]
        ]
        dept_services = [m for m in dept_services if MIN_VISIT_MINUTES <= m <= MAX_VISIT_MINUTES]
        department_rows.append(
            {
                "id": department["id"],
                "name": department["name"],
                "code": department["code"],
                "total": len(rows),
                "completed": counts["COMPLETED"],
                "waiting": counts["WAITING"],
                "serving": counts["SERVING"],
                "cancelled": counts["CANCELLED"],
                "average_wait_minutes": average(dept_waits),
                "average_service_minutes": average(dept_services),
            }
        )

    return {
        "totals": {
            "patients": patient_count,
            "tokens": len(tokens),
            "completed": status_counts["COMPLETED"],
            "waiting": status_counts["WAITING"],
            "serving": status_counts["SERVING"],
            "cancelled": status_counts["CANCELLED"],
            "average_wait_minutes": average(waits),
            "average_service_minutes": average(services),
            "service_samples": len(services),
        },
        "peak_hour": peak if peak["patients"] > 0 else None,
        "patients_per_hour": hours,
        "departments": department_rows,
    }


def show(value, unit=""):
    return "not enough data" if value is None else f"{value}{unit}"


def print_report(result):
    totals = result["totals"]
    print("SmartOPD historical queue analysis (descriptive only, read-only)")
    print("=" * 64)
    print(f"Patients registered : {totals['patients']}")
    print(f"Tokens issued       : {totals['tokens']}")
    print(
        f"  completed {totals['completed']} | waiting {totals['waiting']} | "
        f"serving {totals['serving']} | cancelled {totals['cancelled']}"
    )
    print(f"Average waiting time (issued -> called)   : {show(totals['average_wait_minutes'], ' min')}")
    print(
        f"Average service time (called -> completed): {show(totals['average_service_minutes'], ' min')}"
        f"  [{totals['service_samples']} valid visits]"
    )

    print("\nDepartment-wise")
    print("-" * 64)
    for d in result["departments"]:
        print(
            f"{d['name']:<20} total {d['total']:>3} | completed {d['completed']:>3} | "
            f"waiting {d['waiting']:>3} | cancelled {d['cancelled']:>3}"
        )
        print(
            f"{'':<20} avg wait {show(d['average_wait_minutes'], ' min')}, "
            f"avg service {show(d['average_service_minutes'], ' min')}"
        )

    print("\nPatients per hour (tokens issued)")
    print("-" * 64)
    busiest = max(entry["patients"] for entry in result["patients_per_hour"])
    for entry in result["patients_per_hour"]:
        if entry["patients"]:
            bar = "#" * max(1, round(entry["patients"] * 30 / busiest))
            print(f"{entry['label']:<14} {entry['patients']:>4}  {bar}")
    peak = result["peak_hour"]
    print(f"\nPeak hour: {peak['label']} ({peak['patients']} patients)" if peak else "\nNo tokens recorded yet.")


def main():
    parser = argparse.ArgumentParser(description="SmartOPD historical queue analysis")
    parser.add_argument("--json", action="store_true", help="print the results as JSON")
    args = parser.parse_args()

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    try:
        departments, tokens, patient_count = fetch_data()
    except mysql.connector.Error as error:
        # error.msg can be safely shown; the connection settings/password are never printed.
        sys.exit(f"Could not read from MySQL: {error.msg}")

    result = analyse(departments, tokens, patient_count)
    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print_report(result)


if __name__ == "__main__":
    main()
