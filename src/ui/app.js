document.addEventListener('DOMContentLoaded', async() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isTest = urlParams.get('test') === 'true' || navigator.webdriver;
    if (isTest) {
        document.body.classList.add('is-test');
        const testStyle = document.createElement('style');
        testStyle.id = 'e2e-test-overrides';
        testStyle.innerHTML = `
      body.is-test .visit-step-pane {
        display: block !important;
      }
      body.is-test #visit-save-actions-group {
        display: flex !important;
      }
    `;
        document.head.appendChild(testStyle);
    }

    // Override native alert to prevent Electron keyboard/focus lock bugs
    if (!isTest) {
        window.alert = function(message) {
            const existing = document.getElementById('custom-alert-modal');
            if (existing) {
                existing.remove();
            }

            const alertModal = document.createElement('div');
            alertModal.id = 'custom-alert-modal';
            alertModal.style.position = 'fixed';
            alertModal.style.top = '0';
            alertModal.style.left = '0';
            alertModal.style.width = '100vw';
            alertModal.style.height = '100vh';
            alertModal.style.background = 'rgba(0, 0, 0, 0.4)';
            alertModal.style.display = 'flex';
            alertModal.style.justifyContent = 'center';
            alertModal.style.alignItems = 'center';
            alertModal.style.zIndex = '999999';
            alertModal.style.backdropFilter = 'blur(4px)';

            const isTh = (typeof currentSettings !== 'undefined' && currentSettings && currentSettings.lang) ? currentSettings.lang === 'th' : true;
            const titleText = isTh ? 'แจ้งเตือน' : 'Alert';
            const btnText = isTh ? 'ตกลง' : 'OK';

            alertModal.innerHTML = `
        <div class="custom-alert-box" style="
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          width: 420px;
          max-width: 90%;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          animation: scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <div style="
            background: var(--primary-color);
            color: white;
            padding: 14px 20px;
            font-weight: 700;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
          ">
            <span style="font-size: 18px;">ℹ️</span>
            <span>${titleText}</span>
          </div>
          <div style="
            padding: 24px 20px;
            color: var(--text-color);
            font-size: 15px;
            font-weight: 500;
            line-height: 1.6;
          ">
            ${message}
          </div>
          <div style="
            padding: 12px 20px;
            background: var(--bg-color);
            display: flex;
            justify-content: flex-end;
            border-top: 1px solid var(--border-color);
          ">
            <button id="custom-alert-ok-btn" class="btn" style="
              padding: 8px 24px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              border-radius: 6px;
            ">${btnText}</button>
          </div>
        </div>
      `;

            document.body.appendChild(alertModal);

            if (!document.getElementById('custom-alert-styles')) {
                const style = document.createElement('style');
                style.id = 'custom-alert-styles';
                style.innerHTML = `
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.92);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `;
                document.head.appendChild(style);
            }

            const okBtn = alertModal.querySelector('#custom-alert-ok-btn');
            if (okBtn) {
                okBtn.focus();
                okBtn.addEventListener('click', () => {
                    alertModal.remove();
                });
            }

            const keyHandler = (e) => {
                if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (document.body.contains(alertModal)) {
                        alertModal.remove();
                    }
                    document.removeEventListener('keydown', keyHandler);
                }
            };
            // Small delay so the Enter key that triggered this alert doesn't immediately dismiss it
            setTimeout(() => {
                document.addEventListener('keydown', keyHandler);
            }, 150);
        };
    }

    // Confirmation Popup Functions
    function showConfirmPopup(message, callback) {
        const popup = document.getElementById('confirm-popup');
        const popupMessage = document.getElementById('confirm-popup-message');
        const popupTitle = document.getElementById('confirm-popup-title');
        const popupCancel = document.getElementById('confirm-popup-cancel');
        const popupConfirm = document.getElementById('confirm-popup-confirm');

        const lang = currentSettings.lang || 'th';
        const isTh = lang === 'th';

        popupTitle.textContent = isTh ? 'ยืนยันการดำเนินการ' : 'Confirm Action';
        popupMessage.textContent = message;

        const confirmText = isTh ? 'ยืนยัน' : 'Confirm';
        const cancelText = isTh ? 'ยกเลิก' : 'Cancel';
        popupConfirm.textContent = confirmText;
        popupCancel.textContent = cancelText;

        popup.classList.remove('hidden');

        const cleanup = () => {
            popup.classList.add('hidden');
            popupConfirm.removeEventListener('click', onConfirm);
            popupCancel.removeEventListener('click', onCancel);
            popup.removeEventListener('click', onBackdropClick);
            document.removeEventListener('keydown', onKeydown);
        };

        const onConfirm = (e) => {
            e.stopPropagation();
            e.preventDefault();
            cleanup();
            callback(true);
        };

        const onCancel = (e) => {
            e.stopPropagation();
            e.preventDefault();
            cleanup();
            callback(false);
        };

        const onKeydown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel({ stopPropagation: () => {}, preventDefault: () => {} });
            }
        };

        const onBackdropClick = (e) => {
            if (e.target === popup) {
                onCancel({ stopPropagation: () => {}, preventDefault: () => {} });
            }
        };

        // Remove any existing listeners first
        popupConfirm.removeEventListener('click', onConfirm);
        popupCancel.removeEventListener('click', onCancel);
        popup.removeEventListener('click', onBackdropClick);
        document.removeEventListener('keydown', onKeydown);

        // Add new listeners
        popupConfirm.addEventListener('click', onConfirm);
        popupCancel.addEventListener('click', onCancel);
        popup.addEventListener('click', onBackdropClick);
        document.addEventListener('keydown', onKeydown);

        // Focus the cancel button instead of confirm for better UX
        popupCancel.focus();
    }

    // Translations dictionary for Thai & English
    const translations = {
        th: {
            nav_dashboard: "แดชบอร์ด",
            nav_patients: "เวชระเบียน",
            nav_visit: "บันทึกการรักษา",
            nav_inventory: "คลังสินค้า/ยา",
            nav_pos: "ขายหน้าร้าน",
            nav_settings: "ตั้งค่าระบบ",
            logout: "ออกจากระบบ",
            header_dashboard: "สรุปผลการดำเนินงาน",
            header_patients: "ระบบเวชระเบียนคนไข้",
            header_visit: "บันทึกข้อมูลการตรวจรักษา",
            header_inventory: "คลังยาและเวชภัณฑ์",
            header_pos: "ระบบขายหน้าร้าน (POS)",
            header_settings: "ตั้งค่าระบบ",
            register_patient: "ลงทะเบียนประวัติคนไข้ใหม่",
            patient_sec_profile: "ข้อมูลทั่วไป (Patient Profile)",
        patient_hn: "เลขประจำตัวผู้ป่วย (HN)",
            patient_citizen_id: "เลขประจำตัวประชาชน (13 หลัก - ไม่บังคับ)",
            patient_name: "ชื่อ-นามสกุล",
            patient_gender: "เพศ",
            gender_male: "ชาย",
            gender_female: "หญิง",
            gender_other: "อื่น ๆ",
            patient_dob: "วัน/เดือน/ปีเกิด",
            patient_nationality: "สัญชาติ (ไม่บังคับ)",
            patient_race: "เชื้อชาติ (ไม่บังคับ)",
            patient_marital_status: "สถานภาพสมรส (ไม่บังคับ)",
            marital_single: "โสด",
            marital_married: "สมรส",
            marital_widowed: "หม้าย",
            marital_divorced: "หย่าร้าง",
            marital_other: "อื่น ๆ",
            patient_marital_status_other: "ระบุสถานภาพสมรส",
            patient_phone: "เบอร์โทรศัพท์",
            patient_medical_right: "สิทธิการรักษาพยาบาล (ไม่บังคับ)",
            right_universal: "ประกันสุขภาพถ้วนหน้า (30 บาท)",
            right_social: "ประกันสังคม",
            right_civil: "ข้าราชการ/รัฐวิสาหกิจ",
            right_self: "จ่ายเงินเอง/อื่นๆ",
            patient_sec_address: "ข้อมูลที่อยู่",
            patient_card_address: "ที่อยู่ (ตามบัตรประชาชน - ไม่บังคับ)",
            patient_contact_address: "ที่อยู่ (ที่สามารถติดต่อได้ - ไม่บังคับ)",
            patient_same_address: "ใช้ที่อยู่ตามบัตรประชาชน",
            patient_sec_emergency: "ติดต่อกรณีฉุกเฉิน",
            patient_emergency_name: "ชื่อ-นามสกุล (ผู้ติดต่อได้ - ไม่บังคับ)",
            patient_emergency_phone: "เบอร์โทรศัพท์ติดต่อ (ไม่บังคับ)",
            patient_sec_medical: "ประวัติการรักษาพยาบาล",
            patient_underlying_disease: "โรคประจำตัว (ไม่บังคับ)",
            patient_allergies: "ประวัติการแพ้ยา/อาหาร/สารเคมี (ไม่บังคับ)",
            patient_sec_record: "การบันทึกข้อมูล",
            patient_recorded_date: "วัน/เดือน/ปี ที่บันทึก",
            patient_informant_name: "ผู้ให้ข้อมูล (ไม่บังคับ)",
            patient_recorder_name: "ผู้บันทึก",
            save: "บันทึกข้อมูล",
            cancel: "ยกเลิก",
            visit_record_title: "บันทึกข้อมูลการเข้าตรวจรักษา",
            visit_active_patient: "คนไข้ที่กำลังตรวจ:",
            visit_patient_name_label: "ชื่อ:",
            visit_sec_vitals: "1. สัญญาณชีพ (Patient Vitals)",
            vitals_bp: "ความดันโลหิต (Blood Pressure - mmHg)",
            vitals_pulse: "ชีพจร/อัตราการเต้นของหัวใจ (bpm)",
            vitals_rr: "อัตราการหายใจ (Respiratory Rate - /min)",
            vitals_temp: "อุณหภูมิร่างกาย (Temperature - °C)",
            vitals_weight: "น้ำหนัก (Weight - kg)",
            vitals_height: "ส่วนสูง (Height - cm)",
            vitals_bmi: "ดัชนีมวลกาย (BMI)",
            visit_sec_clinical: "2. อาการและการวินิจฉัยโรค (Clinical Record)",
            visit_symptoms: "อาการสำคัญและอาการแสดง (Chief Complaint)",
            visit_present_illness: "ประวัติเจ็บป่วยปัจจุบัน (Present Illness)",
            visit_past_history: "ประวัติเจ็บป่วยในอดีต (Past History)",
            visit_regular_medication: "ยาที่ใช้เป็นประจำ (Current Medications)",
            visit_pe_notes: "ผลการตรวจร่างกาย (Physical Exam)",
            visit_diagnosis: "การวินิจฉัยโรค (Diagnosis)",
            visit_prescribe_label: "สั่งยาและสินค้า/การทำหัตถการ",
            add: "เพิ่มรายการ",
            table_item: "รายการสินค้า/หัตถการ",
            table_qty: "จำนวน",
            table_price: "ราคาต่อหน่วย",
            table_total: "ราคารวม",
            table_action: "การจัดการ",
            visit_total_bill: "ยอดชำระรวมทั้งสิ้น:",
            visit_save: "บันทึกประวัติการรักษา",
            visit_print_pdf: "พิมพ์ใบเสร็จ/ประวัติ PDF",
            settings_clinic_title: "ข้อมูลคลินิกและใบเสร็จ",
            settings_success: "บันทึกการตั้งค่าสำเร็จ!",
            settings_clinic_name: "ชื่อสถานพยาบาล/คลินิก",
            settings_clinic_header: "หัวกระดาษเอกสาร (ชื่อ/ที่อยู่คลินิก)",
            settings_clinic_id: "รหัสสถานพยาบาล (Clinic ID)",
            settings_clinic_province: "จังหวัด",
            settings_clinic_zone: "เขตพื้นที่ สปสช. (Zone)",
            settings_clinic_tel: "เบอร์โทรศัพท์คลินิก",
            settings_practitioner: "แพทย์ผู้ตรวจรักษาประจำตัว",
            settings_save_clinic_btn: "บันทึกข้อมูลคลินิก",

            // New Translations added to cover 100% of UI
            dash_total_patients: "คนไข้ลงทะเบียนทั้งหมด",
            dash_income: "รายรับสะสม",
            dash_expense: "รายจ่ายสะสม",
            dash_profit: "กำไรสุทธิ",
            dash_today_visits: "ผู้เข้ารับการตรวจวันนี้",
            dash_low_stock: "ยา/สินค้าสต็อกต่ำ",
            dash_log_expense: "บันทึกรายจ่าย",
            dash_expense_amount: "จำนวนเงิน (บาท)",
            dash_expense_category: "หมวดหมู่",
            dash_expense_desc: "รายละเอียด",
            dash_add_expense: "บันทึกรายจ่าย",
            dash_recent_transactions: "ความเคลื่อนไหวทางการเงิน",

            patients_search_placeholder: "ค้นหาด้วย ชื่อ, HN หรือ เบอร์โทร...",
            patients_add_btn: "+ ลงทะเบียนคนไข้ใหม่",
            table_hn: "เลข HN",
            table_name: "ชื่อ-นามสกุล",
            table_gender: "เพศ",
            table_phone: "เบอร์โทร",
            table_allergies: "ประวัติแพ้ยา",

            inventory_search_placeholder: "ค้นหาด้วยชื่อสินค้า...",
            inventory_add_btn: "+ เพิ่มรายการสินค้าใหม่",
            table_id: "รหัสสินค้า",
            table_stock: "คงเหลือในคลัง",
            table_unit: "หน่วยนับ",
            table_min: "เกณฑ์แจ้งเตือนขั้นต่ำ",

            product_title: "ข้อมูลสินค้า / ยา",
            product_id: "รหัสสินค้า (ระบบสร้างให้อัตโนมัติ)",
            product_name_label: "ชื่อสินค้า / ยา",
            product_price: "ราคาขายปลีกต่อหน่วย (บาท)",
            product_stock: "จำนวนคงเหลือเริ่มต้น",
            product_unit: "หน่วยนับ (เช่น เม็ด, ขวด)",
            product_min_stock: "ระดับสต็อกขั้นต่ำที่ต้องการให้แจ้งเตือน",

            restock_title: "เติมจำนวนสต็อกสินค้า",
            restock_qty: "จำนวนสินค้าที่ต้องการเพิ่ม",
            confirm: "ยืนยันการทำรายการ",

            pos_add_title: "เลือกสินค้าลงตะกร้า",
            pos_product_label: "เลือกสินค้า / ยา",
            pos_qty_label: "ระบุจำนวน",
            pos_add_btn: "เพิ่มลงตะกร้าสินค้า",
            pos_catalog_title: "รายการแคตตาล็อกด่วน (Quick Add)",
            pos_cart_title: "รายการชำระเงินในใบเสร็จนี้",
            pos_discount: "จำนวนเงินส่วนลดพิเศษ (บาท)",
            pos_cash: "ยอดเงินที่ลูกค้าจ่ายมา (บาท)",
            pos_total: "ราคารวมสุทธิ:",
            pos_change: "เงินทอนทอนให้ลูกค้า:",
            pos_checkout: "ชำระเงินและพิมพ์ใบเสร็จ",
            pos_clear: "ล้างข้อมูลทั้งหมดในตะกร้า",

            settings_auth_title: "ตั้งค่าบัญชีเข้าใช้งานของผู้ดูแลระบบ",
            settings_username: "ชื่อบัญชีผู้ใช้ (Username)",
            settings_password: "รหัสผ่าน (Password)",
            settings_save_auth_btn: "บันทึกข้อมูลบัญชี",
            settings_theme_title: "ตั้งค่าโทนสีหน้าจอของโปรแกรม (Theme)",
            settings_theme: "เลือกธีมที่ต้องการใช้งาน",
            settings_save_theme_btn: "บันทึกและเปิดใช้งานธีม",

            theme_green: "เขียวคลินิก",
            theme_blue: "ฟ้าพาสเทล",
            theme_dark: "โหมดมืด",
            theme_pink: "ชมพูอบอุ่น",
            theme_charcoal: "ชาร์โคลแอนด์ซิลเวอร์",
            exp_med_supplies: "เวชภัณฑ์และยา",
            exp_utilities: "สาธารณูปโภค (น้ำ/ไฟ)",
            exp_rent: "ค่าเช่าสถานที่",
            exp_other: "อื่น ๆ",
            filter_start_date: "วันที่เริ่มต้น:",
            filter_end_date: "วันที่สิ้นสุด:",
            visit_treatment_label: "การรักษา/หัตถการ/คำแนะนำ",
            visit_preview_pdf: "ดูตัวอย่าง PDF",
            dash_log_tx_title: "บันทึกรายรับ-รายจ่าย",
            dash_tx_type: "ประเภท",
            tx_type_expense: "รายจ่าย",
            tx_type_income: "รายรับ",
            dash_add_tx_btn: "บันทึก",
            dash_tx_category: "หมวดหมู่",
            cat_service_fee: "ค่าบริการตรวจรักษา",
            cat_medicine_sales: "ค่ายาและสินค้า",
            cat_other_income: "รายรับอื่นๆ",
            product_image: "รูปภาพสินค้า",
            settings_practitioner_title: "ตำแหน่งวิชาชีพ",
            settings_output_dir: "โฟลเดอร์บันทึกไฟล์ PDF",
            emr_history_title: "ประวัติการตรวจรักษาคนไข้",
            emr_details_title: "รายละเอียดการตรวจรักษา",
            table_date: "วันเวลาที่มารับบริการ",
            visit_select_patient: "เลือกรายชื่อคนไข้",
            visit_select_placeholder: "-- เลือกรายชื่อคนไข้ --"
    },
    en: {
        nav_dashboard: "Dashboard",
        nav_patients: "Patients",
        nav_visit: "Visit Form",
        nav_inventory: "Inventory",
        nav_pos: "POS Checkout",
        nav_settings: "Settings",
        logout: "Logout",
        header_dashboard: "Clinic Performance Summary",
        header_patients: "Patient Directory",
        header_visit: "Record Patient Visit",
        header_inventory: "Medicine & Supply Inventory",
        header_pos: "Point of Sale (POS)",
        header_settings: "System Settings",
        register_patient: "Register Patient Profile",
        patient_sec_profile: "Patient Profile",
        patient_hn: "HN (Hospital Number)",
        patient_citizen_id: "Citizen ID (13 digits - Optional)",
        patient_name: "Full Name",
        patient_gender: "Gender",
        gender_male: "Male",
        gender_female: "Female",
        gender_other: "Other",
        patient_dob: "Date of Birth",
        patient_nationality: "Nationality (Optional)",
        patient_race: "Race (Optional)",
        patient_marital_status: "Marital Status (Optional)",
        marital_single: "Single",
        marital_married: "Married",
        marital_widowed: "Widowed",
        marital_divorced: "Divorced",
        marital_other: "Other",
        patient_marital_status_other: "Specify Marital Status",
        patient_phone: "Phone Number",
        patient_medical_right: "Medical Benefit Right (Optional)",
        right_universal: "Universal Healthcare (30 Baht)",
        right_social: "Social Security",
        right_civil: "Civil Servant",
        right_self: "Self-pay/Other",
        patient_sec_address: "Addresses",
        patient_card_address: "Address on ID Card (Optional)",
        patient_contact_address: "Contactable Address (Optional)",
        patient_same_address: "Same as ID Card Address",
        patient_sec_emergency: "Emergency Contact",
        patient_emergency_name: "Emergency Contact Name (Optional)",
        patient_emergency_phone: "Emergency Phone Number (Optional)",
        patient_sec_medical: "Medical History",
        patient_underlying_disease: "Underlying Disease (Optional)",
        patient_allergies: "Drug/Food/Chemical Allergies (Optional)",
        patient_sec_record: "Recorded Details",
        patient_recorded_date: "Recorded Date",
        patient_informant_name: "Informant Name (Optional)",
        patient_recorder_name: "Recorder Name",
        save: "Save",
        cancel: "Cancel",
        visit_record_title: "Record Clinical Visit Details",
        visit_active_patient: "Active Patient:",
        visit_patient_name_label: "Name:",
        visit_sec_vitals: "1. Patient Vitals",
        vitals_bp: "Blood Pressure (mmHg)",
        vitals_pulse: "Pulse Rate (bpm)",
        vitals_rr: "Respiratory Rate (/min)",
        vitals_temp: "Temperature (°C)",
        vitals_weight: "Weight (kg)",
        vitals_height: "Height (cm)",
        vitals_bmi: "Calculated BMI",
        visit_sec_clinical: "2. Clinical Record & Treatment",
        visit_symptoms: "Chief Complaint & Symptoms",
        visit_present_illness: "Present Illness",
        visit_past_history: "Past History",
        visit_regular_medication: "Regular Medications",
        visit_pe_notes: "Physical Examination Notes",
        visit_diagnosis: "Diagnosis",
        visit_prescribe_label: "Prescribe Medications / Services",
        add: "Add Item",
        table_item: "Product/Service Name",
        table_qty: "Qty",
        table_price: "Unit Price",
        table_total: "Subtotal",
        table_action: "Action",
        visit_total_bill: "Total Invoice Bill:",
        visit_save: "Save Visit Records",
        visit_print_pdf: "Print Invoice/PDF",
        settings_clinic_title: "Clinic Information Details",
        settings_success: "Settings saved successfully!",
        settings_clinic_name: "Clinic Name",
        settings_clinic_header: "Clinic Header Info (Letterhead)",
        settings_clinic_id: "Clinic ID",
        settings_clinic_province: "Province",
        settings_clinic_zone: "NHSO Zone",
        settings_clinic_tel: "Clinic Tel Number",
        settings_practitioner: "Default Medical Practitioner",
        settings_save_clinic_btn: "Save Clinic Information",

        // New Translations added to cover 100% of UI
        dash_total_patients: "Total Registered Patients",
        dash_income: "Cumulative Income",
        dash_expense: "Cumulative Expense",
        dash_profit: "Net Profit",
        dash_today_visits: "Today's Total Visits",
        dash_low_stock: "Low Stock Items",
        dash_log_expense: "Log New Expense",
        dash_expense_amount: "Amount (Baht)",
        dash_expense_category: "Expense Category",
        dash_expense_desc: "Description Detail",
        dash_add_expense: "Add Expense Item",
        dash_recent_transactions: "Recent Financial Transactions",

        patients_search_placeholder: "Search by Name, HN, or Phone...",
        patients_add_btn: "+ Register New Patient",
        table_hn: "HN",
        table_name: "Full Name",
        table_gender: "Gender",
        table_phone: "Phone",
        table_allergies: "Allergies",

        inventory_search_placeholder: "Search by Product Name...",
        inventory_add_btn: "+ Add New Product",
        table_id: "Product ID",
        table_stock: "Stock Quantity",
        table_unit: "Unit",
        table_min: "Min Stock Alert Limit",

        product_title: "Product / Medicine Information",
        product_id: "Product ID (Auto-generated by System)",
        product_name_label: "Product / Medicine Name",
        product_price: "Retail Unit Price (Baht)",
        product_stock: "Initial Stock Quantity",
        product_unit: "Unit Type (e.g. tablet, bottle)",
        product_min_stock: "Min Stock Level to Alert",

        restock_title: "Restock Product Stock",
        restock_qty: "Quantity to Add",
        confirm: "Confirm Transaction",

        pos_add_title: "Add Product to Cart",
        pos_product_label: "Choose Product / Medicine",
        pos_qty_label: "Specify Quantity",
        pos_add_btn: "Add to Current Cart",
        pos_catalog_title: "Quick Add Catalog List",
        pos_cart_title: "Items in Current Invoice",
        pos_discount: "Special Discount Amount (Baht)",
        pos_cash: "Cash Paid by Customer (Baht)",
        pos_total: "Total Net Amount:",
        pos_change: "Change to Return:",
        pos_checkout: "Checkout & Print Invoice",
        pos_clear: "Clear All Cart Items",

        settings_auth_title: "Admin Account Authentication Settings",
        settings_username: "Username",
        settings_password: "Password",
        settings_save_auth_btn: "Save Account Info",
        settings_theme_title: "Application Screen Theme Color Settings",
        settings_theme: "Select Theme to Use",
        settings_save_theme_btn: "Save and Activate Theme",

        theme_green: "Clinic Green",
        theme_blue: "Soft Blue",
        theme_dark: "Dark Mode",
        theme_pink: "Warm Pink",
        theme_charcoal: "Charcoal & Silver",
        exp_med_supplies: "Medical Supplies",
        exp_utilities: "Utilities (Water/Electricity)",
        exp_rent: "Rental Space",
        exp_other: "Other",
        filter_start_date: "Start Date:",
        filter_end_date: "End Date:",
        visit_treatment_label: "Treatment, Procedures & Advice",
        visit_preview_pdf: "Preview PDF",
        dash_log_tx_title: "Log Transaction",
        dash_tx_type: "Transaction Type",
        tx_type_expense: "Expense",
        tx_type_income: "Income",
        dash_add_tx_btn: "Add Transaction",
        dash_tx_category: "Category",
        cat_service_fee: "Service Fee",
        cat_medicine_sales: "Medicine/Sales",
        cat_other_income: "Other Income",
        product_image: "Product Image",
        settings_practitioner_title: "Practitioner Title",
        settings_output_dir: "PDF Output Directory",
        emr_history_title: "Patient Visit History",
        emr_details_title: "Visit Examination Details",
        table_date: "Date & Time",
        visit_select_patient: "Select Patient",
        visit_select_placeholder: "-- Choose Patient --"
    }
};

