# เช็คลิสต์การติดตั้ง

รายการเช็คทีละขั้นตอนสำหรับติดตั้ง greydigi workspace ให้ใช้งานได้
คำอธิบายละเอียดของแต่ละขั้นตอนดูได้ที่ `GUIDE.th.md`

## ติดตั้งบนเครื่อง

- [ ] ติดตั้ง Node.js 20 ขึ้นไปแล้ว (เช็คด้วย `node -v`)
- [ ] แตกไฟล์โปรเจกต์ / clone repository เรียบร้อย
- [ ] รัน `npm install` ในโฟลเดอร์ `web/` แล้วไม่มี error
- [ ] สร้างโปรเจกต์ Supabase ที่ supabase.com แล้ว
- [ ] คัดลอก Project URL แล้ว (Settings → API)
- [ ] คัดลอก Anon / publishable key แล้ว (Settings → API)
- [ ] คัดลอก Service role / secret key แล้ว (Settings → API) — **เก็บเป็น
      ความลับ**
- [ ] สร้างไฟล์ `.env.local` แล้ว (`cp .env.example .env.local`) และกรอก
      ค่าครบ:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `NEXT_PUBLIC_SITE_URL` (ใช้ `http://localhost:3000` ตอนพัฒนาบน
        เครื่องตัวเอง)
- [ ] เพิ่ม `http://localhost:3000/auth/callback` ใน Supabase
      Authentication → URL Configuration → Redirect URLs แล้ว
- [ ] (ไม่บังคับ) เปิดใช้งานล็อกอินด้วย Google แล้ว: สร้าง OAuth client
      ใน Google Cloud, วาง Client ID/Secret ใน Supabase Authentication →
      Providers → Google, เปิดสวิตช์ provider แล้ว

## ฐานข้อมูล

- [ ] รัน `supabase/migrations/0001_extensions_enums.sql` แล้ว — สำเร็จ
- [ ] รัน `0002_core.sql` แล้ว — สำเร็จ
- [ ] รัน `0003_delivery.sql` แล้ว — สำเร็จ
- [ ] รัน `0004_product.sql` แล้ว — สำเร็จ
- [ ] รัน `0005_hypercare.sql` แล้ว — สำเร็จ
- [ ] รัน `0006_state_engine.sql` แล้ว — สำเร็จ
- [ ] รัน `0007_rls.sql` แล้ว — สำเร็จ
- [ ] รัน `0008_projections.sql` แล้ว — สำเร็จ
- [ ] รัน `0009_product_extensions.sql` แล้ว — สำเร็จ
- [ ] (ถ้าต้องการข้อมูลตัวอย่าง) รัน `supabase/seed.sql` แล้ว — สำเร็จ

## ผู้ใช้คนแรก

- [ ] สร้างผู้ใช้ใน Supabase → Authentication → Users แล้ว พร้อมตั้ง
      รหัสผ่านที่จะจำได้ และติ๊ก "Auto Confirm User"
- [ ] คัดลอก User UID แล้ว
- [ ] รันคำสั่ง `insert into people (...)` ใน SQL editor โดยใช้ UID ของคุณ
      พร้อมตั้งค่า `kind = 'internal'` และ `workspace_role =
      'workspace_admin'` แล้ว
- [ ] (ถ้าข้ามขั้นตอน seed) มีข้อมูลในตาราง `workspaces` อยู่ก่อนที่จะรัน
      คำสั่ง insert เข้าตาราง `people` ด้านบน

## รันระบบครั้งแรก

- [ ] รัน `npm run dev` แล้วไม่มี error
- [ ] เปิด `http://localhost:3000` แล้วเห็นหน้าล็อกอิน
- [ ] ล็อกอินสำเร็จด้วยอีเมล + รหัสผ่านที่ตั้งไว้ (แท็บ Email & password)
      หรือผ่านแท็บ Magic link หรือ Continue with Google (ถ้าเปิดใช้งาน)
- [ ] แถบเมนูด้านซ้ายแสดงชื่อ workspace และชื่อ/ตำแหน่งของคุณด้านล่างสุด

## เพิ่มทีมงาน

- [ ] ล็อกอินเป็น workspace admin แล้ว
- [ ] เปิดหน้าแถบเมนูด้านซ้าย → Users and members → Invite
      (`/people/invite`) ได้
- [ ] เชิญทีมงานทดสอบ 1 คน (ชื่อ, อีเมล, บทบาท, ประเภท) และได้รับรหัสผ่าน
      ชั่วคราวแบบครั้งเดียว
- [ ] ทีมงานใหม่ล็อกอินด้วยอีเมล + รหัสผ่านชั่วคราวนั้นได้สำเร็จ
- [ ] ทีมงานใหม่เปลี่ยนรหัสผ่านที่ Settings → Change your password
      (`/auth/set-password`) ได้สำเร็จ

## เช็คฟีเจอร์

- [ ] หน้า Workspace Overview (`/`) แสดงตัวเลขจริง (หรือ empty state ที่
      สวยงามถ้าข้ามขั้นตอน seed ไป)
- [ ] Delivery → Projects แสดงโปรเจกต์อย่างน้อย 1 รายการ (ถ้ามี seed data)
- [ ] เปิดโปรเจกต์แล้วเห็นแท็บต่าง ๆ และแผง "Where we are"
- [ ] Product → Products / Roadmap โหลดได้โดยไม่มี error
- [ ] Hypercare → Services / Incidents โหลดได้โดยไม่มี error
- [ ] หน้า Settings โหลดได้ และกด Save หลังแก้ชื่อ workspace ได้สำเร็จ
- [ ] หน้า **Client view config** ของโปรเจกต์โหลดได้ กด **Publish** แล้ว
      วันที่ "last published" อัปเดต
- [ ] **Share link** ที่สร้างจากโปรเจกต์เปิดได้ถูกต้องที่ `/s/<token>`
      โดยไม่ต้องล็อกอิน
- [ ] ปุ่ม **Log out** ที่แถบเมนูด้านซ้ายใช้งานได้ พากลับไปหน้าล็อกอิน

## ก่อนขึ้นระบบจริง (Production)

- [ ] ตั้งค่าตัวแปรสภาพแวดล้อมในระบบที่ใช้ deploy แล้ว (เหมือนกับใน
      `.env.local`)
- [ ] ตั้งค่า `NEXT_PUBLIC_SITE_URL` เป็นโดเมนจริงแล้ว
- [ ] เพิ่ม `https://<โดเมนของคุณ>/auth/callback` ใน Redirect URLs ของ
      Supabase แล้ว
- [ ] สร้างบัญชี workspace admin สำหรับระบบจริงแล้ว (ทำตามขั้นตอน "ผู้ใช้
      คนแรก" ด้านบนซ้ำกับฐานข้อมูลจริง)
- [ ] ตัดสินใจแล้วว่าจะรัน `supabase/seed.sql` กับระบบจริงหรือไม่
      (ปกติแล้ว **ไม่ควรรัน** — ข้อมูลตัวอย่างมีไว้สำหรับ demo/พัฒนา
      เท่านั้น)
