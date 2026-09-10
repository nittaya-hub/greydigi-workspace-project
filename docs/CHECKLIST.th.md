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

## เช็คฟีเจอร์ (ทดสอบทั้งระบบแบบละเอียด ตั้งแต่ต้นจนจบ)

รายการนี้ครอบคลุมทุกฟีเจอร์ที่มีอยู่จริงในโค้ด ณ ตอนนี้ (รวมของที่เพิ่งสร้างล่าสุด: Checkpoint data + คลังประวัติ, case tracking บน Hypercare submissions, scope-boundary workflow, PDF export แบบ "เหมือนหน้าจริง", ชื่อ/โลโก้ลูกค้าแบบแก้ไขได้) ไล่ตามลำดับที่คนใช้งานจริงจะเจอ ใช้ผู้ใช้ทดสอบ 2 คนคู่กัน: **admin ภายใน** (`workspace_admin`) และ **ผู้ใช้ฝั่งลูกค้า** (`kind = client`, มีสิทธิ์ portal) เพื่อเช็คว่าแต่ละฝั่งเห็นเฉพาะสิ่งที่ควรเห็นจริง

### ก. ล็อกอินและเมนูหลัก
- [ ] ล็อกอินด้วยอีเมล + รหัสผ่านสำเร็จ, เห็นชื่อ workspace และชื่อตัวเองที่แถบเมนูซ้ายล่าง
- [ ] สลับ Client scope (ตัวเลือกลูกค้าที่แถบบนสุด/เมนู) ระหว่าง "ทุกลูกค้า" กับลูกค้ารายเดียว แล้วตัวเลขในหน้าต่างๆเปลี่ยนตามจริง
- [ ] ปุ่ม Log out ใช้งานได้ พากลับไปหน้าล็อกอิน

### ข. Workspace Overview (`/`) และ Dashboard (`/dashboard`)
- [ ] หน้าแรกแสดง stat tile 5 ช่อง, แถบ Portfolio Health มีสีขึ้นครบ (ON PLAN/WATCH/BLOCKED มองเห็นชัดทั้งหมด ไม่มีแท่งจางจนมองไม่เห็น), decision queue, สรุป 3 space
- [ ] กด **Export PDF** ที่หน้าแรก เลือก Portrait/Landscape ได้ ไฟล์ที่ได้หน้าตาเหมือนหน้าจอจริงทุกกราฟ/แถบสี มีโลโก้ + สีธีมที่อัปโหลดไว้ (ถ้ามี)
- [ ] `/dashboard` (Where work crosses spaces) โหลดตัวเลขได้ครบ, ปุ่ม Export CSV และ Export PDF ทำงานทั้งคู่ (PDF เลือกแนวได้เหมือนกัน)

### ค. Delivery
- [ ] `/delivery` และ `/delivery/projects` โหลดรายการโปรเจกต์ได้ กด **Create project** จาก template สร้างโปรเจกต์ใหม่ได้สำเร็จ
- [ ] หน้าโปรเจกต์เดี่ยว (Overview) แสดง flight-plan spine, Gantt, stat tile ครบ, กด Export PDF ได้หน้าตาเหมือนจริง (มี branding โลโก้/สี/ชื่อลูกค้าตามที่ตั้งค่าไว้ใน Client view config)
- [ ] **Tasks**: เพิ่มงานใหม่ในแต่ละ phase ได้, ลากสลับลำดับงานในกลุ่มเดียวกันได้, เปิด task drawer แก้ title/description/status/due date/assignee/critical path/visibility ได้ครบ พร้อมสถานะ Saving/Saved ขึ้นถูกต้อง
- [ ] **Scope boundary**: ในงาน task drawer ติ๊ก "Out of Phase-1 scope" โดย**ไม่เลือก** change request ก่อน → ต้องมี error message ขึ้นบอกว่าต้องผูก CR ที่ approved แล้วเท่านั้น (บันทึกไม่ผ่าน)
- [ ] สร้าง Change request ใหม่ → **Approve** ให้เรียบร้อยก่อน แล้วกลับไปติ๊ก "Out of Phase-1 scope" ในงานเดิม เลือก CR ที่ approved แล้ว → บันทึกผ่าน และ badge "OUT OF SCOPE" ขึ้นในตารางงานทันที
- [ ] ลองผูก task กับ CR ที่ยังไม่ approved (raised) → ต้อง error เหมือนกัน (ยืนยันว่า enforce จริงไม่ใช่แค่ UI)
- [ ] **Baselines**: สร้าง baseline ใหม่, approve ได้, เทียบ (Compare) สอง baseline ได้
- [ ] **Change requests**: raise คำขอใหม่, Approve/Reject ทำงานถูกต้อง, สถานะเปลี่ยนแบบ final (ไม่มีปุ่มย้อนกลับ)
- [ ] **Checkpoint data**: เพิ่ม progress stat / decision / commitment / baseline measure ได้ครบ 4 ส่วน, กด "Mark reviewed" แล้ว badge เปลี่ยนเป็น REVIEWED
- [ ] กด **Export checkpoint PDF** ได้ไฟล์ที่มี badge "NEEDS REVIEW" บนแถวที่ยังไม่รีวิว และใช้สีธีมที่ตั้งไว้
- [ ] กด **Publish to history** โดยยังไม่มีอะไร reviewed เลย → ต้องมี error "Nothing reviewed yet"
- [ ] Mark reviewed อย่างน้อย 1 รายการ แล้วกด Publish to history (ใส่ label เช่น "W4") → สำเร็จ, กด **View history →** เห็นแถวใหม่ในตาราง (≤20 แถว/ล่าสุดก่อน/ค้นหาได้)
- [ ] เปิดดูแถวประวัติ (View) เห็นข้อมูลที่ frozen ไว้ครบ, กด **Duplicate to Checkpoint tab** แล้วกลับไปที่ Checkpoint data เห็นแถวใหม่ (ยังไม่ reviewed) ที่ copy มาจากของเก่า
- [ ] ยืนยันว่าแถวในคลังประวัติไม่มีปุ่มแก้ไข/ลบใดๆทั้งสิ้น (ถาวรจริง)
- [ ] **Client view config**: เปิด/ปิดแต่ละ section แล้วดู preview ด้านข้างเปลี่ยนตาม, กด **Publish** แล้ววันที่ "last published" อัปเดต
- [ ] **Branding**: อัปโหลดโลโก้ลูกค้า → ในพรีวิวโลโก้ลูกค้าขนาดเท่ากับโลโก้ greydigi พอดี, พิมพ์ชื่อที่ต้องการแสดงในกล่อง "Client name next to the logo" (ถ้าเว้นว่างจะกลับไปใช้ชื่อลูกค้าจริงเป็น placeholder), ปิดสวิตช์ "Show the name" แล้วพรีวิวเหลือแค่โลโก้ (ไม่มีชื่อ), เปิดกลับมาชื่อกลับมาแสดง
- [ ] กด **Expand** เพื่อดูพรีวิวเต็มจอ ยืนยันว่า branding (โลโก้/ชื่อ/สี) ที่ตั้งไว้ขึ้นตรงกันกับพรีวิวย่อ
- [ ] ลองเปิดหน้านี้ด้วยมือถือ/ย่อเบราว์เซอร์ให้แคบ → แถบโลโก้ไม่ล้น ไม่ตัดคำแปลกๆ ชื่อยาวๆถูก truncate แทนการดันเลย์เอาต์
- [ ] **Documents**: อัปโหลดไฟล์จริงได้ (ไม่ใช่แค่บันทึก metadata), ดาวน์โหลดกลับมาได้ถูกไฟล์
- [ ] **Share links**: สร้างลิงก์ใหม่ เปิดที่ `/s/<token>` ได้โดยไม่ต้องล็อกอิน, revoke ลิงก์แล้วเปิดไม่ได้อีก
- [ ] **Members**: เพิ่ม/ลบ Project Admin หรือ Member ของโปรเจกต์ได้
- [ ] `/delivery/gates`, `/delivery/baselines`, `/delivery/change-requests`, `/delivery/documents`, `/delivery/flight-plans`, `/delivery/tasks` (รวมข้ามโปรเจกต์) โหลดได้ไม่มี error, แต่ละหน้ามีช่องค้นหา + filter + แสดงไม่เกิน 20 แถวต่อหน้า (ยกเว้น `/delivery/tasks` ที่ตั้งใจไม่ทำ pagination เพราะมีลาก-วางเรียงลำดับ)

### ง. Product
- [ ] `/product`, `/product/products`, `/product/roadmap`, `/product/features`, `/product/releases`, `/product/engineering` โหลดได้ครบ (ต้องมีสิทธิ์ Product access ก่อน)
- [ ] คนที่ไม่มีสิทธิ์ Product access เข้าหน้าพวกนี้แล้วไม่เห็นข้อมูลใดๆ
- [ ] Features/Releases มีช่องค้นหา + filter pill + แสดงไม่เกิน 20 แถว/ล่าสุดก่อน (ยกเว้น Releases ที่ตั้งใจเรียงตามวันที่ส่งมอบ ไม่ใช่วันที่สร้าง)
- [ ] กด Export PDF/CSV ที่หน้า Product ได้ไฟล์ถูกต้อง

### จ. Hypercare
- [ ] `/hypercare`, `/hypercare/services`, `/hypercare/incidents`, `/hypercare/requests`, `/hypercare/sla`, `/hypercare/health`, `/hypercare/escalations` โหลดได้ไม่มี error
- [ ] เปิด incident แล้ว pause/resume clock และ resolve ได้
- [ ] **Client submissions**: เห็นรายการที่ล้างข้อมูลทดสอบเก่าออกแล้ว (ไม่มี "test"/"test2"/"test3" อีก) และมีตัวอย่างใหม่ 3 รายการที่ส่งมาให้แล้ว
- [ ] เปิดดูรายละเอียด submission → เปลี่ยน **Assigned to** ได้ (เลือกคนในทีม), ติ๊ก/ปิด flag **"NEEDS TO NOTIFY CLIENT"** ได้ และเห็น badge 🔔 ขึ้นในตารางทันทีเมื่อติ๊ก
- [ ] พิมพ์ note ในช่อง "Add an internal note for the team" แล้วกด Post note → note ขึ้นในลิสต์พร้อมชื่อคนโพสต์และเวลา (note นี้เป็นของทีมภายในเท่านั้น ลูกค้าต้องไม่เห็น)
- [ ] เปลี่ยนสถานะ submission (open/in progress/resolved) ได้ถูกต้อง
- [ ] กด Export PDF/CSV ที่หน้า Hypercare ได้ไฟล์ถูกต้อง

### ฉ. ส่วนกลาง (Workspace core)
- [ ] **Notifications**: การกระทำต่างๆ (comment งาน, มอบหมายงาน, submission ใหม่, flag แจ้งลูกค้า) ขึ้นแจ้งเตือนที่กระดิ่งจริง, mark all read ใช้งานได้
- [ ] **Settings → General/Spaces/SLA policies/Client management/Portal/Branding/Integrations/Audit log/Permissions/Submission types** โหลดได้ครบทุกหน้า, แก้ชื่อ workspace แล้ว Save สำเร็จ
- [ ] **Settings → Permissions**: เห็นรายการ grant ระดับโปรเจกต์และ Product access ครบ ≤20 แถว/ล่าสุดก่อน/filter ได้
- [ ] **Settings → Audit log**: เห็น log ล่าสุดของทุกการกระทำที่ทำไปข้างบน, Export PDF/CSV ได้
- [ ] **Clients**: รายการลูกค้า, เปิด/ปิด Hypercare ต่อลูกค้า, ให้สิทธิ์ portal ได้, สร้างโปรเจกต์ใหม่จากหน้า client ได้
- [ ] **People**: รายชื่อ, หน้ารายละเอียดแต่ละคน (งานที่รับผิดชอบ), เชิญสมาชิกใหม่สำเร็จได้รหัสผ่านชั่วคราว, export CSV/PDF ได้
- [ ] **Templates**: เปิดดู flight-plan template, เวอร์ชันต่างๆ, gate condition ครบ
- [ ] **Search** (`/search`) ค้นหาข้ามทุกพื้นที่เจอผลลัพธ์จริง

### ช. หน้าสำหรับลูกค้า (ทดสอบด้วยบัญชี/สิทธิ์ฝั่งลูกค้าจริง)
- [ ] **`/s/<token>`** เปิดได้โดยไม่ต้องล็อกอิน เห็นเฉพาะ section ที่เปิดไว้ตอน Publish เท่านั้น (ปิดไว้ต้องไม่เห็น)
- [ ] **`/portal/<project-ref>`** ล็อกอินด้วยบัญชีลูกค้าแล้วเห็นข้อมูลสดของโปรเจกต์ตัวเอง — เทียบกับพรีวิวใน Client view config ต้องตรงกันทุกจุด (โลโก้/ชื่อ/สี/ส่วนที่เปิดปิด)
- [ ] ส่งคำร้องจาก portal ครบ 3 แบบ (Report an issue / Change request / Ask a question) แล้วไปโผล่ที่ `/hypercare/submissions` ฝั่งแอดมินถูกต้อง
- [ ] ลูกค้า login ด้วยบัญชีของลูกค้ารายอื่นแล้วเข้าโปรเจกต์นี้ไม่ได้ (ทดสอบ RLS จริง)
- [ ] เปิด `/portal/<ref>` บนมือถือ (หรือย่อเบราว์เซอร์ให้แคบ) → หัวข้อโลโก้/ชื่อไม่ล้น ปรับตามขนาดหน้าจอถูกต้อง

### ซ. มาตรฐาน list ทั่วระบบ (สุ่มเช็คทุกหน้าที่มีตาราง)
- [ ] ทุกหน้า list แสดงไม่เกิน 20 แถวต่อหน้า, ข้อมูลใหม่ล่าสุดขึ้นก่อนเสมอ (ยกเว้นที่ตั้งใจไม่ทำ — Releases เรียงตามวันส่งมอบ, Clients เรียงตามชื่อ, Tasks ไม่ทำเพราะมีลากสลับลำดับ), มีช่องค้นหา/filter ใช้งานได้จริง
- [ ] ทุกปุ่ม Export PDF/CSV ที่เจอ ต้องมีสถานะ "กำลังโหลด/สำเร็จ/error" ให้เห็นชัดเจน ไม่ใช่แค่กดแล้วเงียบ

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
