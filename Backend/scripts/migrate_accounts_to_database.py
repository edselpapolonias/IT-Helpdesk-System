#!/usr/bin/env python
"""Copy local helpdesk accounts to another PostgreSQL database.

The destination URL is read from a single JSON object on stdin so database
credentials never need to be placed in command arguments or committed files.
Only the custom user table and its Django group/permission join tables are
copied. Tickets, sessions, authentication tokens, and audit logs are not
modified.
"""

from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
import sys
from collections import Counter
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

import psycopg
from psycopg import sql
from psycopg.rows import dict_row


BACKEND_DIR = Path(__file__).resolve().parents[1]
LOCAL_ENV_PATH = BACKEND_DIR / ".env"
BACKUP_DIR = BACKEND_DIR / "private_backups"
EXPECTED_ACCOUNT_COUNT = 3
ACCOUNT_TABLES = (
    "accounts_user",
    "accounts_user_groups",
    "accounts_user_user_permissions",
)
TICKET_TABLE = "tickets_ticket"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migrate only local account records to a PostgreSQL database."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Perform the migration. Without this flag, only a preflight check runs.",
    )
    return parser.parse_args()


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def read_destination_url() -> str:
    console_handle = None
    original_console_mode = None
    if os.name == "nt" and sys.stdin.isatty():
        kernel32 = ctypes.windll.kernel32
        console_handle = kernel32.GetStdHandle(-10)  # STD_INPUT_HANDLE
        mode = ctypes.c_ulong()
        if kernel32.GetConsoleMode(console_handle, ctypes.byref(mode)):
            original_console_mode = mode.value
            kernel32.SetConsoleMode(console_handle, mode.value & ~0x0004)
    try:
        raw_payload = sys.stdin.readline()
    except (json.JSONDecodeError, TypeError) as exc:
        raise RuntimeError("Expected a JSON object on stdin.") from exc
    finally:
        if console_handle is not None and original_console_mode is not None:
            ctypes.windll.kernel32.SetConsoleMode(
                console_handle, original_console_mode
            )
    try:
        payload = json.loads(raw_payload)
    except (json.JSONDecodeError, TypeError) as exc:
        raise RuntimeError("Expected a JSON object on stdin.") from exc
    value = str(payload.get("database_url", "")).strip()
    if not value:
        raise RuntimeError("The stdin JSON object must contain database_url.")
    return value


def local_connection_kwargs() -> dict[str, str]:
    env = read_env(LOCAL_ENV_PATH)
    required = ("DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT")
    missing = [key for key in required if not env.get(key)]
    if missing:
        raise RuntimeError(f"Local .env is missing: {', '.join(missing)}")
    return {
        "dbname": env["DB_NAME"],
        "user": env["DB_USER"],
        "password": env["DB_PASSWORD"],
        "host": env["DB_HOST"],
        "port": env["DB_PORT"],
    }


def table_exists(connection: psycopg.Connection[Any], table: str) -> bool:
    with connection.cursor() as cursor:
        cursor.execute("SELECT to_regclass(%s)", (f"public.{table}",))
        return cursor.fetchone()[0] is not None


def row_count(connection: psycopg.Connection[Any], table: str) -> int:
    if not table_exists(connection, table):
        return 0
    with connection.cursor() as cursor:
        cursor.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table)))
        return int(cursor.fetchone()[0])


def fetch_rows(
    connection: psycopg.Connection[Any], table: str
) -> list[dict[str, Any]]:
    if not table_exists(connection, table):
        return []
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            sql.SQL("SELECT * FROM {} ORDER BY 1").format(sql.Identifier(table))
        )
        return list(cursor.fetchall())


def role_counts(rows: list[dict[str, Any]]) -> dict[str, int]:
    return dict(sorted(Counter(str(row.get("role", "")) for row in rows).items()))


def account_fingerprint(rows: list[dict[str, Any]]) -> str:
    comparable = [
        {
            "id": row.get("id"),
            "username": row.get("username"),
            "email": row.get("email"),
            "role": row.get("role"),
            "password": row.get("password"),
            "is_active": row.get("is_active"),
            "is_staff": row.get("is_staff"),
            "is_superuser": row.get("is_superuser"),
        }
        for row in rows
    ]
    encoded = json.dumps(comparable, sort_keys=True, default=json_default).encode()
    return hashlib.sha256(encoded).hexdigest()


def json_default(value: Any) -> str:
    if isinstance(value, (datetime, date, Decimal, UUID)):
        return str(value)
    if isinstance(value, bytes):
        return value.hex()
    raise TypeError(f"Cannot serialize {type(value).__name__}")


def write_backup(label: str, data: dict[str, Any], timestamp: str) -> Path:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    path = BACKUP_DIR / f"{label}_{timestamp}.json"
    with path.open("x", encoding="utf-8") as backup_file:
        json.dump(data, backup_file, indent=2, default=json_default)
        backup_file.write("\n")
    return path


