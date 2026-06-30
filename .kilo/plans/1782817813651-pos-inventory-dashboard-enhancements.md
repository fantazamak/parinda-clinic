# Plan: แก้ไขระบบ POS, คลังยา, และ Dashboard

## Requirements Summary
1. เพิ่มปุ่มลบสินค้าในระบบขายหน้าร้าน (POS)
2. เพิ่มปุ่มลบในคลังยาและเวชภัณฑ์
3. เพิ่มปุ่มลบในระบบเวชระเบียนคนไข้
4. เพิ่มกราฟใน Dashboard (กราฟเส้น, กราฟแท่ง, กราฟวงกลม)
5. แก้ไขระบบเลือกวันเวลาใน Dashboard
6. แก้ไขการดู preview PDF (ยังดูไม่ได้)
7. เพิ่มตัวอย่าง theme ในหน้า Settings
8. เพิ่ม popup ยืนยันก่อนลบทุกอย่าง
9. เอา Menu Bar ด้านบนออก

## Implementation Tasks

### Task 1: สร้าง Confirmation Popup Modal
- สร้าง modal dialog แบบกลางหน้าจอสำหรับยืนยันการลบ
- แทนที่ `confirm()` ด้วย popup ที่ออกแบบมาให้สวยงาม
- เพิ่มฟังก์ชัน `showConfirmPopup(message, callback)` ใน app.js

### Task 2: เพิ่มปุ่มลบในระบบเวชระเบียนคนไข้
- แก้ไข `refreshPatientsView()` ใน app.js เพื่อเพิ่มปุ่ม Delete
- เพิ่มฟังก์ชัน `deletePatient(hn)` พร้อมเรียก popup ยืนยัน
- อัปเดต context menu ให้มีตัวเลือกลบ

### Task 3: เพิ่มปุ่มลบในคลังยาและเวชภัณฑ์
- แก้ไข `refreshInventoryView()` เพื่อเพิ่มปุ่ม Delete
- เพิ่มฟังก์ชัน `deleteProduct(id)` พร้อมเรียก popup ยืนยัน
- อัปเดต context menu ให้มีตัวเลือกลบ

### Task 4: เพิ่มปุ่มลบในระบบ POS
- แก้ไข `refreshPosCartTable()` ให้มีปุ่ม Remove ที่ทำงานได้
- ปุ่มลบสินค้าในตะกร้า (ที่มีอยู่แล้ว) ต้องเพิ่ม popup ยืนยัน

### Task 5: เพิ่ม Charts ใน Dashboard
- เพิ่ม Chart.js library ผ่าน CDN (กรณีใช้ custom popup ไม่ใช่ CDN ให้ใช้ inline canvas)
- สร้าง container สำหรับกราฟ 3 แบบ:
  - Line Chart: รายรับ-รายจ่ายตามเดือน
  - Bar Chart: จำนวนผู้ป่วยและการรักษาตามเดือน  
  - Pie Chart: สต็อกสินค้า (ปกติ/ต่ำ)
- เพิ่มปุ่มสลับแสดงกราฟแต่ละแบบ

### Task 6: แก้ไขระบบเลือกวันที่ใน Dashboard
- เพิ่ม flatpickr library ผ่าน CDN
- แทนที่ input[type="date"] ด้วย DateTime picker
- รองรับการเลือกเวลาพร้อมวันที่

### Task 7: แก้ไข PDF Preview
- แก้ไข CSP ใน main.js เพื่ออนุญาตให้ preview PDF window โหลด file:// URLs
- ตรวจสอบ error handling ใน app.js
- เพิ่ม fallback หาก preview ไม่ทำงาน (แสดง path ของไฟล์)

### Task 8: เพิ่ม Theme Preview ใน Settings
- สร้าง thumbnail previews สำหรับแต่ละ theme
- แสดงตัวอย่างสีหลักของแต่ละธีมก่อนเลือก

### Task 9: ลบ Menu Bar ด้านบน
- ลบ `<header class="app-bar">` ออกจาก index.html (รวมถึง header-title)
- ย้ายข้อมูลคลินิกจาก header ไปแสดงในส่วนอื่น หรือให้ sidebar แสดงชื่อคลินิก
- ปรับ CSS ให้เนื้อหาเต็มจอ (ตัด padding-top ของ main-content)

## Files to Modify
1. `src/ui/index.html` - เพิ่ม popup modal, chart containers, ลบ header
2. `src/ui/app.js` - เพิ่มฟังก์ชัน popup, ปุ่มลบ, charts
3. `src/ui/style.css` - สไตล์สำหรับ popup และ charts

## Validation
- ทดสอบการลบแต่ละประเภทด้วย popup ยืนยัน
- ตรวจสอบการแสดงกราฟ
- ยืนยัน PDF preview ทำงาน
- ตรวจสอบ theme preview แสดงถูกต้อง