// Application State
let currentSettings = {
    username: "admin",
    password: "med1234",
    clinicName: "Parinda Clinic",
    clinicHeader: "123 Main St, Bangkok",
    clinicAddress: "123 Main St, Bangkok",
    clinicTel: "02-123-4567",
    defaultPractitioner: "Dr. Parinda",
    theme: "clinic-green",
    clinicId: "10999",
    clinicProvince: "กรุงเทพมหานคร",
    clinicZone: "เขต 13 กรุงเทพมหานคร",
    lang: "th"
};

let patients = [];
let products = [];
let visits = [];
let transactions = [];
let expenses = [];

let isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

// Navigation Mapping
const navItems = {
    'nav-dashboard': 'dashboard-page',
    'nav-patients': 'patients-page',
    'nav-visit': 'visit-form-page',
    'nav-inventory': 'inventory-page',
    'nav-pos': 'pos-page',
    'nav-settings': 'settings-page'
};

// Router / Navigation Handler
function navigateTo(targetId) {
    const tabPages = document.querySelectorAll('.tab-page');
    tabPages.forEach(page => page.classList.add('hidden'));

    const targetPage = document.getElementById(targetId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }

    // Set active link class
    Object.keys(navItems).forEach(navId => {
        const el = document.getElementById(navId);
        if (el) {
            if (navItems[navId] === targetId) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    });

    // Refresh view specific logic
    if (targetId === 'dashboard-page') refreshDashboardView();
    if (targetId === 'patients-page') refreshPatientsView();
    if (targetId === 'visit-form-page') refreshVisitFormView();
    if (targetId === 'inventory-page') refreshInventoryView();
    if (targetId === 'pos-page') refreshPosView();
    if (targetId === 'settings-page') refreshSettingsView();
}

// Setup click handlers for sidebar items
Object.keys(navItems).forEach(navId => {
    const el = document.getElementById(navId);
    if (el) {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(navItems[navId]);
        });
    }
});

// DB loader
async function loadDb() {
    try {
        if (window.api) {
            const savedSettings = await window.api.settingsGet();
            if (savedSettings) {
                currentSettings = {
                    ...currentSettings,
                    ...savedSettings,
                    username: savedSettings.username || currentSettings.username,
                    password: savedSettings.password || currentSettings.password
                };
            }
            if (isTest) {
                currentSettings.lang = 'en';
            }
            patients = await window.api.dbRead('patients', {}) || [];
            products = await window.api.dbRead('products', {}) || [];
            visits = await window.api.dbRead('visits', {}) || [];
            transactions = await window.api.dbRead('transactions', {}) || [];
            expenses = await window.api.dbRead('expenses', {}) || [];
        }
    } catch (err) {
        console.error('Failed to load database:', err);
        currentSettings.username = currentSettings.username || 'admin';
        currentSettings.password = currentSettings.password || 'med1234';
    }
}

// Initialize App
async function initApp() {
    await loadDb();
    applyTheme(currentSettings.theme || 'clinic-green');
    applyLanguage(currentSettings.lang || 'th');
    updateClinicUIHeaders();
    refreshSettingsView();
    populateVisitPatientSelector();

    // Listen for language selector changes
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.addEventListener('change', async(e) => {
            applyLanguage(e.target.value);
            await persistSettings();
        });
    }

    if (isLoggedIn) {
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        navigateTo('dashboard-page');
    } else {
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('app-shell').classList.add('hidden');
    }
}

// Language Applier
function applyLanguage(lang) {
    currentSettings.lang = lang;
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.value = lang;
    }

    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[lang][key];
            } else {
                // If element has a child with class "icon", preserve it and only replace text content
                const iconSpan = el.querySelector('.icon');
                if (iconSpan) {
                    el.innerHTML = '';
                    el.appendChild(iconSpan);
                    el.appendChild(document.createTextNode(' ' + translations[lang][key]));
                } else {
                    el.textContent = translations[lang][key];
                }
            }
        }
    });

    // Translate dynamic headers if present
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        const currentActiveNav = document.querySelector('.nav-item.active');
        if (currentActiveNav) {
            const navId = currentActiveNav.id;
            const headerKey = navId.replace('nav-', 'header_');
            if (translations[lang] && translations[lang][headerKey]) {
                headerTitle.textContent = translations[lang][headerKey];
            }
        }
    }

    // Dynamic views refresh
    if (typeof refreshDashboardView === 'function') refreshDashboardView();
    if (typeof refreshPatientsView === 'function') refreshPatientsView();
    if (typeof refreshVisitFormView === 'function') refreshVisitFormView();
    if (typeof refreshInventoryView === 'function') refreshInventoryView();
    if (typeof refreshPosView === 'function') refreshPosView();
    if (typeof refreshSettingsView === 'function') refreshSettingsView();
}

// Theme Applier
function applyTheme(theme) {
    let activeTheme = theme;
    if (activeTheme === 'dark-mode') {
        activeTheme = 'dark';
    }
    const validThemes = ['clinic-green', 'soft-blue', 'dark', 'warm-pink', 'charcoal-silver'];
    const fallbackTheme = validThemes.includes(activeTheme) ? activeTheme : 'clinic-green';

    // Set attribute
    document.body.setAttribute('data-theme', fallbackTheme);

    // Sync settings theme select field
    const themeSelect = document.getElementById('settings-theme-select');
    if (themeSelect) {
        themeSelect.value = fallbackTheme;
    }
}

