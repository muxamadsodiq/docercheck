# Safar24 to'liq tizim

Ushbu loyiha endi oddiy landing emas, balki to'liq ishlaydigan Flask asosidagi platforma:
- logo ranglariga mos premium dizayn
- public landing + qidiruv sahifasi
- aeroport kodi / shahar bo'yicha autocomplete qidiruv
- user register/login + kabinet
- pasport ma'lumoti bilan profil to'ldirish
- bron qilish oqimi
- yo'lovchi ismi va familiyasini alohida kiritish
- tug'ilgan sanadan INF / CHD / ADT kategoriyasini avtomatik aniqlash
- to'lov chek rasmini yuklash
- Click/Payme "tez kunda" holatidagi wallet so'rov oqimi
- admin tekshiruv paneli
- CSV/Excel import orqali reyslar kiritish
- admin uchun standart va roster Excel eksportlari
- admin tasdiqlagach 10 xonali ID bilan PDF ticket generatsiyasi
- admin ticket ID bo'yicha qidiruv
- admin ticket, passport, ism yoki email bo'yicha qidiruv

Xavfsizlik jihatdan quyidagilar qo'shilgan:
- CSRF himoya (barcha POST formalar)
- login urinishlarini cheklash (basic rate limit)
- xavfsiz session cookie sozlamalari
- himoya HTTP headerlari (CSP, X-Frame-Options, nosniff)
- admin tasdiqlashda seat race-condition himoyasi

## O'rnatish va ishga tushirish
1. Python kutubxonalarini o'rnating:

	`.venv/bin/python -m pip install -r requirements.txt`

2. Muhit sozlamalarini tayyorlang:

	`cp .env.example .env`

3. Ilovani ishga tushiring:

	`.venv/bin/python app.py`

4. Brauzerda oching:

	`http://127.0.0.1:5000`

Port band bo'lsa:

	`PORT=5001 .venv/bin/python app.py`

5. Smoke test (ixtiyoriy, tavsiya etiladi):

	`.venv/bin/python tests/smoke_test.py`

## Admin kirish
- URL: `/admin/login`
- Default email: `.env` ichidagi `ADMIN_EMAIL`
- Default parol: `.env` ichidagi `ADMIN_PASSWORD`

## Super admin kirish
- URL: `/admin/login`
- Default email: `.env` ichidagi `SUPER_ADMIN_EMAIL`
- Default parol: `.env` ichidagi `SUPER_ADMIN_PASSWORD`
- Imkoniyatlar: barcha akkauntlarni ko'rish, role (`user/admin/super_admin`) tayinlash, istalgan akkaunt parolini yangilash va akkauntga kirib ko'rish

## CSV/Excel import format
Majburiy ustunlar:
- route_code
- from_city
- to_city
- departure_date
- return_date
- airline
- price_uzs
- seats
- status

Ixtiyoriy ustunlar:
- from_airport_code
- to_airport_code

Namunaviy fayl: `data/flights_template.csv`

## Admin yo'lovchi Excel eksporti
- `standart` format: HK shabloni asosida to'ldiriladi, split name, Pax Type, title, nationality code va passport fields bilan
- `roster` format: airline uslubidagi ro'yxat, split name va avtomatik INF / CHD / ADT kategoriyasi
- Passport seriyasi alohida ustun sifatida chiqarilmaydi, lekin ma'lumot bazada saqlanadi va passport number normalizatsiya qilinadi

## Muhim fayllar
- `app.py` - asosiy backend
- `templates/` - barcha sahifalar
- `static/css/style.css` - yagona dizayn
- `static/js/main.js` - frontend skriptlar
- `static/uploads/payment_proofs/` - to'lov chek rasmlari
- `static/tickets/` - yaratilgan PDF ticketlar
- `.env.example` - sozlama namunasi
- `requirements.txt` - dependency ro'yxati

## Docker & CI/CD

Yaxshi — ilovani konteynerda ishga tushirish va CI/CD orqali serverga joylash uchun quyidagi fayllar qo'shildi:

- `Dockerfile` — ilovani gunicorn bilan ishga tushirish uchun to`liq konteyner tasviri.
- `docker-compose.yml` — oddiy bir xizmat (`web`) uchun compose fayli. SQLite DB va `static/uploads`, `static/tickets` hostga mount qilish uchun volume sozlangan.
- `.dockerignore` — build kontekstini kichraytirish uchun.
- `.github/workflows/ci-cd.yml` — GitHub Actions workflow: test, container build & push (GHCR), va majburiy bo'lmagan SSH orqali deploy (agar secrets o'rnatilgan bo'lsa).

Mahalliyda konteynerni qurish va ishga tushirish:

```bash
# Build image
docker build -t safar24:local .

# Yoki docker-compose bilan: (local DB va uploads papkalar repo ichidagi fayllar bilan mount bo'ladi)
docker compose up -d --build

# Brauzerda oching
http://127.0.0.1:5000
```

CI/CD sozlash (GitHub Actions):

1. Repository Settings → Secrets and variables → Actions, qo'shing:
	- `GITHUB_TOKEN` (allaqachon mavjud) — GHCR uchun ishlatiladi.
	- Agar Docker Hub ishlatmoqchi bo'lsangiz: `DOCKER_USERNAME` va `DOCKER_PASSWORD`.
	- Agar avtomatik deploy kerak bo'lsa: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY`, `DEPLOY_PATH` (serverdagi loyiha papkasi), `DEPLOY_PORT` (ixtiyoriy).

2. GitHub workflow `main` ga push bo'lganda quyidagilar bo'ladi:
	- `tests` ishga tushadi (agar `tests/smoke_test.py` mavjud bo'lsa).
	- Kontayner `ghcr.io/${{ github.repository }}:latest` ga build qilinadi va push qilinadi.
	- Agar `DOCKER_USERNAME/DOCKER_PASSWORD` o'rnatilgan bo'lsa, Docker Hub ga ham push qilinadi.
	- Agar `DEPLOY_HOST` va SSH kaliti berilgan bo'lsa, serverga `docker compose pull` va `docker compose up -d --build` orqali deploy qilinadi.

Eslatma: bu konfiguratsiya sizning serveringizda Docker va Docker Compose o'rnatilganligini talab qiladi. Serveringizda `docker compose` (yoki `docker-compose`) mavjudligiga ishonch hosil qiling.


## Domenga chiqarish (safar24.uz)
- Nginx reverse proxy orqali Flask ilovani publish qilish
- SSL/TLS yoqish (Let's Encrypt)
- Fayl upload va PDF papkalari uchun yozish ruxsatlarini tekshirish

Production uchun tayyor fayllar:
- `wsgi.py`
- `deploy/gunicorn.conf.py`
- `deploy/nginx-safar24.conf`
- `deploy/safar24.service`
- `Dockerfile`
- `docker-compose.yml`

Gunicorn misol:

	`gunicorn -c deploy/gunicorn.conf.py wsgi:app`

Docker compose misol:

	`docker compose up -d --build`

## Eslatma
- Birinchi ishga tushishda baza avtomatik yaratiladi: `safar24.db`
- Demo sifatida bir nechta boshlang'ich reyslar avtomatik qo'shiladi
