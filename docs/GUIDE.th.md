# greydigi workspace — คู่มือการติดตั้งและการใช้งาน

## 1. ระบบนี้คืออะไร

Workspace เดียวที่รวม 3 พื้นที่งานเข้าด้วยกัน สร้างจากดีไซน์ Claude Design
และเชื่อมต่อกับฐานข้อมูล Supabase จริง:

- **Delivery** — งานส่งมอบให้ลูกค้า: โปรเจกต์, flight plan, gate, งานย่อย
  (tasks), baseline, คำขอเปลี่ยนแปลงงาน (change requests), อัปเดตให้ลูกค้า
  รวมถึงหน้าสำหรับลูกค้าโดยเฉพาะ (ตั้งค่าสิ่งที่ลูกค้าเห็น, ลิงก์แชร์แบบ
  สาธารณะ, พอร์ทัลลูกค้า)
- **Product** — เครื่องมือ/ผลิตภัณฑ์ภายในของทีม: products, roadmap,
  ฟีเจอร์, release, ปริมาณงานของทีมวิศวกร
- **Hypercare** — ระบบของลูกค้าที่ใช้งานจริงหลัง go-live: services,
  incidents, คำขอ (requests), SLA, สถานะสุขภาพระบบ, การ escalate
- **ส่วนกลางของ workspace** — ลูกค้า, บุคคลและสิทธิ์การใช้งาน, template,
  การแจ้งเตือน, การตั้งค่า, audit log, ค้นหา — ใช้ร่วมกันทั้ง 3 พื้นที่
- **หน้าสำหรับลูกค้า** ซึ่งแยกออกจากระบบภายในทั้งหมด:
  - `/s/[token]` — หน้าโปรเจกต์แบบสาธารณะ ไม่ต้อง login อ่านได้อย่างเดียว
    สำหรับผู้ที่มีลิงก์ที่ยังใช้งานได้
  - `/portal/[project-ref]` — พอร์ทัลลูกค้าแบบต้อง login เพื่อดูความคืบหน้า
    และทำรายการที่ถูกร้องขอ

ตัวเลขทุกตัวที่แสดงบนหน้าจอ (สถานะ gate, สุขภาพโปรเจกต์, สุขภาพ service,
ความพร้อมของ release) คำนวณจากฐานข้อมูลโดยตรง ไม่มีการพิมพ์ค่าเองในแต่ละ
หน้า ดังนั้นตัวเลขเดียวกันจะตรงกันทุกหน้าที่แสดงเสมอ

## 2. สิ่งที่ต้องมีก่อนเริ่ม