// Update clinic text headers
function updateClinicUIHeaders() {
    const sidebarClinicName = document.getElementById('sidebar-clinic-name');
    const headerClinicDetails = document.getElementById('header-clinic-details');
    const headerPractitioner = document.getElementById('header-practitioner');

    if (sidebarClinicName) {
        sidebarClinicName.textContent = currentSettings.clinicName || 'Parinda Clinic';
    }
    if (headerClinicDetails) {
        headerClinicDetails.textContent = `Address: ${currentSettings.clinicAddress || ''} | Tel: ${currentSettings.clinicTel || ''}`;
    }
    if (headerPractitioner) {
        headerPractitioner.textContent = `Practitioner: ${currentSettings.defaultPractitioner || ''}`;
    }
}

// Settings Save Helper
async function persistSettings() {
    if (window.api) {
        await window.api.settingsSave(currentSettings);
    }
    updateClinicUIHeaders();
}

// Login handler
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const usernameVal = document.getElementById('username').value.trim();
        const passwordVal = document.getElementById('password').value;

        if (usernameVal === currentSettings.username && passwordVal === currentSettings.password) {
            isLoggedIn = true;
            sessionStorage.setItem('isLoggedIn', 'true');
            document.getElementById('login-error-msg').classList.add('hidden');
            document.getElementById('login-container').classList.add('hidden');
            document.getElementById('app-shell').classList.remove('hidden');

            updateClinicUIHeaders();
            navigateTo('dashboard-page');
        } else {
            const errorEl = document.getElementById('login-error-msg');
            errorEl.textContent = 'Invalid admin username or password.';
            errorEl.classList.remove('hidden');
        }
    });
}

// Logout handler
const logoutBtn = document.getElementById('nav-logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        isLoggedIn = false;
        sessionStorage.removeItem('isLoggedIn');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('app-shell').classList.add('hidden');
        document.getElementById('login-container').classList.remove('hidden');
    });
}

// --- Dashboard Logic ---
function refreshDashboardView() {
    // Total Patients KPI
    document.getElementById('dash-total-patients').textContent = patients.length;

    // Today's Visits KPI
    const todayStr = new Date().toISOString().split('T')[0];
    const todayVisitsCount = visits.filter(v => v.date === todayStr).length;
    const todayVisitsEl = document.getElementById('dash-today-visits');
    if (todayVisitsEl) todayVisitsEl.textContent = todayVisitsCount;

    // Low Stock KPI
    const lowStockCount = products.filter(p => p.stock <= p.minStockAlert).length;
    const lowStockEl = document.getElementById('dash-low-stock');
    if (lowStockEl) lowStockEl.textContent = lowStockCount;

    // Update stock progress bar
    const progressContainer = document.getElementById('dash-stock-progress-container');
    const progressBar = document.getElementById('dash-stock-progress-bar');
    if (progressContainer && progressBar) {
        if (lowStockCount > 0) {
            progressContainer.classList.remove('hidden');
            const percent = Math.min(100, Math.round((lowStockCount / (products.length || 1)) * 100));
            progressBar.style.width = `${percent}%`;
        } else {
            progressContainer.classList.add('hidden');
            progressBar.style.width = '0%';
        }
    }

    // Calculate income, expense, profit
    const startDateVal = document.getElementById('dashboard-start-date').value;
    const endDateVal = document.getElementById('dashboard-end-date').value;

    if (startDateVal && endDateVal && startDateVal > endDateVal) {
        console.warn('Start date cannot be after end date');
        return;
    }

    let filteredTxs = transactions;
    if (startDateVal) {
        filteredTxs = filteredTxs.filter(t => t.date >= startDateVal);
    }
    if (endDateVal) {
        filteredTxs = filteredTxs.filter(t => t.date <= endDateVal);
    }

    let income = 0;
    let expense = 0;
    filteredTxs.forEach(t => {
        if (t.type === 'income') {
            income += Number(t.amount);
        } else if (t.type === 'expense') {
            expense += Number(t.amount);
        }
    });

    const profit = income - expense;

    document.getElementById('dashboard-kpi-income').textContent = income;
    document.getElementById('dashboard-kpi-expense').textContent = expense;
    document.getElementById('dashboard-kpi-profit').textContent = profit;

    // Update transaction list
    const expenseListEl = document.getElementById('dashboard-expense-list');
    expenseListEl.innerHTML = '';

    const sortedTxs = [...transactions].reverse();
    const isTh = currentSettings.lang === 'th';

    sortedTxs.forEach((tx, reversedIdx) => {
        // ไม่แสดงรายการที่มียอด 0 บาท
        if (Number(tx.amount) === 0) return;

        // แปลง description สไตล์ AI ให้เป็นภาษาธรรมชาติ
        let displayDesc = tx.description || (isTh ? 'ธุรกรรม' : 'Transaction');
        if (displayDesc.startsWith('Payment for visit-')) {
            // รูปแบบเดิม: "Payment for visit-visit-xxxxx (ชื่อ - HNxxxxxx)"
            const nameHnMatch = displayDesc.match(/\((.+?)\s*-\s*(HN\w+)\)/);
            if (nameHnMatch) {
                displayDesc = isTh ?
                    `ค่ารักษาพยาบาล — ${nameHnMatch[1]} ${nameHnMatch[2]}` :
                    `Medical fee — ${nameHnMatch[1]} ${nameHnMatch[2]}`;
            } else {
                displayDesc = isTh ? 'ค่ารักษาพยาบาล' : 'Medical fee';
            }
        } else if (displayDesc === 'Counter Sale') {
            displayDesc = isTh ? 'ขายหน้าร้าน (POS)' : 'Counter Sale (POS)';
        }

        // คำนวณ index จริงใน transactions array
        const realIdx = transactions.length - 1 - reversedIdx;

        const typeLabel = tx.type === 'income' ?
            `<span class="tx-badge tx-badge-income">${isTh ? 'รายรับ' : 'Income'}</span>` :
            `<span class="tx-badge tx-badge-expense">${isTh ? 'รายจ่าย' : 'Expense'}</span>`;

        const div = document.createElement('div');
        div.style.padding = '10px 12px';
        div.style.borderBottom = '1px solid var(--border-color)';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.gap = '8px';

        const infoDiv = document.createElement('div');
        infoDiv.style.flex = '1';
        infoDiv.style.minWidth = '0';
        infoDiv.innerHTML = `
        ${typeLabel}
        <div style="font-weight:600; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${displayDesc}">${displayDesc}</div>
        <small style="color:var(--text-secondary);">${tx.date}</small>
      `;

        const rightDiv = document.createElement('div');
        rightDiv.style.display = 'flex';
        rightDiv.style.alignItems = 'center';
        rightDiv.style.gap = '10px';
        rightDiv.style.flexShrink = '0';

        const amountSpan = document.createElement('span');
        amountSpan.style.fontWeight = 'bold';
        amountSpan.style.fontSize = '14px';
        amountSpan.style.color = tx.type === 'income' ? 'var(--success-color)' : 'var(--error-color)';
        amountSpan.textContent = `฿${Number(tx.amount).toFixed(2)}`;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.style.padding = '3px 8px';
        deleteBtn.style.fontSize = '11px';
        deleteBtn.style.opacity = '0.7';
        deleteBtn.textContent = isTh ? 'ลบ' : 'Del';
        deleteBtn.title = isTh ? 'ลบรายการนี้' : 'Delete this entry';
        deleteBtn.addEventListener('click', async() => {
            const confirmMsg = isTh ? 'ต้องการลบรายการนี้ใช่ไหม?' : 'Delete this transaction?';
            showConfirmPopup(confirmMsg, (confirmed) => {
                if (confirmed) {
                    transactions.splice(realIdx, 1);
                    if (window.api) window.api.dbWrite('transactions', transactions);
                    refreshDashboardView();
                }
            });
        });

        rightDiv.appendChild(amountSpan);
        rightDiv.appendChild(deleteBtn);
        div.appendChild(infoDiv);
        div.appendChild(rightDiv);
        expenseListEl.appendChild(div);
    });
}

// Chart rendering functions
let currentChartType = 'line';

function renderLineChart(ctx, data, labels) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = Math.max(...data, 100);
    const minVal = Math.min(...data, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.font = '12px Inter, Sarabun, sans-serif';

    // Draw axes
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    // Draw line
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#10b981';
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    data.forEach((val, i) => {
        const x = padding + (chartWidth / (labels.length - 1 || 1)) * i;
        const y = height - padding - ((val - minVal) / (maxVal - minVal || 1)) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw points
    data.forEach((val, i) => {
        const x = padding + (chartWidth / (labels.length - 1 || 1)) * i;
        const y = height - padding - ((val - minVal) / (maxVal - minVal || 1)) * chartHeight;
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#64748b';
    labels.forEach((label, i) => {
        const x = padding + (chartWidth / (labels.length - 1 || 1)) * i;
        ctx.fillText(label, x - 15, height - padding + 20);
    });
}

function renderBarChart(ctx, data, labels) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = Math.max(...data, 100);

    ctx.clearRect(0, 0, width, height);
    ctx.font = '12px Inter, Sarabun, sans-serif';

    const barWidth = chartWidth / data.length * 0.7;
    const barSpacing = chartWidth / data.length;

    data.forEach((val, i) => {
        const x = padding + barSpacing * i + barSpacing * 0.15;
        const barHeight = (val / maxVal) * chartHeight;
        const y = height - padding - barHeight;

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#10b981';
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#64748b';
        ctx.fillText(labels[i], x + barWidth / 2 - 15, height - padding + 20);
    });
}

function renderPieChart(ctx, data, labels) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 60;

    ctx.clearRect(0, 0, width, height);
    ctx.font = '12px Inter, Sarabun, sans-serif';

    const total = data.reduce((a, b) => a + b, 0) || 1;
    let currentAngle = -Math.PI / 2;

    const colors = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#ec4899', '#64748b'];

    data.forEach((val, i) => {
        const sliceAngle = (val / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();

        // Draw label
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + (radius + 25) * Math.cos(labelAngle);
        const labelY = centerY + (radius + 25) * Math.sin(labelAngle);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#1e293b';
        ctx.fillText(labels[i], labelX - 20, labelY);

        currentAngle += sliceAngle;
    });
}

function refreshDashboardChart() {
    const canvas = document.getElementById('dashboard-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 280;

    const startDateVal = document.getElementById('dashboard-start-date').value;
    const endDateVal = document.getElementById('dashboard-end-date').value;

    let filteredTxs = transactions;
    if (startDateVal) filteredTxs = filteredTxs.filter(t => t.date >= startDateVal);
    if (endDateVal) filteredTxs = filteredTxs.filter(t => t.date <= endDateVal);

    const months = {};
    filteredTxs.forEach(t => {
        if (t.date && !months[t.date]) months[t.date] = { income: 0, expense: 0 };
        if (t.type === 'income') months[t.date].income += Number(t.amount);
        else months[t.date].expense += Number(t.amount);
    });

    const dates = Object.keys(months).sort();
    const incomeData = dates.map(d => months[d].income);
    const expenseData = dates.map(d => months[d].expense);

    if (currentChartType === 'line') {
        const combined = incomeData.map((inc, i) => inc - expenseData[i]);
        renderLineChart(ctx, combined, dates.map(d => d.slice(5)));
    } else if (currentChartType === 'bar') {
        const visitsPerMonth = visits.reduce((acc, v) => {
            if (!acc[v.date]) acc[v.date] = 0;
            acc[v.date]++;
            return acc;
        }, {});
        const visitData = dates.map(d => visitsPerMonth[d] || 0);
        renderBarChart(ctx, visitData, dates.map(d => d.slice(5)));
    } else if (currentChartType === 'pie') {
        const lowStock = products.filter(p => p.stock <= p.minStockAlert).length;
        const normalStock = products.length - lowStock;
        renderPieChart(ctx, [normalStock, lowStock], ['Normal', 'Low Stock']);
    }
}

// Chart toggle buttons
setTimeout(() => {
    document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-toggle-btn').forEach(b => b.classList.remove('btn-primary', 'btn-secondary'));
            btn.classList.add('btn-primary');
            currentChartType = btn.id.includes('line') ? 'line' : btn.id.includes('bar') ? 'bar' : 'pie';
            refreshDashboardChart();
        });
    });
    document.getElementById('chart-btn-line')?.classList.add('btn-primary');
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer) chartContainer.style.display = 'block';
}, 100);

// Override chart rendering on dashboard view
const originalRefreshDashboardView = refreshDashboardView; refreshDashboardView = function() {
    originalRefreshDashboardView.apply(this, arguments);
    setTimeout(() => refreshDashboardChart(), 50);
};

// Dashboard filter apply
const applyFilterBtn = document.getElementById('dashboard-apply-filter-btn');
if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', () => {
        refreshDashboardView();
    });
}

// Dashboard log transaction submit
const expenseForm = document.getElementById('expense-form');
if (expenseForm) {
    expenseForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const type = document.getElementById('tx-type-select').value;
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('tx-category-select').value;
        const description = document.getElementById('expense-desc').value.trim();

        const lang = currentSettings.lang || 'th';

        if (isNaN(amount) || amount <= 0) {
            alert(lang === 'th' ? 'กรุณากรอกจำนวนเงินให้ถูกต้อง (ต้องมากกว่า 0)' : 'Amount must be positive');
            return;
        }
        if (!description) {
            alert(lang === 'th' ? 'กรุณากรอกรายละเอียดธุรกรรม' : 'Description is required');
            return;
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const newTx = {
            id: `tx-${Date.now()}`,
            type: type, // 'income' or 'expense'
            amount,
            date: dateStr,
            description: `[${category}] ${description}`
        };

        if (type === 'expense') {
            const newExp = {
                id: `exp-${Date.now()}`,
                amount,
                date: dateStr,
                category,
                description
            };
            expenses.push(newExp);
        }

        transactions.push(newTx);

        if (window.api) {
            if (type === 'expense') {
                await window.api.dbWrite('expenses', expenses);
            }
            await window.api.dbWrite('transactions', transactions);
        }

        expenseForm.reset();
        refreshDashboardView();
    });
}


// --- Patients Logic ---
let editingPatientHn = null;

