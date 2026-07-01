document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const isThai = params.get('lang') !== 'en';
  const theme = params.get('theme') || 'clinic-green';
  const pageList = document.getElementById('page-list');
  const viewport = document.getElementById('preview-viewport');
  const message = document.getElementById('preview-message');
  const status = document.getElementById('page-status');
  const zoomLevel = document.getElementById('zoom-level');
  let pdfDocument = null;
  let scale = 1;
  let rendering = false;

  document.documentElement.lang = isThai ? 'th' : 'en';
  document.body.classList.toggle('is-dark', theme === 'dark' || theme === 'dark-mode');
  document.getElementById('preview-title').textContent = isThai ? 'ตัวอย่างเอกสาร' : 'Document Preview';
  document.getElementById('fit-width').textContent = isThai ? 'พอดีหน้าต่าง' : 'Fit Width';

  pdfjsLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.min.js';

  async function renderPages() {
    if (!pdfDocument || rendering) return;
    rendering = true;
    pageList.innerHTML = '';
    try {
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const pageViewport = page.getViewport({ scale });
        const ratio = window.devicePixelRatio || 1;
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page';
        canvas.width = Math.floor(pageViewport.width * ratio);
        canvas.height = Math.floor(pageViewport.height * ratio);
        canvas.style.width = `${Math.floor(pageViewport.width)}px`;
        canvas.style.height = `${Math.floor(pageViewport.height)}px`;
        canvas.setAttribute('aria-label', `${isThai ? 'หน้า' : 'Page'} ${pageNumber}`);
        pageList.appendChild(canvas);
        await page.render({
          canvasContext: canvas.getContext('2d'),
          viewport: pageViewport,
          transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0]
        }).promise;
      }
      zoomLevel.value = `${Math.round(scale * 100)}%`;
      status.textContent = isThai
        ? `${pdfDocument.numPages} หน้า`
        : `${pdfDocument.numPages} ${pdfDocument.numPages === 1 ? 'page' : 'pages'}`;
    } finally {
      rendering = false;
    }
  }

  async function fitWidth() {
    if (!pdfDocument) return;
    const firstPage = await pdfDocument.getPage(1);
    const base = firstPage.getViewport({ scale: 1 });
    scale = Math.max(0.5, Math.min(2, (viewport.clientWidth - 48) / base.width));
    await renderPages();
  }

  document.getElementById('zoom-in').addEventListener('click', async () => {
    scale = Math.min(2.5, scale + 0.15);
    await renderPages();
  });
  document.getElementById('zoom-out').addEventListener('click', async () => {
    scale = Math.max(0.5, scale - 0.15);
    await renderPages();
  });
  document.getElementById('fit-width').addEventListener('click', fitWidth);

  window.pdfPreview.onData(async bytes => {
    try {
      const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      pdfDocument = await pdfjsLib.getDocument({ data }).promise;
      message.hidden = true;
      await fitWidth();
    } catch (error) {
      console.error('PDF preview failed:', error);
      message.classList.add('is-error');
      message.textContent = isThai
        ? 'เปิดตัวอย่างเอกสารไม่ได้ กรุณาปิดหน้าต่างแล้วลองอีกครั้ง'
        : 'The preview could not be opened. Close this window and try again.';
      status.textContent = isThai ? 'เกิดข้อผิดพลาด' : 'Preview failed';
    }
  });
});
