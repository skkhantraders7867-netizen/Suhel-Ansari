import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Downloads a high-quality PDF of any DOM element using native browser rendering.
 * Fully supports modern CSS (oklch, color functions, Tailwind CSS, SVGs, QR codes).
 * Produces razor-sharp text and numbers at 300+ DPI.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string = 'Document.pdf',
  options: {
    isThermal?: boolean;
    scale?: number;
    orientation?: 'portrait' | 'landscape' | 'auto';
  } = {}
): Promise<void> {
  const { isThermal = false, scale = 2.5, orientation = 'auto' } = options;

  try {
    // Wait for all web fonts (Outfit, Plus Jakarta Sans, JetBrains Mono) to be fully loaded
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const isLandscape = orientation === 'landscape' ||
      (orientation === 'auto' && (
        element.getAttribute('data-orientation') === 'landscape' ||
        element.classList.contains('landscape-print') ||
        element.classList.contains('print-monthly-sheet')
      ));

    // Check if the document explicitly contains multi-page A4 sheets (.a4-page)
    const a4Pages = element.querySelectorAll<HTMLElement>('.a4-page');
    if (a4Pages.length > 0 && !isLandscape && !isThermal) {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      for (let i = 0; i < a4Pages.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }
        const pageEl = a4Pages[i];
        const targetWidth = Math.max(pageEl.scrollWidth, pageEl.offsetWidth, 794);
        const targetHeight = Math.max(pageEl.scrollHeight, pageEl.offsetHeight, 1123);

        const pageImg = await toPng(pageEl, {
          quality: 1.0,
          pixelRatio: scale,
          backgroundColor: '#ffffff',
          width: targetWidth,
          height: targetHeight,
          canvasWidth: targetWidth * scale,
          canvasHeight: targetHeight * scale,
          skipFonts: true,
          skipAutoScale: true,
          cacheBust: true,
          style: {
            transform: 'none',
            transformOrigin: 'top left',
            textRendering: 'geometricPrecision',
            overflow: 'visible',
            maxHeight: 'none',
          },
          filter: (node) => !(node instanceof HTMLElement && node.classList?.contains('no-print')),
        });
        pdf.addImage(pageImg, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      }

      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
      return;
    }

    // Capture the entire unclipped element dimensions
    const targetWidth = isThermal 
      ? Math.max(element.scrollWidth, element.offsetWidth, 360)
      : isLandscape 
      ? Math.max(element.scrollWidth, element.offsetWidth, 1123)
      : Math.max(element.scrollWidth, element.offsetWidth, 794);

    const targetHeight = Math.max(element.scrollHeight, element.offsetHeight);

    const imgData = await toPng(element, {
      quality: 1.0,
      pixelRatio: scale,
      backgroundColor: '#ffffff',
      width: targetWidth,
      height: targetHeight,
      canvasWidth: targetWidth * scale,
      canvasHeight: targetHeight * scale,
      skipFonts: true,
      skipAutoScale: true,
      cacheBust: true,
      style: {
        transform: 'none',
        transformOrigin: 'top left',
        textRendering: 'geometricPrecision',
        overflow: 'visible',
        maxHeight: 'none',
      },
      filter: (node) => {
        if (node instanceof HTMLElement && node.classList?.contains('no-print')) {
          return false;
        }
        return true;
      },
    });

    // Create an image element to get exact natural dimensions
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = imgData;
    });

    const naturalWidth = img.naturalWidth || targetWidth * scale;
    const naturalHeight = img.naturalHeight || targetHeight * scale;

    if (isThermal) {
      // 80mm thermal receipt format (custom width and dynamic proportional height)
      const imgWidthMm = 80;
      const imgHeightMm = (naturalHeight * imgWidthMm) / naturalWidth;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidthMm, Math.max(imgHeightMm + 5, 80)],
        compress: true,
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMm, imgHeightMm, undefined, 'FAST');
      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    } else if (isLandscape) {
      // Standard A4 Landscape format (297mm x 210mm) - for attendance registers
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 0;
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = (naturalHeight * contentWidth) / naturalWidth;

      if (contentHeight <= pageHeight + 2) {
        pdf.addImage(imgData, 'PNG', margin, 0, contentWidth, Math.min(contentHeight, pageHeight), undefined, 'FAST');
      } else {
        let heightLeft = contentHeight;
        let pageIdx = 0;
        while (heightLeft > 2) {
          if (pageIdx > 0) {
            pdf.addPage('a4', 'landscape');
          }
          const position = -(pageIdx * pageHeight);
          pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
          pageIdx++;
        }
      }

      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    } else {
      // Standard A4 Portrait format (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidthMm = 210;
      const imgHeightMm = (naturalHeight * imgWidthMm) / naturalWidth;

      // If document fits neatly on 1 page (up to 300mm), output 1 exact page
      if (imgHeightMm <= 300) {
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, Math.min(pageHeight, imgHeightMm), undefined, 'FAST');
      } else {
        // Document spans multiple pages (e.g. large item lists, long party ledgers)
        // Paginate across multiple pages cleanly so zero content is cut off
        let heightLeft = imgHeightMm;
        let pageIdx = 0;

        while (heightLeft > 2) {
          if (pageIdx > 0) {
            pdf.addPage('a4', 'portrait');
          }
          const position = -(pageIdx * pageHeight);
          pdf.addImage(imgData, 'PNG', 0, position, imgWidthMm, imgHeightMm, undefined, 'FAST');
          heightLeft -= pageHeight;
          pageIdx++;
        }
      }

      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    }
  } catch (error) {
    console.error('Error generating PDF with html-to-image:', error);
    // If anything fails, fallback to printing
    window.print();
  }
}