function refreshPatientsView(searchQuery = '') {
    const tableBody = document.getElementById('patient-table-body');
    tableBody.innerHTML = '';

    let filtered = patients;
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = patients.filter(p =>
            (p.name || '').toLowerCase().includes(q) ||
            (p.hn || '').toLowerCase().includes(q) ||
            (p.phone || '').includes(q)
        );
    }

    filtered.forEach(p => {
        const tr = document.createElement('tr');

        const tdHn = document.createElement('td');
        tdHn.textContent = p.hn;
        tr.appendChild(tdHn);

        const tdName = document.createElement('td');
        tdName.textContent = p.name;
        tr.appendChild(tdName);

        const lang = currentSettings.lang || 'th';
        const isTh = lang === 'th';

        const tdGender = document.createElement('td');
        tdGender.textContent = p.gender === 'Male' ? (isTh ? 'ชาย' : 'Male') : (p.gender === 'Female' ? (isTh ? 'หญิง' : 'Female') : p.gender);
        tr.appendChild(tdGender);

        const tdPhone = document.createElement('td');
        tdPhone.textContent = p.phone;
        tr.appendChild(tdPhone);

        const tdAllergies = document.createElement('td');
        if (p.allergies && p.allergies !== 'None' && p.allergies !== 'ไม่มี') {
            const badge = document.createElement('span');
            badge.className = 'allergy-badge-alert';
            badge.textContent = p.allergies;
            tdAllergies.appendChild(badge);
        } else {
            tdAllergies.textContent = isTh ? 'ไม่มี' : 'None';
        }
        tr.appendChild(tdAllergies);

        const tdActions = document.createElement('td');

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-edit-patient';
        btnEdit.style.padding = '4px 8px';
        btnEdit.style.fontSize = '12px';
        btnEdit.style.marginRight = '5px';
        btnEdit.textContent = isTh ? 'แก้ไข' : 'Edit';
        btnEdit.addEventListener('click', () => {
            openPatientModal(p);
        });
        tdActions.appendChild(btnEdit);

        const btnVisit = document.createElement('button');
        btnVisit.className = 'btn btn-start-visit';
        btnVisit.style.padding = '4px 8px';
        btnVisit.style.fontSize = '12px';
        btnVisit.textContent = isTh ? 'ตรวจรักษา' : 'Start Visit';
        btnVisit.addEventListener('click', () => {
            startVisitForPatient(p);
        });
        tdActions.appendChild(btnVisit);

        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn btn-danger';
        btnDelete.style.padding = '4px 8px';
        btnDelete.style.fontSize = '12px';
        btnDelete.style.marginLeft = '5px';
        btnDelete.textContent = isTh ? 'ลบ' : 'Delete';
        btnDelete.addEventListener('click', () => {
            const confirmMsg = isTh ? `ต้องการลบประวัติคนไข้ ${p.name} ใช่ไหม?` : `Delete patient ${p.name}?`;
            showConfirmPopup(confirmMsg, (confirmed) => {
                if (confirmed) {
                    const idx = patients.findIndex(patient => patient.hn === p.hn);
                    if (idx !== -1) {
                        patients.splice(idx, 1);
                        if (window.api) window.api.dbWrite('patients', patients);
                        refreshPatientsView();
                    }
                }
            });
        });
        tdActions.appendChild(btnDelete);

        tr.appendChild(tdActions);
        tableBody.appendChild(tr);
    });
}

function generateHn(patientList) {
    let maxNum = 2; // Default starting sequence helper
    patientList.forEach(p => {
        if (p.hn && p.hn.startsWith('HN69')) {
            const suffix = p.hn.substring(4);
            const num = parseInt(suffix, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    return `HN69${String(maxNum + 1).padStart(4, '0')}`;
}

// Address copy event listener
const copyAddressChk = document.getElementById('copy-address-chk');
if (copyAddressChk) {
    copyAddressChk.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.getElementById('patient-contact-address-input').value = document.getElementById('patient-card-address-input').value;
        }
    });
}

// Marital Status dropdown change listener to toggle "other" group
const maritalSelect = document.getElementById('patient-marital-status-select');
if (maritalSelect) {
    maritalSelect.addEventListener('change', (e) => {
        const otherGroup = document.getElementById('patient-marital-status-other-group');
        if (e.target.value === 'Other') {
            otherGroup.classList.remove('hidden');
        } else {
            otherGroup.classList.add('hidden');
        }
    });
}

function openPatientModal(patient = null) {
    const modal = document.getElementById('patient-form-modal');
    const title = document.getElementById('patient-modal-title');
    document.getElementById('patient-form').reset();
    document.getElementById('patient-marital-status-other-group').classList.add('hidden');

    // Pre-fill today's date in recordedDate
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('patient-recorded-date-input').value = todayStr;
    document.getElementById('patient-recorder-name-input').value = currentSettings.defaultPractitioner || 'Admin';

    if (patient) {
        title.textContent = currentSettings.lang === 'th' ? 'แก้ไขประวัติคนไข้' : 'Edit Patient';
        editingPatientHn = patient.hn;
        document.getElementById('patient-hn-input').value = patient.hn;
        document.getElementById('patient-citizen-id-input').value = patient.citizenId || '';
        document.getElementById('patient-name-input').value = patient.name;
        document.getElementById('patient-dob-input').value = patient.dob;
        document.getElementById('patient-gender-select').value = patient.gender;
        document.getElementById('patient-nationality-input').value = patient.nationality || 'ไทย';
        document.getElementById('patient-race-input').value = patient.race || 'ไทย';

        const marital = patient.maritalStatus || 'Single';
        document.getElementById('patient-marital-status-select').value = marital;
        if (marital === 'Other') {
            document.getElementById('patient-marital-status-other-group').classList.remove('hidden');
            document.getElementById('patient-marital-status-other-input').value = patient.maritalStatusOther || '';
        }

        document.getElementById('patient-phone-input').value = patient.phone;
        document.getElementById('patient-medical-right-select').value = patient.medicalRight || 'Universal Healthcare / 30 Baht';
        document.getElementById('patient-card-address-input').value = patient.cardAddress || '';
        document.getElementById('patient-contact-address-input').value = patient.contactAddress || '';
        document.getElementById('patient-emergency-name-input').value = patient.emergencyName || '';
        document.getElementById('patient-emergency-phone-input').value = patient.emergencyPhone || '';
        document.getElementById('patient-underlying-disease-input').value = patient.underlyingDisease || '';
        document.getElementById('patient-allergies-input').value = patient.allergies || '';
        document.getElementById('patient-recorded-date-input').value = patient.recordedDate || todayStr;
        document.getElementById('patient-informant-name-input').value = patient.informantName || '';
        document.getElementById('patient-recorder-name-input').value = patient.recorderName || 'Admin';
    } else {
        title.textContent = currentSettings.lang === 'th' ? 'ลงทะเบียนคนไข้ใหม่' : 'Register Patient';
        editingPatientHn = null;
        document.getElementById('patient-hn-input').value = 'Auto-generated';
        document.getElementById('patient-nationality-input').value = 'ไทย';
        document.getElementById('patient-race-input').value = 'ไทย';
        document.getElementById('patient-informant-name-input').value = '';
    }

    modal.classList.remove('hidden');
}

const patientCancelBtn = document.getElementById('patient-cancel-btn');
if (patientCancelBtn) {
    patientCancelBtn.addEventListener('click', () => {
        document.getElementById('patient-form-modal').classList.add('hidden');
    });
}

const patientForm = document.getElementById('patient-form');
if (patientForm) {
    patientForm.addEventListener('submit', async(e) => {
        e.preventDefault();

        const citizenId = document.getElementById('patient-citizen-id-input').value.trim();
        const name = document.getElementById('patient-name-input').value.trim();
        const dob = document.getElementById('patient-dob-input').value;
        const gender = document.getElementById('patient-gender-select').value;
        const nationality = document.getElementById('patient-nationality-input').value.trim();
        const race = document.getElementById('patient-race-input').value.trim();
        const maritalStatus = document.getElementById('patient-marital-status-select').value;
        const maritalStatusOther = document.getElementById('patient-marital-status-other-input').value.trim();
        const phone = document.getElementById('patient-phone-input').value.trim();
        const medicalRight = document.getElementById('patient-medical-right-select').value;
        const cardAddress = document.getElementById('patient-card-address-input').value.trim();
        const contactAddress = document.getElementById('patient-contact-address-input').value.trim();
        const emergencyName = document.getElementById('patient-emergency-name-input').value.trim();
        const emergencyPhone = document.getElementById('patient-emergency-phone-input').value.trim();
        const underlyingDisease = document.getElementById('patient-underlying-disease-input').value.trim() || 'None';
        const allergies = document.getElementById('patient-allergies-input').value.trim() || 'None';
        const recordedDate = document.getElementById('patient-recorded-date-input').value;
        const informantName = document.getElementById('patient-informant-name-input').value.trim();
        const recorderName = document.getElementById('patient-recorder-name-input').value.trim();

        // UI validation check with alert
        const lang = currentSettings.lang || 'th';

        if (citizenId && (citizenId.length !== 13 || isNaN(Number(citizenId)))) {
            alert(lang === 'th' ? 'กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลักเป็นตัวเลข' : 'Citizen ID must be exactly 13 digits.');
            return;
        }
        if (!name) {
            alert(lang === 'th' ? 'กรุณากรอกชื่อ-นามสกุล' : 'Name is required.');
            return;
        }
        if (!dob) {
            alert(lang === 'th' ? 'กรุณากรอกวันเกิด' : 'Date of birth is required.');
            return;
        }
        const dobDate = new Date(dob);
        if (dobDate > new Date()) {
            alert(lang === 'th' ? 'วันเกิดต้องไม่เป็นวันที่ในอนาคต' : 'Date of birth cannot be in the future.');
            return;
        }
        const birthYear = dobDate.getFullYear();
        const currentYear = new Date().getFullYear();
        if (currentYear - birthYear > 120) {
            alert(lang === 'th' ? 'อายุผู้ป่วยเกินขีดจำกัดสูงสุด (120 ปี)' : 'Age exceeds maximum limit.');
            return;
        }

        const telPattern = /^[0-9\-\+\s\(\)]+$/;
        if (!phone || !telPattern.test(phone)) {
            alert(lang === 'th' ? 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง' : 'Invalid phone format.');
            return;
        }
        if (emergencyPhone && !telPattern.test(emergencyPhone)) {
            alert(lang === 'th' ? 'กรุณากรอกเบอร์โทรติดต่อกรณีฉุกเฉินให้ถูกต้อง' : 'Invalid emergency phone format.');
            return;
        }

        // Check duplicate Citizen ID (only if provided)
        if (citizenId) {
            const duplicateCitizen = patients.some(p => p.citizenId === citizenId && p.hn !== editingPatientHn);
            if (duplicateCitizen) {
                alert(lang === 'th' ? 'เลขประจำตัวประชาชนนี้มีอยู่ในระบบแล้ว' : 'Citizen ID already exists in the system.');
                return;
            }
        }

        const patientData = {
            name,
            citizenId,
            dob,
            gender,
            nationality,
            race,
            maritalStatus,
            maritalStatusOther,
            phone,
            medicalRight,
            cardAddress,
            contactAddress,
            emergencyName,
            emergencyPhone,
            underlyingDisease,
            allergies,
            recordedDate,
            informantName,
            recorderName
        };

        if (editingPatientHn) {
            const idx = patients.findIndex(p => p.hn === editingPatientHn);
            if (idx !== -1) {
                patients[idx] = {...patients[idx], ...patientData };
            }
        } else {
            const newHn = generateHn(patients);
            patients.push({ hn: newHn, ...patientData });
        }

        if (window.api) {
            const success = await window.api.dbWrite('patients', patients);
            if (!success) {
                alert(lang === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล' : 'Database write failed.');
                return;
            }
        }

        document.getElementById('patient-form-modal').classList.add('hidden');
        refreshPatientsView();
    });
}

const registerPatientBtn = document.getElementById('register-patient-btn');
if (registerPatientBtn) {
    registerPatientBtn.addEventListener('click', () => {
        openPatientModal();
    });
}

const patientSearchBtn = document.getElementById('patient-search-btn');
const patientSearchInput = document.getElementById('patient-search-input');
if (patientSearchBtn && patientSearchInput) {
    patientSearchBtn.addEventListener('click', () => {
        refreshPatientsView(patientSearchInput.value.trim());
    });
    patientSearchInput.addEventListener('input', () => {
        refreshPatientsView(patientSearchInput.value.trim());
    });
}


// --- Visit Form Logic ---
let activePatient = null;
let activeVisitPrescriptions = [];

function populateVisitPatientSelector() {
    const selector = document.getElementById('visit-patient-selector');
    if (!selector) return;

    const lang = currentSettings.lang || 'th';
    const isTh = lang === 'th';

    const currentVal = selector.value;

    selector.innerHTML = `<option value="">${isTh ? '-- เลือกรายชื่อคนไข้ --' : '-- Choose Patient --'}</option>`;

    const sortedPatients = [...patients].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    sortedPatients.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.hn;
        opt.textContent = `[${p.hn}] ${p.name}`;
        selector.appendChild(opt);
    });

    if (activePatient) {
        selector.value = activePatient.hn;
    } else {
        selector.value = currentVal || '';
    }
}

// --- Visit Stepper Logic ---
let currentVisitStep = 1;

function setVisitStep(step) {
    const isTh = (currentSettings.lang || 'th') === 'th';
    if (step > 1 && !activePatient) {
        alert(isTh ? 'กรุณาเลือกคนไข้ก่อนเข้าสู่ขั้นตอนถัดไป' : 'Please select a patient before proceeding.');
        const selector = document.getElementById('visit-patient-selector');
        if (selector) selector.value = '';
        return;
    }

    currentVisitStep = step;

    // Show/hide content panes
    document.querySelectorAll('.visit-step-pane').forEach((pane, idx) => {
        if (idx + 1 === step) {
            pane.classList.remove('hidden');
        } else {
            pane.classList.add('hidden');
        }
    });

    // Update steps indicator styling
    document.querySelectorAll('.step-indicator').forEach((indicator, idx) => {
        const stepNum = idx + 1;
        indicator.classList.remove('active', 'completed');
        if (stepNum === step) {
            indicator.classList.add('active');
        } else if (stepNum < step) {
            indicator.classList.add('completed');
        }
    });

    // Update lines between indicators
    const line1 = document.getElementById('step-line-1');
    const line2 = document.getElementById('step-line-2');
    if (line1) {
        if (step > 1) line1.classList.add('completed');
        else line1.classList.remove('completed');
    }
    if (line2) {
        if (step > 2) line2.classList.add('completed');
        else line2.classList.remove('completed');
    }

    // Toggle nav buttons
    const btnPrev = document.getElementById('visit-btn-prev');
    const btnNext = document.getElementById('visit-btn-next');
    const saveActionsGroup = document.getElementById('visit-save-actions-group');

    if (btnPrev) {
        if (step === 1) btnPrev.classList.add('hidden');
        else btnPrev.classList.remove('hidden');
    }

    if (btnNext) {
        if (step === 3) btnNext.classList.add('hidden');
        else btnNext.classList.remove('hidden');
    }

    if (saveActionsGroup) {
        if (step === 3) {
            saveActionsGroup.style.display = 'flex';
            saveActionsGroup.classList.remove('hidden');
        } else {
            saveActionsGroup.style.display = 'none';
            saveActionsGroup.classList.add('hidden');
        }
    }
}

// Bind event listeners for steps navigation
setTimeout(() => {
    const btnPrev = document.getElementById('visit-btn-prev');
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (currentVisitStep > 1) {
                setVisitStep(currentVisitStep - 1);
            }
        });
    }

    const btnNext = document.getElementById('visit-btn-next');
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (currentVisitStep < 3) {
                setVisitStep(currentVisitStep + 1);
            }
        });
    }

    document.querySelectorAll('.step-indicator').forEach(ind => {
        ind.addEventListener('click', () => {
            const step = parseInt(ind.getAttribute('data-step'), 10);
            if (step) {
                setVisitStep(step);
            }
        });
    });
}, 100);

// Bind change event to direct patient selector dropdown
const visitPatientSelector = document.getElementById('visit-patient-selector');
if (visitPatientSelector) {
    visitPatientSelector.addEventListener('change', (e) => {
        const hn = e.target.value;
        if (!hn) {
            activePatient = null;
            activeVisitPrescriptions = [];
            document.getElementById('visit-patient-hn').textContent = (currentSettings.lang || 'th') === 'th' ? 'ไม่มี' : 'None';
            document.getElementById('visit-patient-name').textContent = (currentSettings.lang || 'th') === 'th' ? 'ไม่มี' : 'None';
            setVisitStep(1);
            refreshVisitFormView();
        } else {
            const patient = patients.find(p => p.hn === hn);
            if (patient) {
                // Trigger start visit logic (except navigating to page, since we are already on it)
                activePatient = patient;
                activeVisitPrescriptions = [];
                document.getElementById('vitals-bp').value = '';
                document.getElementById('vitals-hr').value = '';
                document.getElementById('vitals-rr').value = '';
                document.getElementById('vitals-temp').value = '';
                document.getElementById('vitals-weight').value = '';
                document.getElementById('vitals-height').value = '';
                document.getElementById('vitals-bmi').value = '';
                document.getElementById('visit-symptoms').value = '';
                document.getElementById('visit-present-illness').value = '';
                document.getElementById('visit-past-history').value = '';
                document.getElementById('visit-regular-medication').value = '';
                document.getElementById('visit-pe').value = '';
                document.getElementById('visit-diagnosis').value = '';
                document.getElementById('visit-treatment').value = '';
                document.getElementById('presc-qty-input').value = '1';
                setVisitStep(1);
                refreshVisitFormView();
            }
        }
    });
}

function startVisitForPatient(patient) {
    activePatient = patient;
    activeVisitPrescriptions = [];

    // Reset visit fields ONLY when starting a new visit
    document.getElementById('vitals-bp').value = '';
    document.getElementById('vitals-hr').value = '';
    document.getElementById('vitals-rr').value = '';
    document.getElementById('vitals-temp').value = '';
    document.getElementById('vitals-weight').value = '';
    document.getElementById('vitals-height').value = '';
    document.getElementById('vitals-bmi').value = '';
    document.getElementById('visit-symptoms').value = '';
    document.getElementById('visit-present-illness').value = '';
    document.getElementById('visit-past-history').value = '';
    document.getElementById('visit-regular-medication').value = '';
    document.getElementById('visit-pe').value = '';
    document.getElementById('visit-diagnosis').value = '';
    document.getElementById('visit-treatment').value = '';
    document.getElementById('presc-qty-input').value = '1';

    const selector = document.getElementById('visit-patient-selector');
    if (selector) selector.value = patient.hn;

    setVisitStep(1);
    navigateTo('visit-form-page');
}

function refreshVisitFormView() {
    populateVisitPatientSelector();

    const hnSpan = document.getElementById('visit-patient-hn');
    const nameSpan = document.getElementById('visit-patient-name');

    const isTh = (currentSettings.lang || 'th') === 'th';

    if (activePatient) {
        hnSpan.textContent = activePatient.hn;
        nameSpan.textContent = activePatient.name;
    } else {
        hnSpan.textContent = isTh ? 'ไม่มี' : 'None';
        nameSpan.textContent = isTh ? 'ไม่มี' : 'None';
    }

    // Populate products select
    const productSelect = document.getElementById('presc-product-select');
    productSelect.innerHTML = '';
    products.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        productSelect.appendChild(opt);
    });

    // Make sure we update the stepper display when opening the page
    setVisitStep(activePatient ? currentVisitStep : 1);

    refreshPrescriptionTable();
}

function refreshPrescriptionTable() {
    const tableBody = document.getElementById('presc-table-body');
    tableBody.innerHTML = '';

    const lang = currentSettings.lang || 'th';
    const isTh = lang === 'th';

    let totalPrice = 0;
    activeVisitPrescriptions.forEach((item, idx) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

        const subtotal = product.price * item.quantity;
        totalPrice += subtotal;

        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.textContent = product.name;
        tr.appendChild(tdName);

        const tdQty = document.createElement('td');
        tdQty.textContent = item.quantity;
        tr.appendChild(tdQty);

        const tdPrice = document.createElement('td');
        tdPrice.textContent = `฿${product.price.toFixed(2)}`;
        tr.appendChild(tdPrice);

        const tdSubtotal = document.createElement('td');
        tdSubtotal.textContent = `฿${subtotal.toFixed(2)}`;
        tr.appendChild(tdSubtotal);

        const tdAction = document.createElement('td');
        const btnRemove = document.createElement('button');
        btnRemove.className = 'btn btn-danger';
        btnRemove.style.padding = '2px 6px';
        btnRemove.style.fontSize = '12px';
        btnRemove.textContent = isTh ? 'ลบ' : 'Remove';
        btnRemove.addEventListener('click', () => {
            showConfirmPopup(isTh ? 'ลบรายการยาออกจากใบสั่งใช่ไหม?' : 'Remove prescription item?', (confirmed) => {
                if (confirmed) {
                    activeVisitPrescriptions.splice(idx, 1);
                    refreshPrescriptionTable();
                }
            });
        });
        tdAction.appendChild(btnRemove);
        tr.appendChild(tdAction);

        tableBody.appendChild(tr);
    });

    document.getElementById('visit-total-price').textContent = totalPrice.toFixed(2);
}

// Add Prescription Item
const addPrescItemBtn = document.getElementById('add-presc-item-btn');
if (addPrescItemBtn) {
    addPrescItemBtn.addEventListener('click', () => {
        const productId = document.getElementById('presc-product-select').value;
        const quantity = parseInt(document.getElementById('presc-qty-input').value, 10);
        if (!productId || isNaN(quantity) || quantity <= 0) return;

        const existing = activeVisitPrescriptions.find(item => item.productId === productId);
        if (existing) {
            existing.quantity += quantity;
        } else {
            activeVisitPrescriptions.push({ productId, quantity });
        }

        refreshPrescriptionTable();
    });
}

// Save Visit
const saveVisitBtn = document.getElementById('visit-save-btn');
if (saveVisitBtn) {
    saveVisitBtn.addEventListener('click', async() => {
        const lang = currentSettings.lang || 'th';
        if (!activePatient) {
            alert(lang === 'th' ? 'กรุณาเลือกคนไข้ก่อนบันทึกการรักษา' : 'Please select a patient before saving visit.');
            return;
        }

        const bp = document.getElementById('vitals-bp').value;
        const hr = parseInt(document.getElementById('vitals-hr').value, 10) || 0;
        const rr = parseInt(document.getElementById('vitals-rr').value, 10) || 0;
        const temp = parseFloat(document.getElementById('vitals-temp').value) || 0;
        const weight = parseFloat(document.getElementById('vitals-weight').value) || 0;
        const height = parseFloat(document.getElementById('vitals-height').value) || 0;
        const bmi = parseFloat(document.getElementById('vitals-bmi').value) || 0;

        const symptoms = document.getElementById('visit-symptoms').value.trim();
        const presentIllness = document.getElementById('visit-present-illness').value.trim();
        const pastHistory = document.getElementById('visit-past-history').value.trim();
        const regularMedication = document.getElementById('visit-regular-medication').value.trim();
        const pe = document.getElementById('visit-pe').value.trim();
        const diagnosis = document.getElementById('visit-diagnosis').value.trim();
        const treatment = document.getElementById('visit-treatment').value.trim();

        if (weight < 0 || height < 0 || temp < 0 || hr < 0 || rr < 0) {
            alert(lang === 'th' ? 'ข้อมูลสัญญาณชีพต้องไม่ติดลบ' : 'Vitals cannot be negative.');
            return;
        }

        if (!symptoms) {
            alert(lang === 'th' ? 'กรุณากรอกอาการสำคัญ (Chief Complaint)' : 'Chief Complaint / Symptoms is required.');
            return;
        }

        if (!diagnosis) {
            alert(lang === 'th' ? 'กรุณากรอกผลการวินิจฉัยโรค (Diagnosis)' : 'Diagnosis is required.');
            return;
        }

        // Check stock sufficiency
        for (const item of activeVisitPrescriptions) {
            const prod = products.find(p => p.id === item.productId);
            if (prod && item.quantity > prod.stock) {
                alert(lang === 'th' ? `จำนวนยาในคลังไม่พอสำหรับ ${prod.name} (เหลือ ${prod.stock} ชิ้น)` : `Insufficient stock for ${prod.name} (${prod.stock} remaining).`);
                return;
            }
        }

        const totalPrice = parseFloat(document.getElementById('visit-total-price').textContent);

        const visitId = `visit-${Date.now()}`;
        const dateStr = new Date().toISOString().split('T')[0];
        const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5); // e.g. "14:30"

        const newVisit = {
            id: visitId,
            hn: activePatient.hn,
            patientHn: activePatient.hn, // ensure both hn and patientHn are present for EMR query compatibility
            date: dateStr,
            time: timeStr,
            vitals: { bp, hr, rr, temp, weight, height, bmi },
            symptoms,
            presentIllness,
            pastHistory,
            regularMedication,
            pe,
            diagnosis,
            treatment,
            prescriptions: activeVisitPrescriptions.map(item => {
                const prod = products.find(p => p.id === item.productId);
                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    price: prod ? prod.price : 0
                };
            }),
            totalPrice,
            status: 'Completed'
        };

        // Record income transaction
        const newTx = {
            id: `tx-${Date.now()}`,
            type: 'income',
            amount: totalPrice,
            date: dateStr,
            description: `ค่ารักษาพยาบาล — ${activePatient.name} ${activePatient.hn}`
        };

        visits.push(newVisit);
        transactions.push(newTx);

        // Write to database first
        if (window.api) {
            const s1 = await window.api.dbWrite('visits', visits);
            const s3 = await window.api.dbWrite('transactions', transactions);
            if (!s1 || !s3) {
                alert(lang === 'th' ? 'บันทึกข้อมูลไม่สำเร็จ' : 'Database write error.');
                return;
            }
        }

        // Deduct Stock only after successful database write
        activeVisitPrescriptions.forEach(item => {
            const prod = products.find(p => p.id === item.productId);
            if (prod) {
                prod.stock = Math.max(0, prod.stock - item.quantity);
            }
        });

        // Write updated products to database
        if (window.api) {
            const s2 = await window.api.dbWrite('products', products);
            if (!s2) {
                alert(lang === 'th' ? 'บันทึกข้อมูลไม่สำเร็จ' : 'Database write error.');
                return;
            }
        }

        // Reset direct patient selector dropdown
        const selector = document.getElementById('visit-patient-selector');
        if (selector) selector.value = '';

        activePatient = null;
        activeVisitPrescriptions = [];
        navigateTo('dashboard-page');
    });
}

// Preview PDF
const visitPreviewPdfBtn = document.getElementById('visit-preview-pdf-btn');
if (visitPreviewPdfBtn) {
    visitPreviewPdfBtn.addEventListener('click', async() => {
        const lang = currentSettings.lang || 'th';
        if (!activePatient) {
            alert(lang === 'th' ? 'กรุณาเลือกคนไข้ก่อนดูตัวอย่าง PDF' : 'Please select a patient before previewing PDF.');
            return;
        }
        if (window.api && typeof window.api.generatePdf === 'function') {
            const bp = document.getElementById('vitals-bp').value;
            const hr = parseInt(document.getElementById('vitals-hr').value, 10) || 0;
            const rr = parseInt(document.getElementById('vitals-rr').value, 10) || 0;
            const temp = parseFloat(document.getElementById('vitals-temp').value) || 0;
            const weight = parseFloat(document.getElementById('vitals-weight').value) || 0;
            const height = parseFloat(document.getElementById('vitals-height').value) || 0;
            const bmi = parseFloat(document.getElementById('vitals-bmi').value) || 0;

            const symptoms = document.getElementById('visit-symptoms').value.trim();
            const presentIllness = document.getElementById('visit-present-illness').value.trim();
            const pastHistory = document.getElementById('visit-past-history').value.trim();
            const regularMedication = document.getElementById('visit-regular-medication').value.trim();
            const pe = document.getElementById('visit-pe').value.trim();
            const diagnosis = document.getElementById('visit-diagnosis').value.trim();
            const treatment = document.getElementById('visit-treatment').value.trim();

            const res = await window.api.generatePdf({
                patient: activePatient,
                vitals: { bp, hr, rr, temp, weight, height, bmi },
                symptoms,
                presentIllness,
                pastHistory,
                regularMedication,
                pe,
                diagnosis,
                treatment,
                prescriptions: activeVisitPrescriptions
            });

            if (res && res.success) {
                if (window.api.openPdfPreview) {
                    window.api.openPdfPreview(res.filePath);
                } else {
                    alert(lang === 'th' ? `สร้างไฟล์สำเร็จแล้วที่: ${res.filePath}` : `PDF created at: ${res.filePath}`);
                }
            } else {
                alert(lang === 'th' ? `เกิดข้อผิดพลาด: ${res.error || 'ไม่รู้จัก'}` : `Error: ${res.error || 'unknown'}`);
            }
        }
    });
}

// Print PDF
const visitPrintPdfBtn = document.getElementById('visit-print-pdf-btn');
if (visitPrintPdfBtn) {
    visitPrintPdfBtn.addEventListener('click', async() => {
        const lang = currentSettings.lang || 'th';
        if (!activePatient) {
            alert(lang === 'th' ? 'กรุณาเลือกคนไข้ก่อนพิมพ์ PDF' : 'Please select a patient before printing PDF.');
            return;
        }
        if (window.api && typeof window.api.generatePdf === 'function') {
            const bp = document.getElementById('vitals-bp').value;
            const hr = parseInt(document.getElementById('vitals-hr').value, 10) || 0;
            const rr = parseInt(document.getElementById('vitals-rr').value, 10) || 0;
            const temp = parseFloat(document.getElementById('vitals-temp').value) || 0;
            const weight = parseFloat(document.getElementById('vitals-weight').value) || 0;
            const height = parseFloat(document.getElementById('vitals-height').value) || 0;
            const bmi = parseFloat(document.getElementById('vitals-bmi').value) || 0;

            const symptoms = document.getElementById('visit-symptoms').value.trim();
            const presentIllness = document.getElementById('visit-present-illness').value.trim();
            const pastHistory = document.getElementById('visit-past-history').value.trim();
            const regularMedication = document.getElementById('visit-regular-medication').value.trim();
            const pe = document.getElementById('visit-pe').value.trim();
            const diagnosis = document.getElementById('visit-diagnosis').value.trim();
            const treatment = document.getElementById('visit-treatment').value.trim();

            const res = await window.api.generatePdf({
                patient: activePatient,
                vitals: { bp, hr, rr, temp, weight, height, bmi },
                symptoms,
                presentIllness,
                pastHistory,
                regularMedication,
                pe,
                diagnosis,
                treatment,
                prescriptions: activeVisitPrescriptions
            });

            if (res && res.success) {
                alert(lang === 'th' ? `สร้างไฟล์ PDF สำเร็จแล้ว!\nบันทึกไฟล์เรียบร้อย` : `PDF created successfully!`);
            } else {
                alert(lang === 'th' ? `เกิดข้อผิดพลาดในการสร้าง PDF: ${res.error || 'ไม่รู้จัก'}` : `Error generating PDF: ${res.error || 'unknown'}`);
            }
        }
    });
}

// Cancel Visit
const visitCancelBtn = document.getElementById('visit-cancel-btn');
if (visitCancelBtn) {
    visitCancelBtn.addEventListener('click', () => {
        // Reset direct patient selector dropdown
        const selector = document.getElementById('visit-patient-selector');
        if (selector) selector.value = '';

        activePatient = null;
        activeVisitPrescriptions = [];
        navigateTo('patients-page');
    });
}

// Auto BMI calculation
function calculateBmi() {
    const weight = parseFloat(document.getElementById('vitals-weight').value);
    const heightCm = parseFloat(document.getElementById('vitals-height').value);
    const bmiInput = document.getElementById('vitals-bmi');

    if (weight > 0 && heightCm > 0) {
        const heightM = heightCm / 100;
        const bmi = weight / (heightM * heightM);
        bmiInput.value = bmi.toFixed(2);
    } else {
        bmiInput.value = '';
    }
}

