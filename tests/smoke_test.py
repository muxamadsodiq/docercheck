import re
import sys
from pathlib import Path

from werkzeug.security import generate_password_hash

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import app as app_module
from app import app, generate_account_id, generate_next_ticket_no, get_db, now_iso


CSRF_RE = re.compile(r'name="csrf_token" value="([^"]+)"')
SMOKE_EMAIL = "smoke.user@example.com"
SMOKE_PASSWORD = "Password123!"


def get_csrf(response_bytes: bytes) -> str:
    html = response_bytes.decode("utf-8", errors="ignore")
    match = CSRF_RE.search(html)
    if not match:
        raise RuntimeError("CSRF token topilmadi")
    return match.group(1)


def ensure_smoke_user() -> int:
    with app.app_context():
        db = get_db()
        user = db.execute("SELECT id FROM users WHERE email = ?", (SMOKE_EMAIL,)).fetchone()
        if user:
            db.execute(
                """
                UPDATE users
                SET password_hash = ?, full_name = ?, phone = ?, balance_uzs = ?, balance_usd = ?, is_admin = 0
                WHERE id = ?
                """,
                (generate_password_hash(SMOKE_PASSWORD), "Smoke User", "+998901112233", 50_000_000, 5_000.0, user["id"]),
            )
            db.commit()
            return int(user["id"])

        cur = db.execute(
            """
            INSERT INTO users (email, full_name, phone, password_hash, account_id, balance_uzs, balance_usd, is_admin, created_at)
            VALUES (?, ?, ?, ?, '', ?, ?, 0, ?)
            """,
            (
                SMOKE_EMAIL,
                "Smoke User",
                "+998901112233",
                generate_password_hash(SMOKE_PASSWORD),
                50_000_000,
                5_000.0,
                now_iso(),
            ),
        )
        user_id = int(cur.lastrowid)
        db.execute("UPDATE users SET account_id = ? WHERE id = ?", (generate_account_id(user_id), user_id))
        db.commit()
        return user_id


def latest_booking_id(user_id: int) -> int:
    with app.app_context():
        row = get_db().execute(
            "SELECT id FROM bookings WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (user_id,),
        ).fetchone()
        if not row:
            raise RuntimeError("Booking topilmadi")
        return int(row["id"])


def active_flight_id() -> int:
    with app.app_context():
        row = get_db().execute(
            "SELECT id FROM flights WHERE status = 'active' AND seats > 0 ORDER BY id ASC LIMIT 1"
        ).fetchone()
        if not row:
            raise RuntimeError("Faol reys topilmadi")
        return int(row["id"])


def assert_ticket_created(booking_id: int) -> str:
    with app.app_context():
        row = get_db().execute(
            "SELECT ticket_no FROM tickets WHERE booking_id = ?",
            (booking_id,),
        ).fetchone()
        if not row:
            raise RuntimeError("Ticket yaratilmagan")
        return str(row["ticket_no"])


def preview_next_ticket_pdf() -> tuple[Path, bytes | None]:
    with app.app_context():
        ticket_no = generate_next_ticket_no(get_db())
    pdf_path = ROOT / "static" / "tickets" / f"ticket_{ticket_no}.pdf"
    snapshot = pdf_path.read_bytes() if pdf_path.exists() else None
    return pdf_path, snapshot


