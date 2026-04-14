# Safar24 - Professional rivojlanish yo'l xaritasi

## 1-bosqich (tayyor)
- Brendga mos premium landing sahifa
- Biz haqimizda, xizmatlar, jarayon va aloqa
- Mobilga mos dizayn

## 2-bosqich (qidiruv + admin + bron)
Maqsad: admin Excel/CSV kiritadi, foydalanuvchi qidiradi va natija oladi.

### 2.1 Backend
Tavsiya stack:
- Backend: Node.js + NestJS yoki Express
- DB: PostgreSQL
- Kesh: Redis (tez qidiruv uchun)
- Fayl saqlash: S3-compatible storage (ticket PDF va chek rasmlari uchun)

### 2.2 Admin panel
- Login (2FA tavsiya)
- Excel/CSV import (`route`, `from_city`, `to_city`, `departure_date`, `airline`, `price`, `seats`)
- Narx va joylar yangilash
- Qidiruv loglari va buyurtmalar monitoringi

### 2.3 Foydalanuvchi qismi
- Yo'nalish + sana qidiruvi
- Variantlar ro'yxati
- "Bron qilish" tugmasi bosilganda ro'yxatdan o'tish/login
- Shaxsiy kabinet

## 3-bosqich (to'lov + ticket + PDF)

### 3.1 To'lov oqimi
- Har bir foydalanuvchiga noyob Account ID
- Foydalanuvchi to'lov qiladi va chek/face-shot yuklaydi
- Admin tekshiradi va to'lovni tasdiqlaydi/rad etadi

### 3.2 Ticket generatsiya
- Har ticketga 10 xonali ID: `0000000001` dan ketma-ket
- PDF ticket (logo ranglari va dizayni bilan)
- QR kod, yo'nalish, sana, yo'lovchi ma'lumotlari, pasport ma'lumotlari

### 3.3 Admin qidiruvi
- Ticket ID bo'yicha qidiruv
- Foydalanuvchi, yo'nalish, sana bo'yicha filtrlash
- PDF ni qayta yuklab olish

## Xavfsizlik talablari
- Parollar `bcrypt` bilan hash
- JWT access/refresh token
- Rate limiting
- Audit log
- Pasport ma'lumotlarini shifrlab saqlash (field-level encryption)

## Tavsiya etilgan jadval (database)
- users
- user_profiles
- flights
- flight_prices
- bookings
- payments
- tickets
- admin_audit_logs

## PDF ticket tarkibi
- Ticket ID
- F.I.O
- Passport
- From/To
- Date/Time
- Airline
- Seat (agar mavjud bo'lsa)
- Price
- Status
- QR/Barcode

## DevOps tavsiyasi
- Docker + docker compose
- CI/CD: GitHub Actions
- Production: VPS + Nginx + SSL
- Monitoring: Sentry + uptime monitor