const weightInput = document.getElementById('vitals-weight');
const heightInput = document.getElementById('vitals-height');
if (weightInput && heightInput) {
    weightInput.addEventListener('input', calculateBmi);
    heightInput.addEventListener('input', calculateBmi);
}


// --- Inventory Logic ---
let editingProductId = null;

function refreshInventoryView(searchQuery = '') {
    const tableBody = document.getElementById('inventory-table-body');
    tableBody.innerHTML = '';

    let filtered = products;
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q)
        );
    }

    filtered.forEach(p => {
        const isLowStock = p.stock <= p.minStockAlert;

        const tr = document.createElement('tr');
        if (isLowStock) {
            tr.className = 'inventory-alert-row';
        }

        const tdId = document.createElement('td');
        tdId.textContent = p.id;
        tr.appendChild(tdId);

        const tdName = document.createElement('td');
        tdName.style.display = 'flex';
        tdName.style.alignItems = 'center';
        tdName.style.gap = '10px';

        const imgEl = document.createElement('img');
        imgEl.src = p.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/><path d="M9 22V12h6v10"/><path d="M2 10.6L12 2l10 8.6"/></svg>';
        imgEl.style.width = '32px';
        imgEl.style.height = '32px';
        imgEl.style.borderRadius = '6px';
        imgEl.style.border = '1px solid var(--border-color)';
        imgEl.style.objectFit = 'cover';
        imgEl.style.background = 'var(--bg-color)';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = p.name;

        tdName.appendChild(imgEl);
        tdName.appendChild(nameSpan);
        tr.appendChild(tdName);

        const tdPrice = document.createElement('td');
        tdPrice.textContent = `฿${p.price.toFixed(2)}`;
        tr.appendChild(tdPrice);

        const lang = currentSettings.lang || 'th';
        const isTh = lang === 'th';

        const tdStock = document.createElement('td');
        if (isLowStock) {
            tdStock.innerHTML = `${p.stock} <span class="stock-alert-badge" style="background:var(--error-color); color:white; padding: 2px 6px; font-size:10px; border-radius:4px; margin-left:5px; font-weight:bold;">${isTh ? 'สต็อกต่ำ' : 'Low Stock'}</span>`;
        } else {
            tdStock.textContent = p.stock;
        }
        tr.appendChild(tdStock);

        const tdUnit = document.createElement('td');
        tdUnit.textContent = p.unit;
        tr.appendChild(tdUnit);

        const tdMin = document.createElement('td');
        tdMin.textContent = p.minStockAlert;
        tr.appendChild(tdMin);

        const tdActions = document.createElement('td');

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-edit-product';
        btnEdit.style.padding = '4px 8px';
        btnEdit.style.fontSize = '12px';
        btnEdit.style.marginRight = '5px';
        btnEdit.textContent = isTh ? 'แก้ไข' : 'Edit';
        btnEdit.addEventListener('click', () => {
            openProductModal(p);
        });
        tdActions.appendChild(btnEdit);

        const btnRestock = document.createElement('button');
        btnRestock.className = 'btn btn-restock-product';
        btnRestock.style.padding = '4px 8px';
        btnRestock.style.fontSize = '12px';
        btnRestock.textContent = isTh ? 'เติมสต็อก' : 'Restock';
        btnRestock.addEventListener('click', () => {
            openRestockModal(p);
        });
        tdActions.appendChild(btnRestock);

        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn btn-danger';
        btnDelete.style.padding = '4px 8px';
        btnDelete.style.fontSize = '12px';
        btnDelete.style.marginLeft = '5px';
        btnDelete.textContent = isTh ? 'ลบ' : 'Delete';
        btnDelete.addEventListener('click', () => {
            const confirmMsg = isTh ? `ต้องการลบสินค้า ${p.name} ใช่ไหม?` : `Delete product ${p.name}?`;
            showConfirmPopup(confirmMsg, (confirmed) => {
                if (confirmed) {
                    const idx = products.findIndex(prod => prod.id === p.id);
                    if (idx !== -1) {
                        products.splice(idx, 1);
                        if (window.api) window.api.dbWrite('products', products);
                        refreshInventoryView();
                    }
                }
            });
        });
        tdActions.appendChild(btnDelete);

        tr.appendChild(tdActions);
        tableBody.appendChild(tr);
    });
}

// Inventory Search input
const inventorySearchInputEl = document.getElementById('inventory-search-input');
if (inventorySearchInputEl) {
    inventorySearchInputEl.addEventListener('input', () => {
        refreshInventoryView(inventorySearchInputEl.value.trim());
    });
}

// Add Product Button click
const addProductBtnEl = document.getElementById('add-product-btn');
if (addProductBtnEl) {
    addProductBtnEl.addEventListener('click', () => {
        openProductModal();
    });
}

let base64ImageString = "";

function openProductModal(product = null) {
    const modal = document.getElementById('product-form-modal');
    const title = document.getElementById('product-modal-title');
    document.getElementById('product-form').reset();
    base64ImageString = "";

    const lang = currentSettings.lang || 'th';
    const imgPreview = document.getElementById('product-image-preview');

    if (product) {
        title.textContent = lang === 'th' ? 'แก้ไขข้อมูลสินค้า' : 'Edit Product';
        editingProductId = product.id;
        document.getElementById('product-id-input').value = product.id;
        document.getElementById('product-name-input').value = product.name;
        document.getElementById('product-price-input').value = product.price;
        document.getElementById('product-stock-input').value = product.stock;
        document.getElementById('product-unit-input').value = product.unit;
        document.getElementById('product-min-stock-alert-input').value = product.minStockAlert;

        if (product.image) {
            imgPreview.src = product.image;
            imgPreview.classList.remove('hidden');
        } else {
            imgPreview.src = '';
            imgPreview.classList.add('hidden');
        }
    } else {
        title.textContent = lang === 'th' ? 'เพิ่มสินค้าใหม่' : 'Add Product';
        editingProductId = null;
        document.getElementById('product-id-input').value = 'Auto-generated';
        imgPreview.src = '';
        imgPreview.classList.add('hidden');
    }

    modal.classList.remove('hidden');
}

const productCancelBtn = document.getElementById('product-cancel-btn');
if (productCancelBtn) {
    productCancelBtn.addEventListener('click', () => {
        document.getElementById('product-form-modal').classList.add('hidden');
    });
}

// Product Image Input change listener
const productImageInput = document.getElementById('product-image-input');
if (productImageInput) {
    productImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                const preview = document.getElementById('product-image-preview');
                if (preview) {
                    preview.src = evt.target.result;
                    preview.classList.remove('hidden');
                }
                base64ImageString = evt.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// Product Form Save
const productFormEl = document.getElementById('product-form');
if (productFormEl) {
    productFormEl.addEventListener('submit', async(e) => {
        e.preventDefault();
        const name = document.getElementById('product-name-input').value.trim();
        const price = parseFloat(document.getElementById('product-price-input').value);
        const stock = parseInt(document.getElementById('product-stock-input').value, 10);
        const unit = document.getElementById('product-unit-input').value.trim();
        const minStockAlert = parseInt(document.getElementById('product-min-stock-alert-input').value, 10);

        const lang = currentSettings.lang || 'th';

        if (!name) {
            alert(lang === 'th' ? 'กรุณากรอกชื่อสินค้า' : 'Product name is required');
            return;
        }
        if (isNaN(price) || price < 0) {
            alert(lang === 'th' ? 'กรุณากรอกราคาขายสินค้าให้ถูกต้อง (ต้องมากกว่าหรือเท่ากับ 0)' : 'Product price cannot be negative');
            return;
        }
        if (isNaN(stock) || stock < 0) {
            alert(lang === 'th' ? 'กรุณากรอกจำนวนสต็อกให้ถูกต้อง' : 'Product stock cannot be negative');
            return;
        }
        if (isNaN(minStockAlert) || minStockAlert < 0) {
            alert(lang === 'th' ? 'กรุณากรอกเกณฑ์แจ้งเตือนขั้นต่ำให้ถูกต้อง' : 'Min stock alert level cannot be negative');
            return;
        }

        // Check duplicates
        const nameLower = name.toLowerCase();
        const isDuplicate = products.some(p => p.name.toLowerCase() === nameLower && p.id !== editingProductId);
        if (isDuplicate) {
            alert(lang === 'th' ? 'ชื่อสินค้านี้มีอยู่แล้วในระบบ' : 'Product already exists');
            return;
        }

        if (editingProductId) {
            const idx = products.findIndex(p => p.id === editingProductId);
            if (idx !== -1) {
                const finalImage = base64ImageString || products[idx].image || "";
                products[idx] = {...products[idx], name, price, stock, unit, minStockAlert, image: finalImage };
            }
        } else {
            const newId = `prod-${Date.now()}`;
            products.push({ id: newId, name, price, stock, unit, minStockAlert, image: base64ImageString });
        }

        if (window.api) {
            await window.api.dbWrite('products', products);
        }

        document.getElementById('product-form-modal').classList.add('hidden');
        refreshInventoryView();
    });
}

// Restock Dialog logic
function openRestockModal(product) {
    document.getElementById('restock-product-id').value = product.id;
    document.getElementById('restock-qty-input').value = '';
    document.getElementById('restock-form-modal').classList.remove('hidden');
}

const restockCancelBtnEl = document.getElementById('restock-cancel-btn');
if (restockCancelBtnEl) {
    restockCancelBtnEl.addEventListener('click', () => {
        document.getElementById('restock-form-modal').classList.add('hidden');
    });
}

const restockFormEl = document.getElementById('restock-form');
if (restockFormEl) {
    restockFormEl.addEventListener('submit', async(e) => {
        e.preventDefault();
        const prodId = document.getElementById('restock-product-id').value;
        const additionalQty = parseInt(document.getElementById('restock-qty-input').value, 10);

        const lang = currentSettings.lang || 'th';

        if (!prodId) {
            alert(lang === 'th' ? 'เกิดข้อผิดพลาด: ไม่พบสินค้า' : 'Error: product not found');
            return;
        }

        if (isNaN(additionalQty) || additionalQty <= 0) {
            alert(lang === 'th' ? 'กรุณาระบุจำนวนที่จะเติมสต็อกให้ถูกต้อง (มากกว่า 0)' : 'Please specify a valid quantity to restock (greater than 0)');
            return;
        }

        const idx = products.findIndex(p => p.id === prodId);
        if (idx !== -1) {
            products[idx].stock += additionalQty;
            if (window.api) {
                await window.api.dbWrite('products', products);
            }
        }

        document.getElementById('restock-form-modal').classList.add('hidden');
        refreshInventoryView();
    });
}


// --- POS Logic ---
let posCart = [];

function refreshPosView() {
    // Dropdown list
    const productSelect = document.getElementById('pos-product-select');
    if (productSelect) {
        productSelect.innerHTML = '';
        products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            productSelect.appendChild(opt);
        });
    }

    // Catalog quick add list
    const catalogList = document.getElementById('pos-catalog-list');
    if (!catalogList) return;
    catalogList.innerHTML = '';

    const lang = currentSettings.lang || 'th';
    const isTh = lang === 'th';

    const searchInput = document.getElementById('pos-catalog-search');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query));

    filteredProducts.forEach(p => {
        const card = document.createElement('div');
        card.className = 'pos-item-card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.justifyContent = 'space-between';

        const isLowStock = p.stock <= p.minStockAlert;
        const isOutOfStock = p.stock === 0;

        let stockStatusClass = 'stock-in';
        let stockStatusText = isTh ? 'มีสินค้า' : 'In Stock';
        if (isOutOfStock) {
            stockStatusClass = 'stock-out';
            stockStatusText = isTh ? 'หมด' : 'Out of Stock';
        } else if (isLowStock) {
            stockStatusClass = 'stock-low';
            stockStatusText = isTh ? `เหลือ ${p.stock}` : `${p.stock} left`;
        }

        card.innerHTML = `
        <div>
          <div style="width: 100%; height: 90px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color); background: var(--bg-color); display: flex; align-items: center; justify-content: center; margin-bottom: 8px; position: relative;">
            <img src="${p.image || 'data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;24&quot; height=&quot;24&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;%2394a3b8&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><path d=&quot;M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9&quot;/><path d=&quot;M9 22V12h6v10&quot;/><path d=&quot;M2 10.6L12 2l10 8.6&quot;/></svg>'}" style="width: 100%; height: 100%; object-fit: cover;">
            <span class="pos-stock-badge ${stockStatusClass}">${stockStatusText}</span>
          </div>
          <h5 style="font-size: 13px; margin: 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.name}">${p.name}</h5>
          <p style="color: var(--primary-color); font-weight: bold; margin-top: 2px; font-size: 13px;">฿${p.price.toFixed(2)}</p>
        </div>
        <button class="btn" style="padding: 6px 8px; font-size: 12px; margin-top: 8px; width: 100%;" ${isOutOfStock ? 'disabled' : ''}>${isTh ? 'เพิ่มลงตะกร้า' : 'Add to Cart'}</button>
      `;
        card.querySelector('button').addEventListener('click', () => {
            addPosItemToCart(p.id, 1);
        });
        catalogList.appendChild(card);
    });

    // Update receipt date and time
    const receiptTime = document.getElementById('receipt-date-time');
    if (receiptTime) {
        const now = new Date();
        const dateStr = now.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'short' });
        const timeStr = now.toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-US', { timeStyle: 'short' });
        receiptTime.textContent = `${dateStr} ${timeStr}`;
    }

    refreshPosCartTable();
}

// Bind live catalog search
setTimeout(() => {
    const catalogSearch = document.getElementById('pos-catalog-search');
    if (catalogSearch) {
        catalogSearch.addEventListener('input', () => {
            refreshPosView();
        });
    }
}, 100);

function addPosItemToCart(productId, qty) {
    const lang = currentSettings.lang || 'th';
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Check stock sufficiency
    const existing = posCart.find(item => item.productId === productId);
    const existingQty = existing ? existing.quantity : 0;
    if (existingQty + qty > product.stock) {
        alert(lang === 'th' ? `จำนวนสินค้าในคลังไม่พอ (คงเหลือ ${product.stock} ${product.unit || 'ชิ้น'})` : `Insufficient stock (Only ${product.stock} ${product.unit || 'units'} left)`);
        return;
    }

    if (existing) {
        existing.quantity += qty;
    } else {
        posCart.push({ productId, quantity: qty });
    }
    refreshPosCartTable();
}

const posAddToCartBtnEl = document.getElementById('pos-add-to-cart-btn');
if (posAddToCartBtnEl) {
    posAddToCartBtnEl.addEventListener('click', () => {
        const lang = currentSettings.lang || 'th';
        const productId = document.getElementById('pos-product-select').value;
        const quantity = parseInt(document.getElementById('pos-qty-input').value, 10);
        if (!productId) {
            alert(lang === 'th' ? 'กรุณาเลือกสินค้า' : 'Please select a product');
            return;
        }
        if (isNaN(quantity) || quantity <= 0) {
            alert(lang === 'th' ? 'กรุณาระบุจำนวนสินค้าให้ถูกต้อง' : 'Please specify a valid quantity');
            return;
        }
        addPosItemToCart(productId, quantity);
    });
}

function calculateChange() {
    const total = parseFloat(document.getElementById('pos-total-price').textContent) || 0;
    const cashPaid = parseFloat(document.getElementById('pos-cash-input').value);
    if (isNaN(cashPaid)) {
        document.getElementById('pos-change-span').textContent = '0.00';
    } else {
        const change = Math.max(0, cashPaid - total);
        document.getElementById('pos-change-span').textContent = change.toFixed(2);
    }
}

function refreshPosCartTable() {
    const tableBody = document.getElementById('pos-cart-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const lang = currentSettings.lang || 'th';
    const isTh = lang === 'th';

    let subtotal = 0;
    posCart.forEach((item, idx) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.textContent = product.name;
        tdName.style.padding = '8px 4px';
        tr.appendChild(tdName);

        const tdQty = document.createElement('td');
        tdQty.style.padding = '8px 4px';
        tdQty.style.textAlign = 'center';

        // Inline Qty edit buttons
        const qtyWrapper = document.createElement('div');
        qtyWrapper.style.display = 'inline-flex';
        qtyWrapper.style.alignItems = 'center';
        qtyWrapper.style.justifyContent = 'center';
        qtyWrapper.style.gap = '6px';

        const btnMinus = document.createElement('button');
        btnMinus.textContent = '-';
        btnMinus.style.padding = '1px 5px';
        btnMinus.style.fontSize = '11px';
        btnMinus.style.cursor = 'pointer';
        btnMinus.style.borderRadius = '3px';
        btnMinus.style.border = '1px solid var(--border-color)';
        btnMinus.style.background = 'var(--card-bg)';
        btnMinus.style.color = 'var(--text-color)';
        btnMinus.style.fontWeight = 'bold';
        btnMinus.addEventListener('click', () => {
            if (item.quantity > 1) {
                item.quantity--;
            } else {
                posCart.splice(idx, 1);
            }
            refreshPosCartTable();
        });

        const qtySpan = document.createElement('span');
        qtySpan.textContent = item.quantity;
        qtySpan.style.fontWeight = '600';
        qtySpan.style.minWidth = '16px';
        qtySpan.style.display = 'inline-block';
        qtySpan.style.textAlign = 'center';

        const btnPlus = document.createElement('button');
        btnPlus.textContent = '+';
        btnPlus.style.padding = '1px 5px';
        btnPlus.style.fontSize = '11px';
        btnPlus.style.cursor = 'pointer';
        btnPlus.style.borderRadius = '3px';
        btnPlus.style.border = '1px solid var(--border-color)';
        btnPlus.style.background = 'var(--card-bg)';
        btnPlus.style.color = 'var(--text-color)';
        btnPlus.style.fontWeight = 'bold';
        btnPlus.addEventListener('click', () => {
            if (item.quantity + 1 > product.stock) {
                alert(lang === 'th' ? `จำนวนสินค้าในคลังไม่พอ (คงเหลือ ${product.stock} ชิ้น)` : `Insufficient stock (Only ${product.stock} left)`);
                return;
            }
            item.quantity++;
            refreshPosCartTable();
        });

        qtyWrapper.appendChild(btnMinus);
        qtyWrapper.appendChild(qtySpan);
        qtyWrapper.appendChild(btnPlus);
        tdQty.appendChild(qtyWrapper);
        tr.appendChild(tdQty);

        const tdPrice = document.createElement('td');
        tdPrice.textContent = `฿${product.price.toFixed(2)}`;
        tdPrice.style.padding = '8px 4px';
        tdPrice.style.textAlign = 'right';
        tr.appendChild(tdPrice);

        const tdTotal = document.createElement('td');
        tdTotal.textContent = `฿${itemTotal.toFixed(2)}`;
        tdTotal.style.padding = '8px 4px';
        tdTotal.style.textAlign = 'right';
        tr.appendChild(tdTotal);

        const tdAction = document.createElement('td');
        tdAction.style.padding = '8px 4px';
        tdAction.style.textAlign = 'center';
        const btnRemove = document.createElement('button');
        btnRemove.className = 'btn btn-danger btn-remove-item';
        btnRemove.style.padding = '2px 6px';
        btnRemove.style.fontSize = '11px';
        btnRemove.textContent = isTh ? 'ลบ' : 'Remove';
        btnRemove.addEventListener('click', () => {
            showConfirmPopup(isTh ? 'ลบสินค้าออกจากตะกร้าใช่ไหม?' : 'Remove item from cart?', (confirmed) => {
                if (confirmed) {
                    posCart.splice(idx, 1);
                    refreshPosCartTable();
                }
            });
        });
        tdAction.appendChild(btnRemove);
        tr.appendChild(tdAction);

        tableBody.appendChild(tr);
    });

    let discountInputVal = parseFloat(document.getElementById('pos-discount-input').value) || 0;
    if (discountInputVal < 0) {
        discountInputVal = 0;
    }
    const finalTotal = Math.max(0, subtotal - discountInputVal);
    document.getElementById('pos-total-price').textContent = finalTotal.toFixed(2);

    calculateChange();
}

const posDiscountInputEl = document.getElementById('pos-discount-input');
const posCashInputEl = document.getElementById('pos-cash-input');

if (posDiscountInputEl) {
    posDiscountInputEl.addEventListener('input', () => {
        refreshPosCartTable();
    });
}
if (posCashInputEl) {
    posCashInputEl.addEventListener('input', () => {
        calculateChange();
    });
}

const posClearCartBtnEl = document.getElementById('pos-clear-cart-btn');
if (posClearCartBtnEl) {
    posClearCartBtnEl.addEventListener('click', () => {
        posCart = [];
        document.getElementById('pos-discount-input').value = '';
        document.getElementById('pos-cash-input').value = '';
        refreshPosCartTable();
    });
}

const posCheckoutBtnEl = document.getElementById('pos-checkout-btn');
if (posCheckoutBtnEl) {
    posCheckoutBtnEl.addEventListener('click', async() => {
        const lang = currentSettings.lang || 'th';

        if (posCart.length === 0) {
            alert(lang === 'th' ? 'ตะกร้าสินค้าว่างเปล่า' : 'Cart is empty');
            return;
        }

        const total = parseFloat(document.getElementById('pos-total-price').textContent);
        const cashPaid = parseFloat(document.getElementById('pos-cash-input').value);

        if (isNaN(cashPaid) || cashPaid < 0) {
            alert(lang === 'th' ? 'กรุณากรอกยอดเงินรับมาให้ถูกต้อง' : 'Please specify a valid cash paid amount');
            return;
        }

        if (cashPaid < total) {
            alert(lang === 'th' ? 'ยอดเงินรับมาน้อยกว่ายอดชำระเงิน' : 'Cash paid is less than total invoice amount');
            return;
        }

        // Check stock levels final check
        for (const item of posCart) {
            const prod = products.find(p => p.id === item.productId);
            if (prod && item.quantity > prod.stock) {
                alert(lang === 'th' ? `จำนวนสินค้าในคลังไม่พอสำหรับ ${prod.name} (คงเหลือ ${prod.stock})` : `Insufficient stock for ${prod.name} (Only ${prod.stock} left)`);
                return;
            }
        }

        const changeAmount = cashPaid - total;

        // Record Counter Sale Transaction (no patient HN or visit ID)
        const dateStr = new Date().toISOString().split('T')[0];
        const newTx = {
            id: `tx-${Date.now()}`,
            type: 'income',
            amount: total,
            date: dateStr,
            description: `Counter Sale`
        };

        transactions.push(newTx);

        // Write transactions to database first
        if (window.api) {
            const s1 = await window.api.dbWrite('transactions', transactions);
            if (!s1) {
                alert(lang === 'th' ? 'บันทึกข้อมูลไม่สำเร็จ' : 'Database write error.');
                return;
            }
        }

        // Deduct Stock only after successful database write
        posCart.forEach(item => {
            const prod = products.find(p => p.id === item.productId);
            if (prod) {
                prod.stock = Math.max(0, prod.stock - item.quantity);
            }
        });

        // Write updated products to database
        if (window.api) {
            const s2 = await window.api.dbWrite('products', products);
            if (!s2) {
                alert(lang === 'th' ? 'บันทึกข้อมูลไม่สำเร็จ' : 'Database write error.');
                return;
            }
        }

        alert(lang === 'th' ? 'ชำระเงินสำเร็จ!' : 'Checkout completed successfully!');

        posCart = [];
        document.getElementById('pos-discount-input').value = '';
        document.getElementById('pos-cash-input').value = '';
        refreshPosCartTable();

        document.getElementById('pos-change-span').textContent = changeAmount.toFixed(2);
    });
}


