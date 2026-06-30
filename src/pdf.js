const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Format date in Thai Buddhist Era format (e.g. วันที่ 1 เดือนมกราคม พ.ศ.2569)
 */
function formatThaiDate(dateStr) {
  let targetDate;
  if (!dateStr) {
    targetDate = new Date();
  } else {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  const day = targetDate.getDate();
  const month = targetDate.getMonth() + 1;
  const year = targetDate.getFullYear();

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const beYear = year + 543;
  return `วันที่ ${day} เดือน${thaiMonths[month - 1]} พ.ศ.${beYear}`;
}

/**
 * Calculate age dynamically in years and months
 */
function calculateAge(dobStr) {
  if (!dobStr) return '-';
  const parts = dobStr.split('-');
  if (parts.length !== 3) return dobStr;
  const dobYear = parseInt(parts[0], 10);
  const dobMonth = parseInt(parts[1], 10);
  const dobDay = parseInt(parts[2], 10);

  const dob = new Date(dobYear, dobMonth - 1, dobDay);
  const today = new Date();

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  let days = today.getDate() - dob.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years > 0) {
    return `${years}ปี ${months > 0 ? months + ' เดือน' : ''}`;
  } else {
    return `${months} เดือน`;
  }
}

/**
 * Generates a clean, well-aligned clinical visit PDF corresponding to standard Thai clinical layout.
 * @param {string} filePath - Absolute path where the PDF will be saved.
 * @param {object} data - The data containing patient details, vitals, symptoms, diagnosis, treatment, and clinic settings.
 * @returns {Promise<object>} - Resolves with { success: true, filePath }
 */