- **Node.js เวอร์ชัน 20 ขึ้นไป** พร้อม npm (เช็คได้ด้วยคำสั่ง `node -v`)
- **บัญชี Supabase** — ใช้แพ็กเกจฟรีเริ่มต้นได้เลย ([supabase.com](https://supabase.com))
- โปรแกรม terminal / command line

## 3. ติดตั้งโปรเจกต์

1. แตกไฟล์โปรเจกต์ที่ได้รับมา หรือ clone repository
2. เปิด terminal ที่โฟลเดอร์ `web/` ของโปรเจกต์
3. ติดตั้งไลบรารีที่จำเป็น:

   ```bash
   npm install
   ```

## 4. สร้างโปรเจกต์ Supabase

1. ไปที่ [supabase.com](https://supabase.com) แล้วสร้างโปรเจกต์ใหม่
2. เมื่อโปรเจกต์พร้อมแล้ว เปิดเมนู **Settings → API** จะเจอค่า 3 อย่าง
   ที่ต้องใช้:
   - **Project URL**
   - **Publishable / anon public key**
   - **Secret / service_role key** (เก็บเป็นความลับ ห้ามแชร์หรือนำไปวาง
     ในที่สาธารณะเด็ดขาด)

## 5. ตั้งค่าตัวแปรสภาพแวดล้อม (Environment Variables)

1. ในโฟลเดอร์ `web/` คัดลอกไฟล์ตัวอย่าง:

   ```bash
   cp .env.example .env.local
   ```

2. เปิดไฟล์ `.env.local` แล้วกรอกค่า:

   ```
   NEXT_PUBLIC_SUPABASE_URL=<Project URL ของคุณ>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key ของคุณ>
   SUPABASE_SERVICE_ROLE_KEY=<service_role/secret key ของคุณ>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   `NEXT_PUBLIC_SITE_URL` คือ URL ที่ระบบรันอยู่ — ใช้ `http://localhost:3000`
   ตอนพัฒนาบนเครื่องตัวเอง หรือใช้โดเมนจริงเมื่อ deploy ขึ้นระบบจริงแล้ว

3. ในโปรเจกต์ Supabase ไปที่ **Authentication → URL Configuration** แล้ว
   เพิ่ม URL เดียวกัน (บวก `/auth/callback` เช่น
   `http://localhost:3000/auth/callback`) ลงใน **Redirect URLs** ถ้าข้าม
   ขั้นตอนนี้ ลิงก์ล็อกอินในอีเมลจะใช้งานไม่ได้

## 5b. เปิดใช้งานล็อกอินด้วย Google (ไม่บังคับ)

หน้าล็อกอินมีปุ่ม **Continue with Google** เชื่อมต่อไว้ในระบบเรียบร้อย
แล้ว เหลือแค่เปิดใช้งาน Google ในโปรเจกต์ Supabase ของคุณ

1. ใน [Supabase] ไปที่ **Authentication → Providers → Google** แล้วเปิด
   จะเห็น **Callback URL** ให้คัดลอกไว้ (หน้าตาประมาณ
   `https://<project-ref>.supabase.co/auth/v1/callback` — นี่คือ callback
   ของ Supabase เอง คนละอันกับ `/auth/callback` ของแอปเรา)
2. ใน [Google Cloud Console] สร้าง **OAuth client ID** (ไปที่ Credentials
   → Create Credentials → OAuth client ID → Application type: Web
   application) แล้ววาง Callback URL จาก Supabase ในขั้นตอนที่ 1 ลงใน
   **Authorized redirect URIs**
3. คัดลอก **Client ID** และ **Client Secret** ที่ได้
4. กลับไปที่หน้าตั้งค่า Google provider ใน Supabase เปิดสวิตช์ **on** วาง
   Client ID และ Client Secret ที่คัดลอกมา แล้วกด **Save**

[Supabase]: https://supabase.com/dashboard
[Google Cloud Console]: https://console.cloud.google.com/apis/credentials

การล็อกอินด้วย Google ก็สร้างแค่บัญชี Supabase Auth เหมือนวิธีล็อกอิน
อื่น ๆ — คนนั้นยังต้องมีข้อมูลในตาราง `people` ที่ตรงกัน (แนวคิดเดียวกับ
ขั้นตอนที่ 7 / 7b) ก่อนจะเข้า workspace ได้จริง วิธีที่ง่ายที่สุดคือ
เชิญเขาก่อนผ่าน **Users and members → Invite** โดยใช้อีเมล Google ของเขา
แล้วให้เขากด **Continue with Google** แทนการใช้รหัสผ่านชั่วคราว

## 6. ตั้งค่าฐานข้อมูล

ก่อนที่ระบบจะแสดงข้อมูลอะไรได้ ต้องสร้างโครงสร้างฐานข้อมูล (ตาราง,
กฎความปลอดภัย, ตรรกะการคำนวณ) ในโปรเจกต์ Supabase ก่อน

1. เปิด **SQL Editor** ในโปรเจกต์ Supabase ของคุณ
2. เปิดไฟล์แต่ละไฟล์ใน `supabase/migrations/` **ตามลำดับ** (ตั้งแต่
   `0001_...` ถึง `0009_...`) คัดลอกเนื้อหาไปวางใน SQL editor แล้วรัน
   ต้องรันสำเร็จทีละไฟล์ก่อนไปไฟล์ถัดไป
3. **แนะนำสำหรับการรันครั้งแรก:** เปิดไฟล์ `supabase/seed.sql` คัดลอกไป
   วางใน SQL editor แล้วรัน จะได้ข้อมูลตัวอย่างที่สมจริง (ลูกค้า 4 ราย,
   โปรเจกต์ 4 โปรเจกต์, product 1 รายการ, hypercare service 6 รายการ)
   ทำให้ทุกหน้ามีข้อมูลให้ดูทันที ข้ามขั้นตอนนี้ได้ถ้าต้องการเริ่มจาก
   workspace ว่างเปล่าแล้วกรอกข้อมูลจริงเอง

รายละเอียดเพิ่มเติม รวมถึงวิธีใช้ `psql` ผ่าน command line ดูได้ที่
`supabase/README.md`

## 7. สร้างผู้ใช้คนแรก (workspace admin)

ระบบนี้ไม่มีปุ่ม "สมัครสมาชิกเอง" — การเข้าถึงต้องถูกกำหนดโดยตั้งใจ ขั้น
ตอนที่ต้องทำเองด้วย SQL นี้ ใช้แค่ครั้งเดียวสำหรับ admin คนแรกเท่านั้น
คนต่อไปเพิ่มจากในระบบได้เลย (ดูหัวข้อถัดไป)

1. ใน Supabase ไปที่ **Authentication → Users** แล้วกด **Add user** →
   **Create new user** กรอกอีเมลและตั้งรหัสผ่านที่คุณจะจำได้ — นี่คือ
   รหัสผ่านที่จะใช้ล็อกอิน ติ๊ก "Auto Confirm User" ด้วยเพื่อให้ใช้งานได้
   ทันที
2. คัดลอก **User UID** ของผู้ใช้ที่สร้างใหม่
3. ใน SQL Editor รันคำสั่งนี้ (แทนที่ค่าตัวอย่างด้วยข้อมูลจริง):

   ```sql
   insert into people (workspace_id, auth_user_id, full_name, email, kind, avatar_initials, workspace_role)
   values (
     (select id from workspaces limit 1),
     '<User UID ที่คัดลอกมา>',
     'ชื่อของคุณ',
     'you@example.com',
     'internal',
     'YN',
     'workspace_admin'
   );
   ```

   ถ้ารัน seed script แล้ว จะมี workspace อยู่แล้ว คำสั่ง `(select id from
   workspaces limit 1)` จะหาเจอเอง แต่ถ้าข้ามขั้นตอน seed ไป ต้องสร้าง
   workspace ก่อน: `insert into workspaces (name, slug) values ('My
   Workspace', 'my-workspace');`

## 7b. เพิ่มทีมงานที่เหลือ

เมื่อล็อกอินเป็น workspace admin แล้ว คนที่เหลือในทีมเพิ่มได้จากในระบบ
เลย ไม่ต้องรัน SQL เองอีกต่อไป

1. ที่แถบเมนูด้านซ้าย ไปที่ **Users and members** แล้วกด **Invite**
   (`/people/invite`)
2. กรอกชื่อ, อีเมล, บทบาท (`workspace_admin`, `member`, ฯลฯ) และประเภท
   (`internal` สำหรับพนักงานภายใน หรือ `client` สำหรับผู้ใช้พอร์ทัลลูกค้า
   ที่ผูกกับลูกค้ารายใดรายหนึ่ง)
3. กด submit ระบบจะสร้างบัญชี Supabase Auth และข้อมูลในตาราง `people`
   ให้พร้อมกันในขั้นตอนเดียว แล้วแสดง **รหัสผ่านชั่วคราว** — แสดงให้เห็น
   ครั้งเดียวเท่านั้น ให้คัดลอกแล้วส่งให้เจ้าตัวอย่างปลอดภัย (แนะนำส่งทาง
   แชท ไม่ใช่อีเมล)
4. ให้เขาล็อกอินที่ `/auth/sign-in` ด้วยอีเมลและรหัสผ่านชั่วคราวนั้น
   แล้วไปเปลี่ยนรหัสผ่านที่ **Settings → Change your password**
   (`/auth/set-password`)

เชิญคนได้เฉพาะ workspace admin เท่านั้น — ทั้งหน้า invite และโค้ด
เบื้องหลังตรวจสอบสิทธิ์นี้ทุกครั้ง

## 8. รันระบบ

```bash
npm run dev
```

เปิด URL ที่แสดงในหน้าจอ (ปกติคือ `http://localhost:3000`) จะเจอหน้า
ล็อกอิน ซึ่งมีให้เลือก:

- **Continue with Google** — ถ้าเปิดใช้งานไว้ในขั้นตอน 5b
- **Email & password** (แท็บเริ่มต้น) — กรอกอีเมลและรหัสผ่านที่คุณ (หรือ
  admin) ตั้งไว้
- **Magic link** (แท็บที่สอง) — กรอกอีเมลแล้วรับลิงก์ล็อกอินทางอีเมล
  แทน ไม่ต้องใช้รหัสผ่าน

ไม่ว่าจะเลือกวิธีไหน ระบบจะพาเข้าสู่ workspace โดยอัตโนมัติ

## 9. ส่วนต่าง ๆ ของระบบ

- **แถบเมนูด้านซ้าย (Sidebar)** — เมนูของ workspace อยู่ด้านบน
  (Overview, Clients, Users and members, Templates, Notifications,
  Settings) ตามด้วย 3 พื้นที่งาน กดที่พื้นที่งานเพื่อขยายเมนูย่อยของ
  พื้นที่นั้น เมื่อเปิดโปรเจกต์ delivery โปรเจกต์ใดโปรเจกต์หนึ่ง จะมี
  หมวด "PROJECT" เพิ่มขึ้นมาสำหรับหน้าต่าง ๆ ของโปรเจกต์นั้น
- **แถบด้านบน (Header)** — breadcrumb, ช่องค้นหา, การแจ้งเตือน และปุ่ม
  "New"
- **หน้าโปรเจกต์** — มีแท็บด้านบน (Overview, Tasks, Flight plan check,
  Documents, Baselines, Change requests, Client updates, Client view
  config) ทั้งหมดอยู่ภายใต้โปรเจกต์เดียวกัน
- **Client view config → Publish** — ข้อมูลจะยังไม่ไปถึงพอร์ทัลลูกค้า
  หรือลิงก์แชร์สาธารณะ จนกว่าจะกด publish อย่างชัดเจน เปิด/ปิดหัวข้อที่
  ต้องการในหน้า `client-view-config` แล้วกด **Publish** เช็ควันที่
  "last published" ในหน้าเดียวกันเพื่อยืนยันว่าสำเร็จ
- **ลิงก์แชร์สาธารณะ (Public share links)** — สร้างได้จากหน้า **Share
  links** ของแต่ละโปรเจกต์ คัดลอกลิงก์ หรือกด Preview เพื่อดูว่าคนนอกที่
  ไม่มีบัญชีจะเห็นอะไรบ้าง
- **พอร์ทัลลูกค้า (Client portal)** — ลูกค้าที่ล็อกอินแล้ว (มีข้อมูลใน
  ตาราง `people` ที่ `kind = 'client'` และมีสิทธิ์ใน `client_roles`) จะ
  เข้าหน้า `/portal/<project-ref>` และเห็นข้อมูลแบบ real-time พร้อม
  รายการที่ต้องดำเนินการ

## 10. การ Deploy ขึ้นใช้งานจริง

นี่คือแอป Next.js มาตรฐาน — [Vercel](https://vercel.com) เป็นทางเลือกที่
ง่ายที่สุด (รันคำสั่ง `vercel deploy` จากโฟลเดอร์ `web/` หรือเชื่อมต่อ
repository ผ่านหน้าเว็บ Vercel) ไม่ว่าจะ deploy ที่ไหนก็ตาม:

- ตั้งค่าตัวแปรสภาพแวดล้อมเดียวกับใน `.env.local` ในระบบของผู้ให้บริการนั้น
- ตั้งค่า `NEXT_PUBLIC_SITE_URL` เป็นโดเมนจริงของระบบ
- เพิ่ม `https://<โดเมนของคุณ>/auth/callback` ลงใน Redirect URLs ของ
  Supabase

## 11. แก้ปัญหาเบื้องต้น

- **ทุกหน้าเด้งกลับไปหน้าล็อกอินวนไปมา หรือระบบโหลดไม่ขึ้นเลย** — เช็คว่า
  ค่าตัวแปร Supabase ทั้ง 3 ตัวถูกต้อง และ migrations ทุกไฟล์รันสำเร็จ
  ไม่มี error
- **ไม่ได้รับอีเมลลิงก์ล็อกอิน** — เช็คโฟลเดอร์ spam และเช็คว่า redirect
  URL ที่เพิ่มไว้ใน Supabase ตรงกับ `NEXT_PUBLIC_SITE_URL` เป๊ะ ๆ (รวมถึง
  http กับ https ต้องตรงกันด้วย)
- **ล็อกอินสำเร็จ แต่ทุกหน้าขึ้นว่า "not signed in, or this workspace has
  no data yet"** — บัญชี Supabase Auth มีอยู่จริง แต่ยังไม่มีข้อมูล
  ที่ตรงกันในตาราง `people` ให้ทำขั้นตอนที่ 7 ซ้ำอีกครั้ง
- **ลืมรหัสผ่านชั่วคราว หรือกดปุ่ม "Invite" แล้วไม่มีอะไรเกิดขึ้น** —
  เชิญคนได้เฉพาะ workspace admin เท่านั้น เช็คว่าบัญชีที่ล็อกอินอยู่มี
  `workspace_role = 'workspace_admin'` ในตาราง `people` หรือไม่ ส่วนรหัส
  ผ่านชั่วคราวที่ลืม ให้ admin ตั้งรหัสใหม่ให้ผู้ใช้คนนั้นได้ที่ Supabase
  **Authentication → Users** (Reset password)
- **กด "Continue with Google" แล้วขึ้น error หรือไม่มีอะไรเกิดขึ้น** —
  ยังไม่ได้เปิดใช้งาน Google ในโปรเจกต์ Supabase นี้ ดูขั้นตอนที่ 5b
  และเช็คว่า Authorized redirect URI ใน Google Cloud ตรงกับ callback URL
  ที่ Supabase แสดงไว้เป๊ะ ๆ
- **หน้าเว็บโหลดขึ้นแต่ไม่มีข้อมูล** — เป็น empty state ตามปกติ (ยังไม่มี
  ข้อมูลในส่วนนั้นจริง ๆ) ไม่ใช่ข้อผิดพลาด — รัน `supabase/seed.sql` เพื่อ
  ดูข้อมูลตัวอย่าง หรือเริ่มสร้างโปรเจกต์/ลูกค้า/product จริงผ่านหน้าเว็บ