def backup_payload(
    connection: psycopg.Connection[Any], *, database_label: str
) -> dict[str, Any]:
    tables = {table: fetch_rows(connection, table) for table in ACCOUNT_TABLES}
    return {
        "database": database_label,
        "scope": "accounts only; tickets, sessions, tokens, and audit logs excluded",
        "tables": tables,
    }


def insert_rows(
    connection: psycopg.Connection[Any],
    table: str,
    rows: list[dict[str, Any]],
) -> None:
    if not rows:
        return
    columns = list(rows[0])
    query = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
        sql.Identifier(table),
        sql.SQL(", ").join(map(sql.Identifier, columns)),
        sql.SQL(", ").join(sql.Placeholder() for _ in columns),
    )
    values = [tuple(row[column] for column in columns) for row in rows]
    with connection.cursor() as cursor:
        cursor.executemany(query, values)


def reset_user_sequence(connection: psycopg.Connection[Any]) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT pg_get_serial_sequence('accounts_user', 'id')"
        )
        sequence = cursor.fetchone()[0]
        if sequence:
            cursor.execute(
                "SELECT setval(%s::regclass, "
                "COALESCE((SELECT MAX(id) FROM accounts_user), 1), "
                "EXISTS(SELECT 1 FROM accounts_user))",
                (sequence,),
            )


def sanitized_summary(
    source_users: list[dict[str, Any]],
    destination_users: list[dict[str, Any]],
    source_tickets: int,
    destination_tickets: int,
) -> dict[str, Any]:
    return {
        "source": {
            "accounts": len(source_users),
            "roles": role_counts(source_users),
            "tickets_observed_not_copied": source_tickets,
        },
        "destination": {
            "accounts": len(destination_users),
            "roles": role_counts(destination_users),
            "tickets_observed_not_modified": destination_tickets,
        },
    }


def main() -> int:
    args = parse_args()
    destination_url = read_destination_url()

    with psycopg.connect(**local_connection_kwargs()) as source, psycopg.connect(
        destination_url
    ) as destination:
        source_users = fetch_rows(source, "accounts_user")
        destination_users = fetch_rows(destination, "accounts_user")
        source_tickets = row_count(source, TICKET_TABLE)
        destination_tickets_before = row_count(destination, TICKET_TABLE)

        summary = sanitized_summary(
            source_users,
            destination_users,
            source_tickets,
            destination_tickets_before,
        )

        if len(source_users) != EXPECTED_ACCOUNT_COUNT:
            summary["status"] = "refused"
            summary["reason"] = (
                f"Expected exactly {EXPECTED_ACCOUNT_COUNT} local accounts; "
                f"found {len(source_users)}."
            )
            print(json.dumps(summary, indent=2))
            return 2

        source_fingerprint = account_fingerprint(source_users)
        destination_fingerprint = account_fingerprint(destination_users)
        already_migrated = (
            len(destination_users) == len(source_users)
            and destination_fingerprint == source_fingerprint
        )

        if destination_users and not already_migrated:
            summary["status"] = "refused"
            summary["reason"] = (
                "Destination already contains different account data; no rows were changed."
            )
            print(json.dumps(summary, indent=2))
            return 3

        if not args.apply:
            summary["status"] = "ready" if not already_migrated else "already_migrated"
            summary["password_hashes_preservable"] = True
            summary["tickets_will_be_copied"] = False
            print(json.dumps(summary, indent=2))
            return 0

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        local_backup = write_backup(
            "local_accounts_before_migration",
            backup_payload(source, database_label="local"),
            timestamp,
        )
        destination_backup = write_backup(
            "neon_accounts_before_migration",
            backup_payload(destination, database_label="destination"),
            timestamp,
        )

        if not already_migrated:
            source_tables = {
                table: fetch_rows(source, table) for table in ACCOUNT_TABLES
            }
            try:
                for table in ACCOUNT_TABLES:
                    insert_rows(destination, table, source_tables[table])
                reset_user_sequence(destination)
                destination.commit()
            except Exception:
                destination.rollback()
                raise

        migrated_users = fetch_rows(destination, "accounts_user")
        destination_tickets_after = row_count(destination, TICKET_TABLE)
        fingerprint_matches = account_fingerprint(migrated_users) == source_fingerprint
        tickets_unchanged = destination_tickets_after == destination_tickets_before

        if len(migrated_users) != EXPECTED_ACCOUNT_COUNT or not fingerprint_matches:
            raise RuntimeError("Post-migration account verification failed.")
        if not tickets_unchanged:
            raise RuntimeError("Ticket count changed unexpectedly.")

        summary = sanitized_summary(
            source_users,
            migrated_users,
            source_tickets,
            destination_tickets_after,
        )
        summary.update(
            {
                "status": "already_migrated" if already_migrated else "migrated",
                "password_hashes_match": fingerprint_matches,
                "tickets_unchanged": tickets_unchanged,
                "local_backup": str(local_backup.relative_to(BACKEND_DIR)),
                "destination_backup": str(destination_backup.relative_to(BACKEND_DIR)),
            }
        )
        print(json.dumps(summary, indent=2))
        return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"status": "error", "message": str(exc)}), file=sys.stderr)
        raise SystemExit(1)