def cleanup_smoke_user(ticket_pdf_path: Path | None = None, ticket_pdf_snapshot: bytes | None = None) -> None:
    with app.app_context():
        db = get_db()
        db.execute(
            """
            UPDATE flights
            SET seats = seats + COALESCE(
                (
                    SELECT SUM(b.passenger_count)
                    FROM bookings b
                    JOIN users u ON u.id = b.user_id
                    WHERE u.email = ? AND b.flight_id = flights.id AND b.status = 'ticketed'
                ),
                0
            )
            WHERE id IN (
                SELECT DISTINCT b.flight_id
                FROM bookings b
                JOIN users u ON u.id = b.user_id
                WHERE u.email = ? AND b.status = 'ticketed'
            )
            """,
            (SMOKE_EMAIL, SMOKE_EMAIL),
        )
        db.execute(
            "DELETE FROM tickets WHERE booking_id IN (SELECT b.id FROM bookings b JOIN users u ON u.id = b.user_id WHERE u.email = ?)",
            (SMOKE_EMAIL,),
        )
        db.execute(
            "DELETE FROM passengers WHERE booking_id IN (SELECT b.id FROM bookings b JOIN users u ON u.id = b.user_id WHERE u.email = ?)",
            (SMOKE_EMAIL,),
        )
        db.execute(
            "DELETE FROM payments WHERE booking_id IN (SELECT b.id FROM bookings b JOIN users u ON u.id = b.user_id WHERE u.email = ?)",
            (SMOKE_EMAIL,),
        )
        db.execute(
            "DELETE FROM bookings WHERE user_id IN (SELECT id FROM users WHERE email = ?)",
            (SMOKE_EMAIL,),
        )
        db.execute(
            "DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email = ?)",
            (SMOKE_EMAIL,),
        )
        db.execute(
            "DELETE FROM wallet_requests WHERE user_id IN (SELECT id FROM users WHERE email = ?)",
            (SMOKE_EMAIL,),
        )
        db.execute("DELETE FROM users WHERE email = ?", (SMOKE_EMAIL,))
        db.commit()

    if ticket_pdf_path:
        if ticket_pdf_snapshot is not None:
            ticket_pdf_path.write_bytes(ticket_pdf_snapshot)
        elif ticket_pdf_path.exists() and ticket_pdf_path.is_file():
            ticket_pdf_path.unlink()


def run_smoke() -> None:
    user_id = ensure_smoke_user()
    flight_id = active_flight_id()
    ticket_pdf_path, ticket_pdf_snapshot = preview_next_ticket_pdf()
    original_mail_enabled = app_module.MAIL_ENABLED
    app_module.MAIL_ENABLED = False

    try:
        with app.test_client() as client:
            response = client.get("/login")
            csrf = get_csrf(response.data)
            login_response = client.post(
                "/login",
                data={"csrf_token": csrf, "email": SMOKE_EMAIL, "password": SMOKE_PASSWORD},
                follow_redirects=True,
            )
            if login_response.status_code != 200:
                raise RuntimeError("Login bajarilmadi")

            response = client.get(f"/book/{flight_id}")
            csrf = get_csrf(response.data)
            book_response = client.post(
                f"/book/{flight_id}",
                data={
                    "csrf_token": csrf,
                    "passenger_count": "1",
                    "baggage_option": "standard",
                },
                follow_redirects=True,
            )
            if book_response.status_code != 200:
                raise RuntimeError("Booking POST bajarilmadi")

            booking_id = latest_booking_id(user_id)

            response = client.get(f"/booking/{booking_id}/add-passengers")
            csrf = get_csrf(response.data)
            passengers_response = client.post(
                f"/booking/{booking_id}/add-passengers",
                data={
                    "csrf_token": csrf,
                    "group_phone": "+998901234567",
                    "group_notification_email": "smoke.passenger@gmail.com",
                    "passenger_1_first_name": "Smoke",
                    "passenger_1_last_name": "Passenger",
                    "passenger_1_passport_number": "AA1234567",
                    "passenger_1_passport_series": "AA",
                    "passenger_1_birth_date": "2000-02-02",
                    "passenger_1_passenger_type": "ADT",
                    "passenger_1_gender": "male",
                    "passenger_1_nationality": "Uzbek",
                    "passenger_1_passport_issue_date": "2021-01-01",
                    "passenger_1_passport_expiration_date": "2031-01-01",
                },
                follow_redirects=True,
            )
            if passengers_response.status_code != 200:
                raise RuntimeError("Passenger bosqichi bajarilmadi")

            response = client.get(f"/payment/{booking_id}")
            csrf = get_csrf(response.data)
            payment_response = client.post(
                f"/payment/{booking_id}",
                data={
                    "csrf_token": csrf,
                    "payment_method": "wallet",
                    "confirm_details": "1",
                },
                follow_redirects=True,
            )
            if payment_response.status_code != 200:
                raise RuntimeError("Payment bosqichi bajarilmadi")

            ticket_no = assert_ticket_created(booking_id)
            print("Smoke test passed. Ticket:", ticket_no)
    finally:
        app_module.MAIL_ENABLED = original_mail_enabled
        cleanup_smoke_user(ticket_pdf_path, ticket_pdf_snapshot)


if __name__ == "__main__":
    run_smoke()