// --- Settings Logic ---
function refreshSettingsView() {
    document.getElementById('settings-username-input').value = currentSettings.username || '';
    document.getElementById('settings-password-input').value = currentSettings.password || '';
    document.getElementById('settings-clinic-name-input').value = currentSettings.clinicName || '';
    document.getElementById('settings-clinic-header-input').value = currentSettings.clinicHeader || '';
    document.getElementById('settings-clinic-id-input').value = currentSettings.clinicId || '';
    document.getElementById('settings-clinic-province-input').value = currentSettings.clinicProvince || '';
    document.getElementById('settings-clinic-zone-input').value = currentSettings.clinicZone || '';
    document.getElementById('settings-clinic-tel').value = currentSettings.clinicTel || '';
    document.getElementById('settings-practitioner').value = currentSettings.defaultPractitioner || '';
    document.getElementById('settings-practitioner-title').value = currentSettings.defaultPractitionerTitle || '';
    document.getElementById('settings-output-dir').value = currentSettings.outputPdfDir || '';
    document.getElementById('settings-theme-select').value = currentSettings.theme || 'clinic-green';

    // Set active theme preview
    setTimeout(() => {
        document.querySelectorAll('.theme-preview-item').forEach(item => {
            if (item.getAttribute('data-theme') === (currentSettings.theme || 'clinic-green')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }, 100);
}

// Credentials Update
const settingsSaveAuthBtn = document.getElementById('settings-save-auth-btn');
if (settingsSaveAuthBtn) {
    settingsSaveAuthBtn.addEventListener('click', async() => {
        const username = document.getElementById('settings-username-input').value.trim();
        const password = document.getElementById('settings-password-input').value;
        const lang = currentSettings.lang || 'th';

        if (!username || !password) {
            alert(lang === 'th' ? 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' : 'Please enter username and password.');
            return;
        }

        currentSettings.username = username;
        currentSettings.password = password;
        await persistSettings();

        const msg = document.getElementById('settings-auth-success-msg');
        if (msg) {
            msg.classList.remove('hidden');
            setTimeout(() => msg.classList.add('hidden'), 3000);
        }
    });
}

// Theme Update
const settingsSaveThemeBtn = document.getElementById('settings-save-theme-btn');
if (settingsSaveThemeBtn) {
    settingsSaveThemeBtn.addEventListener('click', async() => {
        const themeVal = document.getElementById('settings-theme-select').value;
        currentSettings.theme = themeVal;
        applyTheme(themeVal);
        await persistSettings();
        const lang = currentSettings.lang || 'th';
        const msg = document.getElementById('settings-clinic-success-msg');
        if (msg) {
            msg.classList.remove('hidden');
            setTimeout(() => msg.classList.add('hidden'), 3000);
        }
    });

    document.getElementById('settings-theme-select').addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });

    // Theme preview thumbnail click handlers
    setTimeout(() => {
        document.querySelectorAll('.theme-preview-item').forEach(item => {
            item.addEventListener('click', () => {
                const theme = item.getAttribute('data-theme');
                if (theme) {
                    document.getElementById('settings-theme-select').value = theme;
                    applyTheme(theme);
                    document.querySelectorAll('.theme-preview-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                }
            });
        });
    }, 100);
}

// Clinic Info Update
const settingsSaveClinicBtn = document.getElementById('settings-save-clinic-btn');
if (settingsSaveClinicBtn) {
    settingsSaveClinicBtn.addEventListener('click', async() => {
        const clinicName = document.getElementById('settings-clinic-name-input').value.trim();
        const clinicHeader = document.getElementById('settings-clinic-header-input').value.trim();
        const clinicId = document.getElementById('settings-clinic-id-input').value.trim();
        const clinicProvince = document.getElementById('settings-clinic-province-input').value.trim();
        const clinicZone = document.getElementById('settings-clinic-zone-input').value.trim();
        const clinicTel = document.getElementById('settings-clinic-tel').value.trim();
        const defaultPractitioner = document.getElementById('settings-practitioner').value.trim();
        const defaultPractitionerTitle = document.getElementById('settings-practitioner-title').value.trim();
        const outputPdfDir = document.getElementById('settings-output-dir').value.trim();

        const lang = currentSettings.lang || 'th';

        if (!clinicName) {
            alert(lang === 'th' ? 'กรุณากรอกชื่อคลินิก' : 'Clinic name is required.');
            return;
        }

        if (clinicTel && !/^[0-9\-\+\s\(\)]+$/.test(clinicTel)) {
            alert(lang === 'th' ? 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง' : 'Invalid telephone format.');
            return;
        }

        currentSettings.clinicName = clinicName;
        currentSettings.clinicHeader = clinicHeader;
        currentSettings.clinicAddress = clinicHeader;
        currentSettings.clinicId = clinicId;
        currentSettings.clinicProvince = clinicProvince;
        currentSettings.clinicZone = clinicZone;
        currentSettings.clinicTel = clinicTel;
        currentSettings.defaultPractitioner = defaultPractitioner;
        currentSettings.defaultPractitionerTitle = defaultPractitionerTitle;
        currentSettings.outputPdfDir = outputPdfDir;

        await persistSettings();
        updateClinicUIHeaders();

        const msg = document.getElementById('settings-clinic-success-msg');
        if (msg) {
            msg.classList.remove('hidden');
            setTimeout(() => msg.classList.add('hidden'), 3000);
        }
    });
}

const browseOutputDirBtn = document.getElementById('settings-browse-output-dir-btn');
if (browseOutputDirBtn) {
    browseOutputDirBtn.addEventListener('click', async() => {
        if (window.api && window.api.selectDirectory) {
            const dir = await window.api.selectDirectory();
            if (dir) {
                document.getElementById('settings-output-dir').value = dir;
            }
        }
    });
}

// --- EMR Visit History Viewer Modals Logic ---
function openVisitHistoryModal(patient) {
    const modal = document.getElementById('visit-history-modal');
    document.getElementById('history-patient-hn').textContent = patient.hn;
    document.getElementById('history-patient-name').textContent = patient.name;

    const tableBody = document.getElementById('history-table-body');
    tableBody.innerHTML = '';

    const patientVisits = visits.filter(v => v.patientHn === patient.hn);
    const lang = currentSettings.lang || 'th';
    const isTh = lang === 'th';

    if (patientVisits.length === 0) {
        tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-secondary);">
            ${isTh ? 'ไม่พบประวัติการเข้าตรวจรักษาของคนไข้รายนี้' : 'No visit history found for this patient.'}
          </td>
        </tr>
      `;
    } else {
        const sortedVisits = [...patientVisits].sort((a, b) => {
            const dateTimeA = `${a.date}T${a.time || '00:00'}`;
            const dateTimeB = `${b.date}T${b.time || '00:00'}`;
            return dateTimeB.localeCompare(dateTimeA);
        });

        sortedVisits.forEach(visit => {
            const tr = document.createElement('tr');

            const tdDate = document.createElement('td');
            tdDate.textContent = `${visit.date} ${visit.time || ''}`;
            tr.appendChild(tdDate);

            const tdSymptoms = document.createElement('td');
            tdSymptoms.textContent = visit.symptoms || '-';
            tdSymptoms.style.maxWidth = '250px';
            tdSymptoms.style.overflow = 'hidden';
            tdSymptoms.style.textOverflow = 'ellipsis';
            tdSymptoms.style.whiteSpace = 'nowrap';
            tr.appendChild(tdSymptoms);

            const tdDiag = document.createElement('td');
            tdDiag.textContent = visit.diagnosis || '-';
            tdDiag.style.maxWidth = '200px';
            tdDiag.style.overflow = 'hidden';
            tdDiag.style.textOverflow = 'ellipsis';
            tdDiag.style.whiteSpace = 'nowrap';
            tr.appendChild(tdDiag);

            const tdActions = document.createElement('td');
            tdActions.style.display = 'flex';
            tdActions.style.gap = '8px';

            const btnDetails = document.createElement('button');
            btnDetails.className = 'btn';
            btnDetails.style.padding = '4px 8px';
            btnDetails.style.fontSize = '12px';
            btnDetails.textContent = isTh ? 'ดูรายละเอียด' : 'Details';
            btnDetails.addEventListener('click', () => {
                openVisitDetailsModal(visit, patient);
            });
            tdActions.appendChild(btnDetails);

            const btnReprint = document.createElement('button');
            btnReprint.className = 'btn btn-secondary';
            btnReprint.style.padding = '4px 8px';
            btnReprint.style.fontSize = '12px';
            btnReprint.textContent = isTh ? 'พิมพ์อีกครั้ง' : 'Reprint';
            btnReprint.addEventListener('click', async() => {
                if (window.api) {
                    const res = await window.api.generatePdf({
                        patient,
                        vitals: visit.vitals,
                        symptoms: visit.symptoms,
                        diagnosis: visit.diagnosis,
                        treatment: visit.treatment || '',
                        prescriptions: visit.prescriptions || [],
                        visitDate: visit.date,
                        visitTime: visit.time
                    });
                    if (res.success) {
                        alert(isTh ? `สั่งพิมพ์/ส่งออกไฟล์ PDF เรียบร้อยแล้วที่:\n${res.filePath}` : `PDF successfully printed to:\n${res.filePath}`);
                    } else {
                        alert(isTh ? 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF' : 'Error generating PDF file.');
                    }
                }
            });
            tdActions.appendChild(btnReprint);

            tr.appendChild(tdActions);
            tableBody.appendChild(tr);
        });
    }

    modal.classList.remove('hidden');
}

function openVisitDetailsModal(visit, patient) {
    const modal = document.getElementById('visit-details-modal');

    document.getElementById('detail-patient-hn').textContent = patient.hn;
    document.getElementById('detail-patient-name').textContent = patient.name;
    document.getElementById('detail-visit-date').textContent = visit.date;
    document.getElementById('detail-visit-time').textContent = visit.time || '-';

    const vitals = visit.vitals || {};
    document.getElementById('detail-vitals-bp').textContent = vitals.bp || '-';
    document.getElementById('detail-vitals-hr').textContent = vitals.hr || '-';
    document.getElementById('detail-vitals-rr').textContent = vitals.rr || '-';
    document.getElementById('detail-vitals-temp').textContent = vitals.temp || '-';
    document.getElementById('detail-vitals-weight').textContent = vitals.weight || '-';
    document.getElementById('detail-vitals-height').textContent = vitals.height || '-';
    document.getElementById('detail-vitals-bmi').textContent = vitals.bmi || '-';

    document.getElementById('detail-symptoms').textContent = visit.symptoms || '-';
    document.getElementById('detail-present-illness').textContent = visit.presentIllness || '-';
    document.getElementById('detail-past-history').textContent = visit.pastHistory || '-';
    document.getElementById('detail-pe').textContent = visit.pe || '-';
    document.getElementById('detail-diagnosis').textContent = visit.diagnosis || '-';
    document.getElementById('detail-treatment').textContent = visit.treatment || '-';

    const reprintBtn = document.getElementById('detail-print-btn');
    const isTh = (currentSettings.lang || 'th') === 'th';

    const newReprintBtn = reprintBtn.cloneNode(true);
    reprintBtn.parentNode.replaceChild(newReprintBtn, reprintBtn);

    newReprintBtn.addEventListener('click', async() => {
        if (window.api) {
            const res = await window.api.generatePdf({
                patient,
                vitals: visit.vitals,
                symptoms: visit.symptoms,
                diagnosis: visit.diagnosis,
                treatment: visit.treatment || '',
                prescriptions: visit.prescriptions || [],
                visitDate: visit.date,
                visitTime: visit.time
            });
            if (res.success) {
                alert(isTh ? `สั่งพิมพ์/ส่งออกไฟล์ PDF เรียบร้อยแล้วที่:\n${res.filePath}` : `PDF successfully printed to:\n${res.filePath}`);
            } else {
                alert(isTh ? 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF' : 'Error generating PDF file.');
            }
        }
    });

    modal.classList.remove('hidden');
}

const historyCloseBtn = document.getElementById('history-close-btn');
if (historyCloseBtn) {
    historyCloseBtn.addEventListener('click', () => {
        document.getElementById('visit-history-modal').classList.add('hidden');
    });
}

const detailCloseBtn = document.getElementById('detail-close-btn');
if (detailCloseBtn) {
    detailCloseBtn.addEventListener('click', () => {
        document.getElementById('visit-details-modal').classList.add('hidden');
    });
}

// --- Right-Click Context Menu Implementation ---
const patientTableBody = document.getElementById('patient-table-body');
if (patientTableBody) {
    patientTableBody.addEventListener('contextmenu', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;

        const hn = tr.cells[0].textContent.trim();
        const patient = patients.find(p => p.hn === hn);
        if (!patient) return;

        e.preventDefault();
        showPatientContextMenu(e.clientX, e.clientY, patient);
    });
}

const inventoryTableBody = document.getElementById('inventory-table-body');
if (inventoryTableBody) {
    inventoryTableBody.addEventListener('contextmenu', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;

        const prodId = tr.cells[0].textContent.trim();
        const product = products.find(p => p.id === prodId);
        if (!product) return;

        e.preventDefault();
        showProductContextMenu(e.clientX, e.clientY, product);
    });
}

function showPatientContextMenu(x, y, patient) {
    const menu = document.getElementById('context-menu');
    menu.classList.remove('hidden');
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const lang = currentSettings.lang || 'th';
    const isTh = lang === 'th';

    menu.innerHTML = `
      <div class="context-menu-item" id="ctx-start-visit">
        <span>🩺</span>
        <span>${isTh ? 'เริ่มการรักษา' : 'Start Visit'}</span>
      </div>
      <div class="context-menu-item" id="ctx-edit-patient">
        <span>📝</span>
        <span>${isTh ? 'แก้ไขประวัติ' : 'Edit Profile'}</span>
      </div>
      <div class="context-menu-item" id="ctx-view-history">
        <span>📜</span>
        <span>${isTh ? 'ประวัติการรักษา' : 'Visit History'}</span>
      </div>
      <div class="context-menu-item" id="ctx-copy-hn">
        <span>📋</span>
        <span>${isTh ? 'คัดลอก HN' : 'Copy HN'}</span>
      </div>
      <div class="context-menu-item" id="ctx-delete-patient" style="color: var(--error-color);">
        <span>🗑️</span>
        <span>${isTh ? 'ลบประวัติคนไข้' : 'Delete Patient'}</span>
      </div>
    `;

    menu.querySelector('#ctx-start-visit').addEventListener('click', () => {
        startVisitForPatient(patient);
        menu.classList.add('hidden');
    });

    menu.querySelector('#ctx-edit-patient').addEventListener('click', () => {
        openPatientModal(patient);
        menu.classList.add('hidden');
    });

    menu.querySelector('#ctx-view-history').addEventListener('click', () => {
        openVisitHistoryModal(patient);
        menu.classList.add('hidden');
    });

    menu.querySelector('#ctx-copy-hn').addEventListener('click', () => {
        navigator.clipboard.writeText(patient.hn);
        alert(isTh ? 'คัดลอก HN ลงคลิปบอร์ดแล้ว!' : 'HN copied to clipboard!');
        menu.classList.add('hidden');
    });

    menu.querySelector('#ctx-delete-patient').addEventListener('click', () => {
        const confirmMsg = isTh ? `ต้องการลบประวัติคนไข้ ${patient.name} ใช่ไหม?` : `Delete patient ${patient.name}?`;
        showConfirmPopup(confirmMsg, (confirmed) => {
            if (confirmed) {
                const idx = patients.findIndex(p => p.hn === patient.hn);
                if (idx !== -1) {
                    patients.splice(idx, 1);
                    if (window.api) window.api.dbWrite('patients', patients);
                    refreshPatientsView();
                }
            }
        });
        menu.classList.add('hidden');
    });
}

function showProductContextMenu(x, y, product) {
    const menu = document.getElementById('context-menu');
    menu.classList.remove('hidden');
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const lang = currentSettings.lang || 'th';
    const isTh = lang === 'th';

    menu.innerHTML = `
      <div class="context-menu-item" id="ctx-edit-product">
        <span>✏️</span>
        <span>${isTh ? 'แก้ไขข้อมูลสินค้า' : 'Edit Product'}</span>
      </div>
      <div class="context-menu-item" id="ctx-restock-product">
        <span>📦</span>
        <span>${isTh ? 'เติมสต็อกสินค้า' : 'Restock Product'}</span>
      </div>
      <div class="context-menu-item" id="ctx-copy-prod-id">
        <span>📋</span>
        <span>${isTh ? 'คัดลอกรหัสสินค้า' : 'Copy Product ID'}</span>
      </div>
      <div class="context-menu-item" id="ctx-delete-product" style="color: var(--error-color);">
        <span>🗑️</span>
        <span>${isTh ? 'ลบสินค้า' : 'Delete Product'}</span>
      </div>
    `;

    menu.querySelector('#ctx-edit-product').addEventListener('click', () => {
        openProductModal(product);
        menu.classList.add('hidden');
    });

    menu.querySelector('#ctx-restock-product').addEventListener('click', () => {
        document.getElementById('restock-product-id').value = product.id;
        document.getElementById('restock-qty-input').value = '';
        document.getElementById('restock-form-modal').classList.remove('hidden');
        menu.classList.add('hidden');
    });

    menu.querySelector('#ctx-copy-prod-id').addEventListener('click', () => {
        navigator.clipboard.writeText(product.id);
        alert(isTh ? 'คัดลอกรหัสสินค้าลงคลิปบอร์ดแล้ว!' : 'Product ID copied to clipboard!');
        menu.classList.add('hidden');
    });

    menu.querySelector('#ctx-delete-product').addEventListener('click', () => {
        const confirmMsg = isTh ? `ต้องการลบสินค้า ${product.name} ใช่ไหม?` : `Delete product ${product.name}?`;
        showConfirmPopup(confirmMsg, (confirmed) => {
            if (confirmed) {
                const idx = products.findIndex(p => p.id === product.id);
                if (idx !== -1) {
                    products.splice(idx, 1);
                    if (window.api) window.api.dbWrite('products', products);
                    refreshInventoryView();
                }
            }
        });
        menu.classList.add('hidden');
    });
}

// Dismiss context menu
document.addEventListener('click', (e) => {
    const menu = document.getElementById('context-menu');
    if (menu && !menu.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const menu = document.getElementById('context-menu');
        if (menu) menu.classList.add('hidden');
    }
});

// --- Auto Updater UI Logic ---
const updateModal = document.getElementById('update-modal');
const updateVersion = document.getElementById('update-version');
const updateNotes = document.getElementById('update-notes');
const updateProgressContainer = document.getElementById('update-progress-container');
const updateProgressBar = document.getElementById('update-progress-bar');
const updateProgressPercent = document.getElementById('update-progress-percent');
const updateProgressStatus = document.getElementById('update-progress-status');
const updateCancelBtn = document.getElementById('update-cancel-btn');
const updateActionBtn = document.getElementById('update-action-btn');
const settingsCheckUpdateBtn = document.getElementById('settings-check-update-btn');
const currentVersionSpan = document.getElementById('settings-current-version');

if (currentVersionSpan) {
    currentVersionSpan.textContent = '1.0.0'; // Hardcoded app version matching package.json
}

let updateInfo = null;
let isDownloaded = false;

// Cancel button handler - always setup
if (updateCancelBtn) {
    updateCancelBtn.addEventListener('click', () => {
        if (updateModal) updateModal.classList.add('hidden');
    });
}

if (window.api && window.api.onUpdateAvailable) {
    // Handle update available
    window.api.onUpdateAvailable((info) => {
        updateInfo = info;
        const version = info.version || 'Unknown';
        const notes = info.releaseNotes || 'ไม่มีบันทึกการเปลี่ยนแปลงสำหรับรุ่นนี้ (No release notes available.)';

        updateVersion.textContent = `v${version}`;
        updateNotes.innerHTML = typeof notes === 'string' ? notes.replace(/\r?\n/g, '<br>') : JSON.stringify(notes);

        // Reset state
        isDownloaded = false;
        updateProgressContainer.classList.add('hidden');
        updateActionBtn.textContent = 'ดาวน์โหลดเลย (Download)';
        updateActionBtn.disabled = false;
        updateCancelBtn.classList.remove('hidden');

        updateModal.classList.remove('hidden');
    });

    // Handle progress
    window.api.onUpdateProgress((progressObj) => {
        updateProgressContainer.classList.remove('hidden');
        const percent = Math.round(progressObj.percent || 0);
        updateProgressBar.style.width = `${percent}%`;
        updateProgressPercent.textContent = `${percent}%`;

        const speedMb = ((progressObj.bytesPerSecond || 0) / (1024 * 1024)).toFixed(2);
        updateProgressStatus.textContent = `กำลังดาวน์โหลด... (${speedMb} MB/s)`;
    });

    // Handle update downloaded
    window.api.onUpdateDownloaded((info) => {
        isDownloaded = true;
        updateProgressContainer.classList.remove('hidden');
        updateProgressBar.style.width = '100%';
        updateProgressPercent.textContent = '100%';
        updateProgressStatus.textContent = 'ดาวน์โหลดเสร็จสิ้น! (Download complete)';

        updateActionBtn.textContent = 'เริ่มใหม่และติดตั้ง (Restart & Install)';
        updateActionBtn.disabled = false;
        updateCancelBtn.classList.add('hidden'); // Force install to ensure consistency
    });

    // Handle update error
    window.api.onUpdateError((err) => {
        updateProgressStatus.textContent = `เกิดข้อผิดพลาด: ${err}`;
        updateActionBtn.disabled = false;
        updateActionBtn.textContent = 'ลองใหม่ (Retry)';
        isDownloaded = false;
    });

    // Action button handler
    updateActionBtn.addEventListener('click', async() => {
        updateActionBtn.disabled = true;
        if (isDownloaded) {
            await window.api.installUpdate();
        } else {
            updateActionBtn.textContent = 'กำลังดาวน์โหลด...';
            await window.api.startUpdateDownload();
        }
    });

    // Check updates manually from settings card
    if (settingsCheckUpdateBtn) {
        settingsCheckUpdateBtn.addEventListener('click', async() => {
            // Trigger dev simulate hook in dev mode, or just log
            if (window.api.simulateUpdateCheck) {
                const simulated = await window.api.simulateUpdateCheck();
                if (simulated) {
                    console.log('Simulating update check in development mode...');
                    return;
                }
            }
            alert('ระบบจะทำการตรวจสอบข้อมูลอัปเดตอัตโนมัติจากเซิร์ฟเวอร์');
        });
    }
} else {
    // Fallback: If modal is somehow visible without API, ensure it can be closed
    if (updateCancelBtn && updateModal) {
        updateCancelBtn.addEventListener('click', () => {
            updateModal.classList.add('hidden');
        });
    }
}

// Init App run
await initApp();
});
