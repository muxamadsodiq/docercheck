import re
import sys
from pathlib import Path

from werkzeug.security import generate_password_hash

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import app, generate_account_id, get_db, now_iso


CSRF_RE = re.compile(r'name="csrf_token" value="([^"]+)"')
AUDIT_EMAIL = "route.audit@example.com"
AUDIT_PASSWORD = "Password123!"
ADMIN_EMAIL = "admin@safar24.uz"
ADMIN_PASSWORD = "Admin@12345"


def get_csrf(response_bytes: bytes) -> str:
    html = response_bytes.decode("utf-8", errors="ignore")
    match = CSRF_RE.search(html)
    if not match:
        raise RuntimeError("CSRF token topilmadi")
    return match.group(1)


def ensure_audit_user() -> int:
    with app.app_context():
        db = get_db()
        row = db.execute("SELECT id FROM users WHERE email = ?", (AUDIT_EMAIL,)).fetchone()
        if row:
            db.execute(
                """
                UPDATE users
                SET password_hash = ?, full_name = ?, phone = ?, balance_uzs = ?, balance_usd = ?, is_admin = 0
                WHERE id = ?
                """,
                (generate_password_hash(AUDIT_PASSWORD), "Route Audit", "+998901112244", 25_000_000, 2_000.0, row["id"]),
            )
            db.commit()
            return int(row["id"])

        cur = db.execute(
            """
            INSERT INTO users (email, full_name, phone, password_hash, account_id, balance_uzs, balance_usd, is_admin, created_at)
            VALUES (?, ?, ?, ?, '', ?, ?, 0, ?)
            """,
            (
                AUDIT_EMAIL,
                "Route Audit",
                "+998901112244",
                generate_password_hash(AUDIT_PASSWORD),
                25_000_000,
                2_000.0,
                now_iso(),
            ),
        )
        user_id = int(cur.lastrowid)
        db.execute("UPDATE users SET account_id = ? WHERE id = ?", (generate_account_id(user_id), user_id))
        db.commit()
        return user_id


def first_active_flight_id() -> int:
    with app.app_context():
        row = get_db().execute(
            "SELECT id FROM flights WHERE status = 'active' AND seats > 0 ORDER BY id ASC LIMIT 1"
        ).fetchone()
        if not row:
            raise RuntimeError("Faol reys topilmadi")
        return int(row["id"])


def first_ticket_no() -> str | None:
    with app.app_context():
        row = get_db().execute("SELECT ticket_no FROM tickets ORDER BY id ASC LIMIT 1").fetchone()
        return str(row["ticket_no"]) if row else None


def login(client, path: str, email: str, password: str) -> None:
    response = client.get(path)
    if response.status_code != 200:
        raise RuntimeError(f"{path} GET ishlamadi: {response.status_code}")
    csrf = get_csrf(response.data)
    response = client.post(
        path,
        data={"csrf_token": csrf, "email": email, "password": password},
        follow_redirects=True,
    )
    if response.status_code != 200:
        raise RuntimeError(f"{path} POST ishlamadi: {response.status_code}")


def assert_ok(client, url: str) -> None:
    response = client.get(url, follow_redirects=True)
    if response.status_code != 200:
        raise RuntimeError(f"{url} -> {response.status_code}")


def cleanup_audit_user() -> None:
    with app.app_context():
        db = get_db()
        db.execute(
            "DELETE FROM wallet_requests WHERE user_id IN (SELECT id FROM users WHERE email = ?)",
            (AUDIT_EMAIL,),
        )
        db.execute(
            "DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email = ?)",
            (AUDIT_EMAIL,),
        )
        db.execute("DELETE FROM users WHERE email = ?", (AUDIT_EMAIL,))
        db.commit()


def run_route_audit() -> None:
    ensure_audit_user()
    flight_id = first_active_flight_id()
    ticket_no = first_ticket_no()

    public_urls = [
        "/",
        "/search",
        "/search?from_airport=TAS&to_airport=IST",
        "/health",
        "/register",
        "/login",
        "/admin/login",
        "/api/airports?q=TAS",
    ]

    user_urls = [
        "/dashboard",
        "/profile",
        "/wallet",
        "/my-tickets",
        f"/book/{flight_id}",
    ]

    admin_urls = [
        "/admin",
        "/admin/analytics",
        f"/admin/flight/{flight_id}",
    ]

    try:
        with app.test_client() as client:
            for url in public_urls:
                assert_ok(client, url)

        with app.test_client() as user_client:
            login(user_client, "/login", AUDIT_EMAIL, AUDIT_PASSWORD)
            for url in user_urls:
                assert_ok(user_client, url)

        with app.test_client() as admin_client:
            login(admin_client, "/admin/login", ADMIN_EMAIL, ADMIN_PASSWORD)
            for url in admin_urls:
                assert_ok(admin_client, url)
            if ticket_no:
                assert_ok(admin_client, f"/ticket/{ticket_no}")
                assert_ok(admin_client, f"/ticket/{ticket_no}/download")

        print("Route audit passed.")
    finally:
        cleanup_audit_user()


if __name__ == "__main__":
    run_route_audit()
