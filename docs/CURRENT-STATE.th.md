# greydigi workspace — สถานะปัจจุบันของระบบ (Current State)

_อัปเดตล่าสุด: 7 กันยายน 2026 · อ้างอิงจากซอร์สโค้ดและ schema ของฐานข้อมูลในโปรเจกต์นี้โดยตรง_

> **ขอบเขตของเอกสาร** — เอกสารนี้สรุป "ระบบรองรับอะไรได้บ้าง" (ฟีเจอร์, บทบาทผู้ใช้ที่นิยามไว้, สิทธิ์การเข้าถึง) จากโค้ดและ migration จริงในโปรเจกต์
> ไม่ใช่รายงานข้อมูลสด (เช่น จำนวนผู้ใช้จริงที่สมัครแล้ว หรือจำนวนโปรเจกต์ที่มีอยู่ตอนนี้) เพราะ session นี้ไม่มีสิทธิ์เชื่อมต่อฐานข้อมูล Supabase ที่รันอยู่จริง
> หากต้องการตัวเลขสด ให้ดูที่หน้า **Settings → Permissions**, **Users and members**, และ **Clients** ในแอปโดยตรง (เข้าได้เฉพาะ workspace admin)

---

## 1. ระบบนี้คืออะไร

greydigi workspace คือระบบเดียวที่รวม 3 พื้นที่ทำงานที่เชื่อมข้อมูลกัน บวกส่วนกลางที่ใช้ร่วมกันทั้งหมด และหน้าสำหรับลูกค้าที่แยกออกไปต่างหาก:

| พื้นที่ | ใช้ทำอะไร |
|---|---|
| **Delivery** | บริหารงานส่งมอบให้ลูกค้า — โปรเจกต์, flight plan, gate, baseline, งานย่อย, คำขอเปลี่ยนแปลง, อัปเดตลูกค้า |
| **Product** | เครื่องมือ/ผลิตภัณฑ์ภายในของทีม (ใช้ร่วมข้ามลูกค้าได้ ไม่ผูกกับลูกค้ารายใดรายหนึ่ง) — products, roadmap, feature, release, ปริมาณงานวิศวกร |
| **Hypercare** | ดูแลระบบของลูกค้าหลัง go-live — service, incident, คำขอสนับสนุน, SLA, สถานะสุขภาพ, escalation |
| **Team Spaces** | บอร์ดงานภายในทีม แยกอิสระจาก 3 พื้นที่หลัก (โมดูลที่เพิ่มล่าสุด) |
| **ส่วนกลาง (Workspace core)** | ลูกค้า, บุคคล/บทบาท, template, การแจ้งเตือน, การตั้งค่า, audit log, ค้นหา |
| **หน้าสำหรับลูกค้า** | `/s/[token]` (แชร์แบบสาธารณะ ไม่ต้อง login) และ `/portal/[ref]` (พอร์ทัลลูกค้าแบบ login) |

ตัวเลขทุกตัวบนหน้าจอ (สถานะ gate, สุขภาพโปรเจกต์, สุขภาพ service) คำนวณจากฐานข้อมูลจริง ไม่มีการพิมพ์ค่าคงที่ในหน้าใดๆ

---

## 2. ฟีเจอร์ทั้งหมดในระบบ ณ ตอนนี้

### 2.1 Delivery
- ภาพรวม Delivery (`/delivery`)
- รายการโปรเจกต์ + สร้างโปรเจกต์ใหม่จาก template (`/delivery/projects`)
- หน้าโปรเจกต์เดี่ยว แบ่งเป็นแท็บ: **Overview · Tasks (พร้อม custom field, task drawer) · Flight-plan check · Baselines · Change requests · Client updates · Client view config · Documents · Members · Share links**
- Gate รวมทุกโปรเจกต์ (`/delivery/gates`), Baseline รวม (`/delivery/baselines`), Change request รวม (`/delivery/change-requests`)
- Flight plan (template ที่ clone เข้าโปรเจกต์) และเอกสารรวม (`/delivery/flight-plans`, `/delivery/documents`)
- งานรวมข้ามโปรเจกต์ (`/delivery/tasks`)

### 2.2 Product
- ภาพรวม Product (`/product`)
- Products (`/product/products`), Roadmap (`/product/roadmap`), Features + หน้ารายละเอียด (`/product/features`), Releases + หน้ารายละเอียด (`/product/releases`), Engineering workload (`/product/engineering`)
- เข้าถึงได้เฉพาะคนที่ได้รับสิทธิ์ **Product access** (ดูหัวข้อ 4)

### 2.3 Hypercare
- ภาพรวม Hypercare (`/hypercare`)
- Services + หน้ารายละเอียด (`/hypercare/services`), Incidents + หน้ารายละเอียด/pause-clock/resolve (`/hypercare/incidents`), Requests (`/hypercare/requests`), Client submissions (`/hypercare/submissions`), SLA (`/hypercare/sla`), Health (`/hypercare/health`), Escalations (`/hypercare/escalations`)

### 2.4 Team Spaces (โมดูลใหม่ล่าสุด)
- รายการ Team Space (`/team-spaces`), บอร์ดงานแบบ column (`/team-spaces/[id]/board`), สมาชิก (`/team-spaces/[id]/members`), Template ของ Team Space ที่ import ได้

### 2.5 ส่วนกลาง (Workspace core)
- **Clients** — รายการ, หน้ารายละเอียด, เปิด/ปิด Hypercare, ให้สิทธิ์เข้าพอร์ทัล, สร้างโปรเจกต์ใหม่จากหน้า client
- **People** — รายชื่อ, หน้ารายละเอียด, เชิญสมาชิกใหม่ (invite), export CSV
- **Templates** — flight-plan template แบบมีเวอร์ชัน (versioned), gate condition, ตัวแก้ระยะเวลาแต่ละ phase, ล็อกเทมเพลต
- **Notifications** — inbox แจ้งเตือนของแต่ละคน, mark all read
- **Settings** — General, Spaces, SLA policies, Client management/Portal, Branding (โลโก้/สี), Integrations, Audit log, **Permissions**
- **Search** — ค้นหาข้ามระบบ (`/search`)
- **Dashboard** — สรุปข้ามทุกพื้นที่พร้อม export

### 2.6 หน้าสำหรับลูกค้า (แยกจากระบบภายในทั้งหมด)
- **`/s/[token]`** — หน้าแบบสาธารณะ ไม่ต้อง login อ่านอย่างเดียว เห็นเฉพาะสิ่งที่ถูก publish ไว้แล้วผ่าน Client view config
- **`/portal/[project-ref]`** — พอร์ทัลลูกค้าแบบต้อง login เห็นข้อมูลสดของโปรเจกต์ตัวเอง และส่งคำร้อง (issue / change request / question) กลับเข้าระบบได้

---

## 3. ผู้ใช้และบทบาท (Users)

### วิธีเข้าสู่ระบบที่รองรับ
- อีเมล + รหัสผ่าน
- Magic link (ลิงก์เข้าระบบครั้งเดียวทางอีเมล)
- Google Sign-in (เปิดใช้ได้ตามต้องการ)

### การให้สิทธิ์เข้าใช้งาน
ระบบ **ไม่มีปุ่มสมัครสมาชิกเอง (self-serve sign up)** — ทุกบัญชีต้องถูกสร้างโดยตั้งใจเท่านั้น:
1. บัญชี workspace admin คนแรกสร้างด้วยคำสั่ง SQL ครั้งเดียวตอน setup ระบบ
2. หลังจากนั้นสมาชิกทุกคนถูกเพิ่มจากในแอปเอง ผ่านหน้า **Users and members → Invite** (`/people/invite`) — เฉพาะ workspace admin เท่านั้นที่เชิญได้ ระบบจะสร้างบัญชี Supabase Auth และแถวข้อมูล `people` ให้พร้อมกัน แล้วโชว์รหัสผ่านชั่วคราวให้ครั้งเดียว

### ประเภทบุคคล (Person kind)
| kind | ความหมาย |
|---|---|
| `internal` | พนักงาน/ทีมงานภายใน — เข้าแอปหลักได้ |
| `client` | ผู้ใช้ฝั่งลูกค้า — เข้าได้เฉพาะพอร์ทัลลูกค้า (`/portal/[ref]`) เท่านั้น |

### บทบาทระดับ workspace (Workspace role)
| บทบาท | สรุปสั้น |
|---|---|
| `workspace_admin` | สิทธิ์สูงสุด — Super Admin (ดูหัวข้อ 4) |
| `delivery_lead` | หัวหน้าทีม Delivery |
| `product_lead` | หัวหน้าทีม Product |
| `hypercare_lead` | หัวหน้าทีม Hypercare |
| `member` | สมาชิกทั่วไป |
| `client` | ผู้ใช้ฝั่งลูกค้า (คู่กับ `kind = client`) |

---

## 4. สิทธิ์การเข้าถึง (Permissions)

ตารางนี้ตรงกับสิ่งที่แสดงจริงในหน้า **Settings → Permissions** ของแอป (มองเห็นได้เฉพาะ workspace admin)

### Super Admin (`workspace_admin`)
- อ่าน/เขียนได้ทุกอย่างในทุกลูกค้า ทุกโปรเจกต์ ทุกข้อมูลระดับ workspace
- เชิญสมาชิกใหม่, ให้สิทธิ์เข้าพอร์ทัลลูกค้า, จัดการ Settings ทั้งหมด
- สร้างโปรเจกต์/ลูกค้าใหม่ได้, publish/unpublish ข้อมูลที่ลูกค้าเห็นได้
- ไม่มีข้อจำกัด

### Project Admin
- ทำได้ (CRUD เต็มรูปแบบ) เฉพาะโปรเจกต์ที่ตัวเองเป็นสมาชิกเท่านั้น: เพิ่ม/ลด สมาชิกในโปรเจกต์, สร้าง/แก้ phase, gate, baseline, change request, publish client view ของโปรเจกต์นั้น
- **ทำไม่ได้:** เห็นหรือแก้ข้อมูลของโปรเจกต์/ลูกค้าอื่นที่ไม่ได้เป็นสมาชิก, สร้างโปรเจกต์ใหม่ทั้งหมด, เชิญสมาชิกระดับ workspace, แก้ Settings