function generatePatientVisitPdf(filePath, data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Determine font. On Windows, Tahoma supports Thai characters well.
      let fontName = 'Helvetica';
      let fontBold = 'Helvetica-Bold';
      if (process.platform === 'win32') {
        const tahomaPath = 'C:\\Windows\\Fonts\\tahoma.ttf';
        const tahomabdPath = 'C:\\Windows\\Fonts\\tahomabd.ttf';
        if (fs.existsSync(tahomaPath)) {
          fontName = tahomaPath;
          fontBold = fs.existsSync(tahomabdPath) ? tahomabdPath : tahomaPath;
        } else {
          const msSansPath = 'C:\\Windows\\Fonts\\micross.ttf';
          if (fs.existsSync(msSansPath)) {
            fontName = msSansPath;
            fontBold = msSansPath;
          }
        }
      }

      // Clinic settings header details
      const settings = data.settings || {};
      const clinicName = settings.clinicName || 'Parinda Clinic';
      const clinicAddress = settings.clinicAddress || settings.clinicHeader || '';
      const clinicTel = settings.clinicTel || '02-123-4567';
      const defaultPractitioner = settings.defaultPractitioner || 'Dr. Parinda';
      const clinicId = settings.clinicId || 'N/A';
      const lang = settings.lang || 'th';

      // Header Layout
      // Top right: Clinic ID / รหัสคลินิก (if present)
      if (clinicId && clinicId !== 'N/A') {
        doc.font(fontBold).fontSize(9).text(`${lang === 'th' ? 'รหัสคลินิก' : 'Clinic ID'}: ${clinicId}`, 400, 30, { align: 'right' });
      }
      
      doc.y = 40;
      // Center Clinic Name
      doc.font(fontBold).fontSize(14).text(clinicName, 40, doc.y, { align: 'center' });
      
      // Center Address / Tel (exactly matching template)
      doc.font(fontName).fontSize(10).text(`${clinicAddress} โทร ${clinicTel}`, { align: 'center' });
      doc.moveDown(0.3);

      // Separator Line (Blue line matching screenshot)
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#3b82f6').lineWidth(1.5).stroke();
      doc.moveDown(0.5);

      // --- SUB-HEADER ---
      const subHeaderY = doc.y;
      doc.font(fontBold).fontSize(10).fillColor('#000000').text('เวชระเบียนผู้รับบริการ', 40, subHeaderY);
      doc.font(fontBold).fontSize(10).text(`HN: ${(data.patient && data.patient.hn) ? data.patient.hn : '-'}`, 480, subHeaderY);
      doc.moveDown(0.5);

      // SECTION 1: ข้อมูลทั่วไป (Patient Profile)
      doc.font(fontBold).fontSize(10).text('ข้อมูลทั่วไป (Patient Profile)', 40, doc.y);
      
      // วันที่มารับบริการ (e.g. วันที่มารับบริการ : วันที่ 1 เดือนมกราคม พ.ศ.2569)
      const visitDateVal = data.visitDate || new Date().toISOString().split('T')[0];
      const visitTimeVal = data.visitTime || '';
      const timeStr = visitTimeVal ? ` เวลา ${visitTimeVal} น.` : '';
      doc.font(fontName).fontSize(9.5).text(`วันที่มารับบริการ : ${formatThaiDate(visitDateVal)}${timeStr}`, 40, doc.y + 2);
      doc.moveDown(0.4);

      // ข้อมูลผู้ป่วย :
      doc.font(fontBold).fontSize(10).text('ข้อมูลผู้ป่วย :', 40, doc.y);
      doc.font(fontName).fontSize(9.5);
      
      const patient = data.patient || {};
      
      // Row 1: ชื่อ, อายุ, เพศ, สถานภาพ
      let genderDisplay = patient.gender || '-';
      if (lang === 'th') {
        if (genderDisplay === 'Male') genderDisplay = 'ชาย';
        else if (genderDisplay === 'Female') genderDisplay = 'หญิง';
        else if (genderDisplay === 'Other') genderDisplay = 'อื่น ๆ';
      }
      
      let maritalDisplay = patient.maritalStatus || 'Single';
      if (maritalDisplay === 'Other') {
        maritalDisplay = patient.maritalStatusOther || (lang === 'th' ? 'อื่น ๆ' : 'Other');
      } else {
        if (lang === 'th') {
          if (maritalDisplay === 'Single') maritalDisplay = 'โสด';
          else if (maritalDisplay === 'Married') maritalDisplay = 'สมรส';
          else if (maritalDisplay === 'Widowed') maritalDisplay = 'หม้าย';
          else if (maritalDisplay === 'Divorced') maritalDisplay = 'หย่าร้าง';
        }
      }
      
      const ageStr = calculateAge(patient.dob);
      doc.text(`ชื่อ: ${patient.name || '-'}  อายุ ${ageStr}  เพศ ${genderDisplay}  สถานภาพ: ${maritalDisplay}`, 60, doc.y);
      
      // Row 2: ที่อยู่
      const addressDisplay = patient.cardAddress || patient.contactAddress || '-';
      doc.text(`ที่อยู่: ${addressDisplay}`, 60, doc.y + 3);
      
      // Row 3: เลขบัธรรมดา, สิทธิการรักษา, โทร
      let rightDisplay = patient.medicalRight || '-';
      if (lang === 'th') {
        if (rightDisplay === 'Universal Healthcare / 30 Baht') rightDisplay = 'ประกันสุขภาพถ้วนหน้า (30 บาท)';
        else if (rightDisplay === 'Social Security') rightDisplay = 'ประกันสังคม';
        else if (rightDisplay === 'Civil Servant') rightDisplay = 'ข้าราชการ/รัฐวิสาหกิจ';
        else if (rightDisplay === 'Self-pay') rightDisplay = 'จ่ายเงินเอง/อื่นๆ';
      }
      doc.text(`เลขบัตรประชาชน: ${patient.citizenId || '-'}  สิทธิการรักษา: ${rightDisplay}  โทร: ${patient.phone || '-'}`, 60, doc.y + 3);
      
      // Row 4: โรคประจำตัว, ประวัติการแพ้ยา
      const underlying = patient.underlyingDisease || (lang === 'th' ? 'ปฏิเสธโรคประจำตัว' : 'None');
      const allergies = patient.allergies || (lang === 'th' ? 'ปฏิเสธแพ้ยา' : 'None');
      doc.text(`โรคประจำตัว: ${underlying}  ประวัติการแพ้ยา: ${allergies}`, 60, doc.y + 3);
      doc.moveDown(0.6);

      // SECTION 2: ข้อมูลการตรวจรักษา(Clinical Data)
      doc.font(fontBold).fontSize(10).text('ข้อมูลการตรวจรักษา(Clinical Data)', 40, doc.y);
      doc.font(fontName).fontSize(9.5);
      
      const vitals = data.vitals || {};
      doc.text(`น้ำหนัก ${vitals.weight || '-'} Kg ส่วนสูง : ${vitals.height || '-'} CM`, 60, doc.y + 2);
      doc.moveDown(0.4);

      // สัญญาณชีพ
      doc.font(fontBold).fontSize(10).text('สัญญาณชีพ', 40, doc.y);
      doc.font(fontName).fontSize(9.5);
      doc.text(`BT: ${vitals.temp || '-'} องศาเซลเซียส      RR: ${vitals.rr || '-'} /min`, 60, doc.y + 2);
      doc.text(`BP: ${vitals.bp || '-'} mmHg        PR: ${vitals.hr || '-'} /min BMI: ${vitals.bmi || '-'}`, 60, doc.y + 3);
      doc.moveDown(0.6);

      // อาการสำคัญ(Chief Complaint)
      doc.font(fontBold).fontSize(10).text('อาการสำคัญ (Chief Complaint)', 40, doc.y);
      doc.font(fontName).fontSize(9.5).text(data.symptoms || '-', 60, doc.y + 2, { width: 480 });
      doc.moveDown(0.5);

      // ประวัติการเจ็บป่วยปัจจุบัน(Present illness)
      doc.font(fontBold).fontSize(10).text('ประวัติการเจ็บป่วยปัจจุบัน (Present Illness)', 40, doc.y);
      doc.font(fontName).fontSize(9.5).text(data.presentIllness || '-', 60, doc.y + 2, { width: 480 });
      doc.moveDown(0.5);

      // ประวัติการเจ็บป่วยในอดีต (Past History)
      doc.font(fontBold).fontSize(10).text('ประวัติการเจ็บป่วยในอดีต (Past History)', 40, doc.y);
      doc.font(fontName).fontSize(9.5).text(data.pastHistory || '-', 60, doc.y + 2, { width: 480 });
      doc.moveDown(0.5);

      // ยาที่ใช้เป็นประจำ (Current Medications)
      doc.font(fontBold).fontSize(10).text('ยาที่ใช้เป็นประจำ (Current Medications)', 40, doc.y);
      doc.font(fontName).fontSize(9.5).text(data.regularMedication || '-', 60, doc.y + 2, { width: 480 });
      doc.moveDown(0.5);

      // การตรวจร่างกาย (Physical Exam)
      doc.font(fontBold).fontSize(10).text('การตรวจร่างกาย (Physical Exam)', 40, doc.y);
      doc.font(fontName).fontSize(9.5).text(data.pe || '-', 60, doc.y + 2, { width: 480 });
      doc.moveDown(0.5);

      // การวินิจฉัยโรค (Diagnosis)
      doc.font(fontBold).fontSize(10).text('การวินิจฉัยโรค (Diagnosis)', 40, doc.y);
      doc.font(fontName).fontSize(9.5).text(data.diagnosis || '-', 60, doc.y + 2, { width: 480 });
      doc.moveDown(0.5);

      // การรักษา/หัตถการ/คำแนะนำ
      doc.font(fontBold).fontSize(10).text('การรักษา/หัตถการ/คำแนะนำ', 40, doc.y);
      const treatmentNotes = data.treatment || '-';
      doc.font(fontName).fontSize(9.5).text(treatmentNotes, 60, doc.y + 2, { width: 480 });

      // Signature Area (Bottom Right, matching template)
      const signatureY = doc.y > 680 ? doc.y + 30 : 700;
      doc.y = signatureY;
      
      const practitionerTitle = settings.defaultPractitionerTitle || 'พยาบาลวิชาชีพ';
      
      doc.font(fontName).fontSize(9.5);
      doc.text(defaultPractitioner, 360, signatureY, { align: 'center', width: 200 });
      doc.text(`( ${defaultPractitioner} )`, 360, signatureY + 15, { align: 'center', width: 200 });
      doc.text(practitionerTitle, 360, signatureY + 30, { align: 'center', width: 200 });
      doc.text('ผู้บันทึก', 360, signatureY + 45, { align: 'center', width: 200 });

      doc.end();

      stream.on('finish', () => {
        resolve({ success: true, filePath });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePatientVisitPdf };
