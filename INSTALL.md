# VIPER — วิธีติดตั้งและวิธีใช้งาน

VIPER คือแพลตฟอร์มสร้าง pipeline ประมวลผลภาพแบบลากวาง (node-based)
ประกอบด้วย 2 ส่วนหลักที่ต้องรันพร้อมกัน

| ส่วน | โฟลเดอร์ | เทคโนโลยี | พอร์ตเริ่มต้น |
| :--- | :--- | :--- | :--- |
| Frontend | `frontend/` | React, React Flow, Vite, TypeScript | 5173 |
| Backend | `novahub/` | C++17, OpenCV, cpp-httplib | 8000 |
| ฐานข้อมูล (ทางเลือก) | `docker-compose.yml` | PostgreSQL + Adminer | 5432 / 8080 |

---

## 1. สิ่งที่ต้องมี

- Node.js 18 ขึ้นไป (พร้อม npm)
- CMake 3.16 ขึ้นไป และคอมไพเลอร์ที่รองรับ C++17
- OpenCV, nlohmann-json, cpp-httplib
- Docker (เฉพาะถ้าจะใช้ PostgreSQL)

macOS (Homebrew):

```bash
brew install node cmake opencv nlohmann-json cpp-httplib
```

---

## 2. ติดตั้งและรัน Backend (novahub)

```bash
cd novahub
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
```

รันจากโฟลเดอร์ `VIPER/` (root) เพื่อให้ใช้โฟลเดอร์ `outputs/` ตัวเดียวกัน
เพราะโปรแกรมอ่านพาธ `outputs` แบบ relative จากโฟลเดอร์ที่สั่งรัน

```bash
cd ..                      # กลับมาที่ VIPER/
./novahub/build/novahub    # http://127.0.0.1:8000
```

เปลี่ยนพอร์ตได้ด้วย `PORT`:

```bash
PORT=9000 ./novahub/build/novahub
```

ตรวจว่าทำงาน:

```bash
curl http://127.0.0.1:8000/api/health
```

Endpoint ที่มีใน backend ตอนนี้:

| Method | Path | หน้าที่ |
| :--- | :--- | :--- |
| GET | `/api/health` | ตรวจสถานะเซิร์ฟเวอร์ |
| POST | `/api/upload` | อัปโหลดรูป (multipart field ชื่อ `files`) |
| GET | `/static/*` | เสิร์ฟไฟล์จาก `outputs/` |

> หมายเหตุ: frontend มีโค้ดเรียก endpoint ของอัลกอริทึม เช่น `/api/feature/sift`
> แต่ `novahub/src/main.cpp` ยังไม่มี endpoint เหล่านี้ node ประมวลผลจึงจะยังใช้งานไม่ได้
> จนกว่าจะเพิ่มฝั่ง backend

---

## 3. ติดตั้งและรัน Frontend

```bash
cd frontend
npm install
npm run dev        # http://127.0.0.1:5173
```

ถ้า backend ไม่ได้อยู่ที่ `http://127.0.0.1:8000` ให้สร้างไฟล์ `frontend/.env`:

```env
VITE_API_BASE=http://127.0.0.1:9000
```

คำสั่งอื่น:

```bash
npm run build      # ตรวจ type และ build สำหรับ production
npm run preview    # ดูผล build
npm run lint       # ตรวจโค้ดด้วย ESLint
```

---

## 4. ฐานข้อมูล PostgreSQL (ทางเลือก)

```bash
docker compose up -d
```

- PostgreSQL: `localhost:5432` (user `viper_user`, db `viper_db`)
- Adminer (หน้าเว็บจัดการ DB): http://localhost:8080

หยุดใช้งาน: `docker compose down`

> รหัสผ่านใน `docker-compose.yml` เป็นค่าตัวอย่างสำหรับเครื่อง dev
> ห้ามใช้ตอน deploy จริง

---

## 5. วิธีใช้งาน

1. เปิด http://127.0.0.1:5173 ในเบราว์เซอร์ (ต้องรัน backend อยู่ด้วย)
2. เลือก node จากแถบด้านข้าง (sidebar) แล้วลากวางลง canvas
   หมวดหลักเช่น `Input`, `Enhancement`, `Segmentation`, `Feature Extraction`, `Matching`
3. ลากเส้นเชื่อมจากช่องออกของ node หนึ่งไปช่องเข้าของอีก node ให้เป็นลำดับขั้นตอน
4. ใส่รูปที่ node `Input` (อัปโหลดไฟล์หรือใช้กล้อง) และปรับพารามิเตอร์ของแต่ละ node
5. กดรัน (Trigger / Run) เพื่อประมวลผล ดูสถานะและบันทึกการทำงานที่ `LogPanel`
   ดูผลลัพธ์ที่ node `Display`
6. จัดการ workflow:
   - แท็บด้านบนใช้สลับหลาย workflow
   - บันทึก/โหลด workflow เป็นไฟล์ JSON ได้จากแถบควบคุม
   - มี template สำเร็จรูปให้เริ่มต้น (คลิกขวาเพื่อเลือก)
   - Undo/Redo และ hotkey ต่าง ๆ ทำงานบน canvas

ไฟล์ตัวอย่างรูปและผลลัพธ์ JSON อยู่ที่ `outputs/samples/` ใช้ทดลองได้ทันที

---

## 6. แก้ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
| :--- | :--- |
| `cmake` หา OpenCV / httplib ไม่เจอ | ติดตั้งผ่าน brew ตามข้อ 1 แล้วลบโฟลเดอร์ `novahub/build` แล้วรัน cmake ใหม่ |
| frontend ขึ้น `Upload failed` | ตรวจว่า backend รันอยู่ และ `VITE_API_BASE` ชี้ถูกพอร์ต |
| พอร์ต 8000 / 5173 ถูกใช้อยู่ | เปลี่ยนด้วย `PORT=...` (backend) หรือ `npm run dev -- --port 5174` (frontend) |
| รูปที่อัปโหลดไปอยู่ผิดที่ | backend เก็บไฟล์ใน `outputs/` ตามโฟลเดอร์ที่สั่งรัน ให้รันจาก `VIPER/` เสมอ |