export interface PrintElementOptions {
  orientation?: 'portrait' | 'landscape' | 'auto';
  pageMargin?: string;
  customStyles?: string;
}

/**
 * Cleanly prints a DOM element by creating an isolated print iframe or window
 */
export function printElementSafely(
  element: HTMLElement,
  title: string = 'Print Document',
  options?: PrintElementOptions
): void {
  try {
    // Check if we can use an isolated hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('title', title);
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      return;
    }

    // Determine orientation
    const isLandscape = options?.orientation === 'landscape' ||
      (options?.orientation !== 'portrait' && (
        element.getAttribute('data-orientation') === 'landscape' ||
        element.classList.contains('landscape-print') ||
        element.classList.contains('print-monthly-sheet')
      ));

    const pageSize = isLandscape ? 'A4 landscape' : 'A4 portrait';
    const pageMargin = options?.pageMargin || (isLandscape ? '4mm 5mm' : '0mm');

    // Collect all stylesheet links & style tags from head
    let headStyles = '';
    const styleNodes = document.querySelectorAll('link[rel="stylesheet"], style');
    styleNodes.forEach((node) => {
      headStyles += node.outerHTML;
    });

    // Write complete document into iframe
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${headStyles}
          <style>
            @page {
              size: ${pageSize};
              margin: ${pageMargin};
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * {
              box-sizing: border-box !important;
              box-shadow: none !important;
            }
            .print-root {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
            }
            ${isLandscape ? `
            @media print {
              @page {
                size: A4 landscape;
                margin: ${pageMargin};
              }
              html, body {
                width: 100% !important;
                max-width: 100% !important;
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .print-monthly-sheet, [data-orientation="landscape"] {
                width: 100% !important;
                max-width: 100% !important;
                padding: 1mm !important;
                margin: 0 auto !important;
              }
              table {
                width: 100% !important;
                max-width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
              }
              thead {
                display: table-header-group !important;
              }
              tfoot {
                display: table-footer-group !important;
              }
              tr {
                page-break-inside: avoid !important;
              }
              th, td {
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
              }
            }
            ` : `
            .printable-area:not(.multi-page-doc), #suhel-letterhead-a4-document {
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              box-sizing: border-box !important;
              margin: 0 auto !important;
              overflow: hidden !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
            }
            .printable-area.multi-page-doc {
              width: 210mm !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              margin: 0 auto !important;
              box-shadow: none !important;
            }
            .a4-page {
              width: 210mm !important;
              min-height: 297mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              box-sizing: border-box !important;
              margin: 0 auto !important;
              overflow: hidden !important;
              page-break-after: always !important;
              break-after: page !important;
              background: #ffffff !important;
            }
            .a4-page img {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              opacity: 1 !important;
              visibility: visible !important;
            }
            .watermark-print-visible {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .a4-page:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            `}
            ${options?.customStyles || ''}
          </style>
        </head>
        <body>
          <div class="print-root">
            ${element.outerHTML}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Give iframe time to load fonts & images, then print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print failed, falling back to window.print():', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 500);
  } catch (e) {
    console.error('Error in printElementSafely:', e);
    window.print();
  }
}