### Member
- แก้ไขงาน (task) ที่ตัวเองรับผิดชอบในโปรเจกต์ที่เป็นสมาชิกได้เต็มที่, คอมเมนต์ในทุกงานของโปรเจกต์ได้ (ไม่จำกัดแค่งานตัวเอง), ดูข้อมูลอื่นทั้งหมดของโปรเจกต์ได้ (phase, gate, baseline, เอกสาร, client update)
- **ทำไม่ได้:** สร้าง/ลบ/มอบหมายงานที่ไม่ใช่ของตัวเอง, สร้าง/ลบ phase-gate-baseline-change request, จัดการสมาชิกโปรเจกต์ หรือแตะ client view config / share link

### Product access (สิทธิ์แยกต่างหาก ไม่ใช่ tier เดียวกับด้านบน)
- ใครก็ตามที่ถูกเปิดสิทธิ์นี้ (ผ่านสวิตช์บนหน้า People) จะมีสิทธิ์เต็มบน Products, Roadmap, Releases, Engineering — **ครอบคลุมทั้ง workspace ไม่ใช่ต่อโปรเจกต์** เพราะ Product เป็นคลังความสามารถที่ใช้ร่วมกัน ไม่ผูกกับลูกค้ารายใด
- คนที่ไม่ได้รับสิทธิ์นี้จะไม่เห็นอะไรใน Product space เลย ไม่ว่าจะอยู่โปรเจกต์ไหนก็ตาม

### กลไกที่บังคับใช้จริง (ไม่ใช่แค่ UI)
สิทธิ์ทั้งหมดข้างต้นถูกบังคับด้วย **Row Level Security (RLS)** ที่ระดับฐานข้อมูล ไม่ใช่แค่การซ่อนปุ่มในหน้าเว็บ — ต่อให้เรียก API ตรงก็ยังถูกกรองด้วยกฎเดียวกัน โค้ดฝั่งแอปมีตัวตรวจสิทธิ์ (`requireWorkspaceAdmin()`, `requireProjectAccess()`) ไว้ให้ error message อ่านง่ายก่อนเท่านั้น

### ขอบเขตข้อมูลสำหรับลูกค้า/บุคคลภายนอก
- **`/s/[token]`** — ไม่ผ่าน RLS ตรงๆ แต่ผ่านฟังก์ชันพิเศษ (`fn_public_share_view`) ที่คืนเฉพาะ "สแนปช็อต" ที่ถูก publish แช่แข็งไว้แล้วเท่านั้น ไม่ใช่ข้อมูลสดจากตารางจริง
- **`/portal/[ref]`** — บุคคลที่มี `kind = client` และได้รับสิทธิ์ portal เห็นข้อมูลสดของโปรเจกต์ตัวเองผ่าน RLS ที่กรองด้วย role "client" โดยตรง

---

## 5. โมดูล/การเปลี่ยนแปลงล่าสุด (จาก migration 0020 เป็นต้นไป)

| การเปลี่ยนแปลง | รายละเอียด |
|---|---|
| ระบบสิทธิ์ระดับโปรเจกต์ (Project membership RBAC) | เพิ่ม tier "Project Admin" / "Member" ต่อโปรเจกต์ (แยกจาก workspace role) |
| Team Spaces (โมดูลเต็ม) | บอร์ดงานภายในทีม พร้อม template และสมาชิกของตัวเอง |
| Custom field ของ task | เพิ่มฟิลด์กำหนดเองในงานย่อยของ Delivery และ Team Spaces |
| Workspace branding | ตั้งค่าโลโก้/สีของ workspace ได้จากหน้า Settings → Branding |
| การแจ้งเตือน: actor + archive | บันทึกว่าใครเป็นคนกระทำ และเก็บ archive การแจ้งเตือนได้ |
| Flag คนที่ inactive | ระบุสถานะ active/inactive ของบุคคลในระบบ |

---

## 6. สิ่งที่เอกสารนี้ยังไม่ครอบคลุม

- **จำนวนผู้ใช้/ลูกค้า/โปรเจกต์จริงที่มีอยู่ตอนนี้** — ต้องดึงจากฐานข้อมูลจริงหรือหน้า Settings ในแอป ไม่สามารถอ่านได้จาก session นี้
- **การตั้งค่าเฉพาะของ integration ที่เปิดใช้งานจริง** (`/settings/integrations`) — ขึ้นกับสิ่งที่ทีมตั้งค่าไว้ในโปรเจกต์ Supabase ของตัวเอง
- **Delivery/tooling/ผู้รับผิดชอบแต่ละงาน** — ตามที่ระบุในสไลด์ aironauts flight plan ว่าเป็นสิ่งที่ต้องตกลงกันแยกต่างหาก ไม่ได้อยู่ในเอกสารสถานะระบบนี้
