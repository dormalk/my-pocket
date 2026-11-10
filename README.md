# Growise 🌱

Growise היא מערכת חינוכית לניהול כסף וירטואלי לילדים, שמפתחת הרגלים פיננסיים חכמים, אחריות וצמיחה. אין כאן כסף אמיתי, בנק, סליקה או העברות פיננסיות. אין כאן כסף אמיתי, בנק, סליקה או העברות פיננסיות.

## מבנה
- `apps/web` — ממשק React + Vite בעברית וב-RTL.
- `apps/api` — API ב-Fastify עם אימות הורים.
- `packages/domain` — לוגיקת חלוקת כספים, יומן תנועות וריבית.
- PostgreSQL + Prisma.

## דרישות והרצה מקומית
נדרשים Node.js 22+ ו-npm 10+.

1. `npm install`
2. `docker compose up -d`
3. להעתיק `.env.example` ל-`.env` ולהגדיר ערכים מקומיים.
4. `npm run db:generate -w @mypocket/api`
5. `npm run db:migrate -w @mypocket/api`
6. `npm run dev:api` להפעלת השרת או `npm run dev` להפעלת ממשק הילד.

## בדיקות
- `npm test`
- `npm run typecheck`
- `npm run build`

## API ראשוני
- `GET /health`
- `POST /auth/register` — פתיחת משפחה וחשבון הורה.
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

התחברות משתמשת בסיסמת Argon2id, מזהה session אקראי שנשמר במסד רק כ-SHA-256, ועוגיית HttpOnly + SameSite=Strict. ב-production העוגייה מסומנת Secure. מסלולי התחברות והרשמה מוגבלים בקצב.

## מצב המוצר
ממשק הילד כרגע מציג נתוני הדגמה מקומיים. אימות הורים כבר קיים בשרת, אך חיבור הממשק לשרת, ניהול ילדים, תהליכי קופות, אישורי בקשות ותזמון ריבית חודשית עדיין בפיתוח. אין להזין מידע אישי אמיתי בממשק ההדגמה.

## אבטחה
אין לשמור סודות או קובצי `.env` בריפו. משתמשים ב-`.env.example` לערכי דוגמה בלבד.