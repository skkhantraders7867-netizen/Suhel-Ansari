import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  X, Printer, Share2, Copy, Check, Eye, FileText, Edit3,
  Receipt, Truck, Smartphone, Download, ArrowLeft, Building2, MapPin, Phone, Mail, Loader2,
  Sparkles, Sliders, Image as ImageIcon
} from 'lucide-react';
import { Invoice, BusinessProfile } from '../types';
import { GST_STATES } from '../data/mockData';
import { formatIndianCurrency, numberToIndianWords, generateUpiUrl, getDocumentTypeName, isUnionTerritory } from '../utils/gstCalculations';
import { downloadElementAsPdf, printElementSafely } from '../utils/pdfExport';

import { TechnoCommercialOfferTemplate } from './TechnoCommercialOfferTemplate';
import { ServiceOrderTemplate } from './ServiceOrderTemplate';

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  businessProfile: BusinessProfile;
  isOpen?: boolean;
  onClose: () => void;
  onEdit?: (invoice: Invoice) => void;
}

type TemplateType = 'OFFICIAL_PAD' | 'CLASSIC_GST' | 'MODERN_BLUE' | 'THERMAL_POS' | 'DELIVERY_CHALLAN' | 'TECHNO_COMMERCIAL' | 'SERVICE_ORDER';
type WatermarkType = 'NONE' | 'ORIGINAL FOR RECIPIENT' | 'DUPLICATE FOR TRANSPORTER' | 'TRIPLICATE FOR SUPPLIER' | 'PAID' | 'SAMPLE' | 'S.K. KHAN TRADERS' | 'TAX INVOICE';

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  businessProfile,
  isOpen = true,
  onClose,
  onEdit,
}) => {
  const isQuotation = invoice?.documentType === 'QUOTATION';
  const [template, setTemplate] = useState<TemplateType>(() => {
    if (invoice?.documentType === 'SERVICE_ORDER') return 'SERVICE_ORDER';
    if (invoice?.documentType === 'QUOTATION') return 'TECHNO_COMMERCIAL';
    return businessProfile.useCustomBillPad !== false ? 'OFFICIAL_PAD' : 'CLASSIC_GST';
  });
  const [termsLayout, setTermsLayout] = useState<'horizontal_table' | 'horizontal_2col' | 'horizontal_3col' | 'single_col'>('horizontal_table');
  const [termsMode, setTermsMode] = useState<'auto' | 'page_2' | 'single_page'>('auto');
  const [termsPageBreak, setTermsPageBreak] = useState<boolean>(true);
  const [showQuickEditModal, setShowQuickEditModal] = useState<boolean>(false);
  const [customSubject, setCustomSubject] = useState<string>(invoice?.quotationSubject || '');
  const [customRefNo, setCustomRefNo] = useState<string>(invoice?.rfqNumber || invoice?.invoiceNumber || '');
  const [customValidExpiry, setCustomValidExpiry] = useState<string>(invoice?.validUntil || '');
  const [customIntroText, setCustomIntroText] = useState<string>(invoice?.quotationIntroText || '');
  const [customTerms, setCustomTerms] = useState<string>(invoice?.terms || '');

  const [watermark, setWatermark] = useState<WatermarkType>('ORIGINAL FOR RECIPIENT');
  const [showPadBg, setShowPadBg] = useState<boolean>(true);
  const [headerOffset, setHeaderOffset] = useState<number>(() => {
    return businessProfile.billPadHeaderOffset ?? 148;
  });
  const [footerOffset, setFooterOffset] = useState<number>(businessProfile.billPadFooterOffset ?? 125);
  const [cardOpacity, setCardOpacity] = useState<'opaque' | 'translucent' | 'transparent'>('transparent');
  const [verticalAlignment, setVerticalAlignment] = useState<'center' | 'top'>('top');
  const [contentScale, setContentScale] = useState<number>(88);
  const [previewZoom, setPreviewZoom] = useState<'auto' | '100' | '75' | '50'>('auto');
  const [showCenterWatermark, setShowCenterWatermark] = useState<boolean>(false);
  const [watermarkVisual, setWatermarkVisual] = useState<'LIGHT' | 'CLEAR' | 'BOLD' | 'DARK'>('CLEAR');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Dynamic HSN / SAC column state: Auto-detect if user entered HSN in any item
  const [showHsnColumn, setShowHsnColumn] = useState<boolean>(() => {
    return invoice?.items?.some(it => Boolean(it.hsnCode && it.hsnCode.trim() !== '')) ?? false;
  });

  // Sync state if active invoice changes
  useEffect(() => {
    if (invoice) {
      if (invoice.documentType === 'SERVICE_ORDER') {
        setTemplate('SERVICE_ORDER');
        setShowPadBg(false);
        setWatermark('NONE');
        setShowCenterWatermark(false);
      } else if (invoice.documentType === 'QUOTATION') {
        setTemplate('TECHNO_COMMERCIAL');
        setShowPadBg(true);
        if (
          watermark === 'ORIGINAL FOR RECIPIENT' ||
          watermark === 'TAX INVOICE' ||
          watermark.toLowerCase().includes('ansari') ||
          watermark.toLowerCase().includes('suhel')
        ) {
          setWatermark('NONE');
          setShowCenterWatermark(false);
        }
      } else if (businessProfile.useCustomBillPad !== false) {
        setTemplate('OFFICIAL_PAD');
        setShowPadBg(true);
      }
      setCustomSubject(invoice.quotationSubject || '');
      setCustomRefNo(invoice.rfqNumber || invoice.invoiceNumber || '');
      setCustomValidExpiry(invoice.validUntil || (invoice.validityDays ? `${invoice.validityDays} Days` : ''));
      setCustomIntroText(invoice.quotationIntroText || '');
      setCustomTerms(invoice.terms || '');

      // Check if any item has an HSN/SAC code written
      const hasAnyHsn = invoice.items?.some(it => Boolean(it.hsnCode && it.hsnCode.trim() !== '')) ?? false;
      setShowHsnColumn(hasAnyHsn);
    }
  }, [invoice]);

  const effectiveInvoice: Invoice = invoice ? {
    ...invoice,
    quotationSubject: customSubject || invoice.quotationSubject,
    rfqNumber: customRefNo || invoice.rfqNumber,
    validUntil: customValidExpiry || invoice.validUntil,
    quotationIntroText: customIntroText || invoice.quotationIntroText,
    terms: customTerms || invoice.terms,
  } : ({} as Invoice);

  // Robust State and State Code Resolution for complete & accurate GST printing
  const resolvedPartyStateInfo = useMemo(() => {
    if (!effectiveInvoice) return { stateName: '', stateCode: '' };
    let stateName = effectiveInvoice.partyState?.trim() || '';
    let stateCode = effectiveInvoice.partyStateCode?.trim() || '';

    // 1. If stateCode is missing, derive from GSTIN first 2 digits
    if (!stateCode && effectiveInvoice.partyGstin && effectiveInvoice.partyGstin.trim().length >= 2) {
      const gstinPrefix = effectiveInvoice.partyGstin.trim().substring(0, 2);
      if (/^\d{2}$/.test(gstinPrefix)) {
        stateCode = gstinPrefix;
      }
    }

    // 2. If stateCode or stateName is missing, derive from placeOfSupply (e.g. "07 - Delhi" or "27 - Maharashtra")
    if ((!stateCode || !stateName) && effectiveInvoice.placeOfSupply) {
      const posMatch = effectiveInvoice.placeOfSupply.match(/^(\d{2})\s*-\s*(.+)$/);
      if (posMatch) {
        if (!stateCode) stateCode = posMatch[1].trim();
        if (!stateName) stateName = posMatch[2].trim();
      }
    }

    // 3. If stateCode is missing, lookup code by stateName
    if (!stateCode && stateName) {
      const found = GST_STATES.find(s => s.name.toLowerCase() === stateName.toLowerCase() || stateName.toLowerCase().includes(s.name.toLowerCase()));
      if (found) {
        stateCode = found.code;
      }
    }

    // 4. If stateName is missing, lookup stateName by stateCode
    if (!stateName && stateCode) {
      const found = GST_STATES.find(s => s.code === stateCode);
      if (found) {
        stateName = found.name;
      }
    }

    return { stateName, stateCode };
  }, [effectiveInvoice.partyState, effectiveInvoice.partyStateCode, effectiveInvoice.partyGstin, effectiveInvoice.placeOfSupply]);

  const contentCardBg = cardOpacity === 'transparent'
    ? 'bg-transparent'
    : cardOpacity === 'translucent'
    ? 'bg-white/60 backdrop-blur-2xs'
    : 'bg-white';

  useEffect(() => {
    if (invoice && businessProfile.upiId) {
      const upiUrl = generateUpiUrl(
        businessProfile.upiId,
        businessProfile.upiName || businessProfile.name,
        invoice.balanceDue > 0 ? invoice.balanceDue : invoice.grandTotal,
        invoice.invoiceNumber
      );

      QRCode.toDataURL(upiUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('Error generating UPI QR code:', err));
    }
  }, [invoice, businessProfile]);

  if (!isOpen || !invoice) return null;

  const isPurchaseBill = invoice.documentType === 'PURCHASE_BILL';
  const isDeliveryChallan = invoice.documentType === 'DELIVERY_CHALLAN';
  const isWithoutGst = Boolean(invoice.isWithoutGst);
  const isNonGstBill = isWithoutGst || ((isPurchaseBill || isDeliveryChallan) && ((invoice.taxTotal || 0) === 0 && (invoice.cgstTotal || 0) === 0 && (invoice.sgstTotal || 0) === 0 && (invoice.igstTotal || 0) === 0));

  // Compute exact statutory tax breakdown (CGST, SGST, UGST, IGST)
  const isUT = Boolean(
    invoice.isUtgst ||
    (!invoice.isInterState && isUnionTerritory(invoice.partyStateCode || invoice.partyState || invoice.placeOfSupply))
  );
  const effectiveUgstTotal = (invoice.ugstTotal && invoice.ugstTotal > 0)
    ? invoice.ugstTotal
    : (isUT && invoice.sgstTotal > 0 ? invoice.sgstTotal : 0);
  const effectiveSgstTotal = isUT ? 0 : (invoice.sgstTotal || 0);
  const effectiveCgstTotal = invoice.cgstTotal || 0;
  const effectiveIgstTotal = invoice.igstTotal || 0;
  const totalTaxPayable = effectiveIgstTotal + effectiveCgstTotal + effectiveSgstTotal + effectiveUgstTotal;
  const primaryTaxRate = invoice.items && invoice.items[0]?.taxRate ? invoice.items[0].taxRate : 18;
  const itemsTaxSum = (invoice.items || []).reduce(
    (sum, item) => sum + (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.ugstAmount || 0) + (item.igstAmount || 0) + (item.cessAmount || 0),
    0
  );
  const effectiveTotalTax = (invoice.taxTotal && invoice.taxTotal > 0)
    ? invoice.taxTotal
    : (totalTaxPayable > 0
        ? totalTaxPayable
        : (itemsTaxSum > 0
            ? itemsTaxSum
            : ((invoice.cessTotal || 0) + (invoice.grandTotal > invoice.taxableTotal
                ? (invoice.grandTotal - invoice.taxableTotal)
                : ((invoice.taxableTotal || 0) * (primaryTaxRate / 100))))));
  const halfTaxRate = primaryTaxRate / 2;
  const utOrSgstLabel = isUT ? 'UGST' : 'SGST';

  const effectiveTerms = (invoice.terms && invoice.terms.trim().length > 0)
    ? invoice.terms
    : (isQuotation
        ? (businessProfile.quotationTermsAndConditions || `1. All manpower required for execution of the work shall be provided by the Contractor as per the agreed scope and schedule.
2. All necessary tools & tackles such as welding machines, cutting sets, chain blocks, wire ropes, D-shackles, levels, grinding machines and other required equipment shall be arranged by the Contractor.
3. Consumables such as LPG, Oxygen, welding rods/electrodes, grinding wheels and other required consumables shall be provided by the Contractor, unless otherwise agreed in writing.
4. Required mobile crane for execution of the work shall be arranged as per the agreed scope and site requirement.
5. Accommodation, water and electricity facilities required at site shall be provided by the Company/Client.
6. Any additional work beyond the approved scope of work shall be carried out with mutual consent and shall be charged separately.
7. Work measurements and quantities shall be jointly verified and approved by the authorized representatives of both parties.
8. Mobilization shall commence after receipt of the Work Order.
9. **20% of the total Work Order value shall be paid as mobilization advance along with the Work Order.**
10. Running Account (RA) bills shall be submitted as per the progress of work and payment shall be released within **7 days from the date of submission/approval of the RA bill.**
11. GST and other applicable statutory taxes/duties shall be charged extra as applicable.
12. Any delay or stoppage of work due to non-availability of site, drawings, materials, approvals, electricity, water or other required facilities from the Company/Client's side shall not be the responsibility of the Contractor.
13. The work shall be executed as per the approved scope, agreed methodology and mutually agreed work schedule.
14. **Once the Work Order is issued and accepted, it shall not be cancelled. In case the Company/Client cancels the Work Order, the Company/Client shall compensate the Contractor for all mobilization expenses, work executed and other related costs incurred by the Contractor.**
15. Any dispute arising in connection with the work shall first be resolved through mutual discussion. If the matter remains unresolved, it shall be subject to arbitration as mutually agreed between both parties.
16. This quotation shall remain valid for the period mentioned in the commercial offer, unless otherwise agreed in writing by both parties.
17. The job sequence,duration, schedule and methodology of execution shall be submitted during further discussions`)
        : (businessProfile.termsAndConditions && businessProfile.termsAndConditions.trim().length > 0
            ? businessProfile.termsAndConditions
            : '1. Goods once sold will not be taken back or exchanged.\n2. Interest @ 18% p.a. will be charged if bill is not paid within due date.\n3. Subject to jurisdiction of our registered office.\n4. All disputes are subject to local arbitration.'));

  const renderMarkdownText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
      <>
        {parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={idx} className="font-extrabold text-slate-950">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </>
    );
  };

  const parsedTermsList: string[] = useMemo(() => {
    if (!effectiveTerms) return [];
    const lines = effectiveTerms.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    return lines.map(line => line.replace(/^\d+[\.\)\-]\s*/, '').trim()).filter(t => t.length > 0);
  }, [effectiveTerms]);

  const isTermsLong = parsedTermsList.length > 3 || effectiveTerms.length > 170;
  const shouldSplitToPage2 = termsMode === 'page_2' || (termsMode === 'auto' && isTermsLong);

  const handlePrint = () => {
    if (printRef.current) {
      printElementSafely(printRef.current, `${invoice.documentType}_${invoice.invoiceNumber}`);
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const cleanBusiness = (businessProfile.name || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${cleanBusiness}_${invoice.invoiceNumber}.pdf`;
      await downloadElementAsPdf(printRef.current, filename, {
        isThermal: template === 'THERMAL_POS',
        scale: 2.5,
      });
    } catch (error) {
      console.error('Failed to download PDF:', error);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyUpiLink = () => {
    const upiUrl = generateUpiUrl(
      businessProfile.upiId,
      businessProfile.upiName || businessProfile.name,
      invoice.balanceDue > 0 ? invoice.balanceDue : invoice.grandTotal,
      invoice.invoiceNumber
    );
    navigator.clipboard.writeText(upiUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = `*Invoice from ${businessProfile.name}*
Invoice No: *${invoice.invoiceNumber}*
Date: ${invoice.date}
Total Amount: *${formatIndianCurrency(invoice.grandTotal)}*
Balance Due: *${formatIndianCurrency(invoice.balanceDue)}*
Status: ${invoice.paymentStatus}

Pay via UPI: ${businessProfile.upiId}
Thank you for doing business with us!`;

    const cleanPhone = invoice.partyPhone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      
      {/* Top Action Bar (No Print) */}
      <div className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex items-center justify-between shadow-lg no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{getDocumentTypeName(invoice.documentType)}</span>
              <span className="font-mono text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-md border border-blue-500/30">
                {invoice.invoiceNumber}
              </span>
            </h2>
          </div>
        </div>

        {/* Template Selector Pills */}
        <div className="hidden lg:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-medium">
          <button
            onClick={() => setTemplate('OFFICIAL_PAD')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              template === 'OFFICIAL_PAD' ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Official Bill Pad</span>
          </button>
          <button
            onClick={() => setTemplate('CLASSIC_GST')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              template === 'CLASSIC_GST' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Standard GST (A4)
          </button>
          <button
            onClick={() => setTemplate('TECHNO_COMMERCIAL')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              template === 'TECHNO_COMMERCIAL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Techno-Commercial
          </button>
          <button
            onClick={() => setTemplate('SERVICE_ORDER')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              template === 'SERVICE_ORDER' ? 'bg-cyan-700 text-white shadow-xs font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-300" /> Service Order
          </button>
          <button
            onClick={() => setTemplate('MODERN_BLUE')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              template === 'MODERN_BLUE' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Modern Blue
          </button>
          <button
            onClick={() => setTemplate('THERMAL_POS')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              template === 'THERMAL_POS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" /> Thermal POS
          </button>
          <button
            onClick={() => setTemplate('DELIVERY_CHALLAN')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              template === 'DELIVERY_CHALLAN' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" /> Challan
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          
          <select
            value={watermark}
            onChange={(e) => {
              const val = e.target.value as WatermarkType;
              setWatermark(val);
              if (val === 'NONE') {
                setShowCenterWatermark(false);
              } else {
                setShowCenterWatermark(true);
              }
            }}
            className="hidden sm:block bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2 py-1.5 rounded-lg font-medium focus:outline-none"
          >
            {businessProfile.name && !businessProfile.name.toLowerCase().includes('ansari') && !businessProfile.name.toLowerCase().includes('suhel') && (
              <option value={businessProfile.name}>Watermark: {businessProfile.name}</option>
            )}
            <option value="S.K. KHAN TRADERS">Watermark: S.K. KHAN TRADERS</option>
            <option value="QUOTATION">Watermark: QUOTATION</option>
            <option value="TECHNO-COMMERCIAL OFFER">Watermark: TECHNO-COMMERCIAL OFFER</option>
            <option value="TAX INVOICE">Watermark: TAX INVOICE</option>
            <option value="ORIGINAL FOR RECIPIENT">Copy: Original</option>
            <option value="DUPLICATE FOR TRANSPORTER">Copy: Duplicate</option>
            <option value="TRIPLICATE FOR SUPPLIER">Copy: Triplicate</option>
            <option value="PAID">Stamp: PAID</option>
            <option value="SAMPLE">Stamp: SAMPLE</option>
            <option value="NONE">No Watermark (हटाएं)</option>
          </select>

          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            title="Share bill details on WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          <button
            onClick={handleCopyUpiLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
            title="Copy UPI Payment link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'UPI Link'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition-colors"
            title="Download PDF directly to your device"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save PDF</span>
              </>
            )}
          </button>

          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(invoice);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-md transition-colors"
              title="Edit this invoice"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md transition-colors"
            title="Print invoice via printer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Techno-Commercial Quotation / Service Order Subheader Controls (No Print) */}
      {(template === 'TECHNO_COMMERCIAL' || template === 'SERVICE_ORDER') && (
        <div className="bg-slate-800/95 border-b border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-200 no-print gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{template === 'SERVICE_ORDER' ? 'Service Order Print Adjustment' : 'Quotation Pad Print Adjustment'}</span>
            </span>
            <span className="text-slate-300 hidden md:inline text-[11px] font-semibold">
              Pad: {invoice.partyName || businessProfile.name || 'Official Letter Pad'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Top Gap / Margin Adjustment */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px] font-semibold">Top Gap (Blue Line):</span>
              <button
                type="button"
                onClick={() => setHeaderOffset(prev => Math.max(40, prev - 10))}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
                title="Top gap kam karein"
              >
                -
              </button>
              <span className="font-mono text-amber-300 font-bold">{headerOffset}px</span>
              <button
                type="button"
                onClick={() => setHeaderOffset(prev => Math.min(300, prev + 10))}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
                title="Top gap badhayein"
              >
                +
              </button>
            </div>

            {/* Bottom Gap / Margin Adjustment */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px] font-semibold">Bottom Gap:</span>
              <button
                type="button"
                onClick={() => setFooterOffset(prev => Math.max(20, prev - 10))}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
                title="Bottom gap kam karein"
              >
                -
              </button>
              <span className="font-mono text-amber-300 font-bold">{footerOffset}px</span>
              <button
                type="button"
                onClick={() => setFooterOffset(prev => Math.min(250, prev + 10))}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
                title="Bottom gap badhayein"
              >
                +
              </button>
            </div>

            {/* Size Scale Adjustment */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px] font-semibold">Size Scale:</span>
              <button
                type="button"
                onClick={() => setContentScale(prev => Math.max(65, prev - 4))}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold text-xs"
                title="Scale chhota karein"
              >
                -
              </button>
              <span className="font-mono text-amber-300 font-bold text-xs">{contentScale}%</span>
              <button
                type="button"
                onClick={() => setContentScale(prev => Math.min(100, prev + 4))}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold text-xs"
                title="Scale bada karein"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setContentScale(100)}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                  contentScale === 100 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="100% full scale"
              >
                100%
              </button>
            </div>

            {/* Lock Below Blue Line Preset */}
            <button
              type="button"
              onClick={() => {
                setHeaderOffset(148);
                setFooterOffset(125);
                setContentScale(100);
                setVerticalAlignment('top');
              }}
              className="px-2.5 py-1 bg-blue-950/90 hover:bg-blue-900 border border-blue-500/60 text-blue-300 text-[11px] font-bold rounded-lg transition-colors shadow-xs"
              title="Blue line ke thik niche se print start karein (148px Lock)"
            >
              🎯 Lock Below Blue Line
            </button>

            {/* Position Centering Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px]">Position:</span>
              <button
                type="button"
                onClick={() => setVerticalAlignment('top')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  verticalAlignment === 'top' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Blue line se top aligned"
              >
                Top Aligned
              </button>
              <button
                type="button"
                onClick={() => setVerticalAlignment('center')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  verticalAlignment === 'center' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Center on pad"
              >
                Center
              </button>
            </div>

            {/* Pad Background Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={showPadBg}
                onChange={(e) => setShowPadBg(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded accent-amber-500 cursor-pointer"
              />
              <span className="font-bold text-amber-300 text-[11px]">Letter Pad BG</span>
            </label>

            {/* Pad Card Transparency / Watermark Visibility Controls */}
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px]">Pad Watermark / Table:</span>
              <button
                type="button"
                onClick={() => setCardOpacity('transparent')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  cardOpacity === 'transparent'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white bg-slate-800'
                }`}
                title="Table transparent rakhein taaki Letter Pad ka Watermark 100% Saaf & Clear dikhe"
              >
                Clear Watermark (Transparent)
              </button>
              <button
                type="button"
                onClick={() => setCardOpacity('translucent')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  cardOpacity === 'translucent'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white bg-slate-800'
                }`}
                title="Halka translucent background"
              >
                Translucent
              </button>
              <button
                type="button"
                onClick={() => setCardOpacity('opaque')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  cardOpacity === 'opaque'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white bg-slate-800'
                }`}
                title="Solid White background"
              >
                Solid White
              </button>
            </div>

            {/* Clear Watermark Controls */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px]">Watermark:</span>
              
              <button
                type="button"
                onClick={() => {
                  setShowCenterWatermark(false);
                  setWatermark('NONE');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  !showCenterWatermark || watermark === 'NONE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white bg-slate-800'
                }`}
                title="Watermark hatao (No Watermark)"
              >
                ✕ Watermark हटाएं
              </button>

              <button
                type="button"
                onClick={() => {
                  setWatermark('QUOTATION');
                  setShowCenterWatermark(true);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  showCenterWatermark && watermark === 'QUOTATION'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white bg-slate-800'
                }`}
                title="QUOTATION Watermark lagayein"
              >
                QUOTATION
              </button>

              <button
                type="button"
                onClick={() => {
                  setWatermark('S.K. KHAN TRADERS');
                  setShowCenterWatermark(true);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  showCenterWatermark && watermark === 'S.K. KHAN TRADERS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white bg-slate-800'
                }`}
                title="S.K. KHAN TRADERS Watermark lagayein"
              >
                S.K. KHAN TRADERS
              </button>
            </div>

            {showCenterWatermark && watermark !== 'NONE' && (
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[11px]">Contrast:</span>
                {(['LIGHT', 'CLEAR', 'BOLD', 'DARK'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setWatermarkVisual(lvl)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      watermarkVisual === lvl ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                    title={`${lvl} watermark visibility`}
                  >
                    {lvl === 'CLEAR' ? 'Clear (स्पष्ट)' : lvl}
                  </button>
                ))}
              </div>
            )}

            {/* Terms on Page 2 Toggle (Matches user request) */}
            <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px] font-medium mr-0.5">T&amp;C Sheet:</span>
              <button
                type="button"
                onClick={() => setTermsPageBreak(true)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  termsPageBreak ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Print T&C on second page (पेज 2 पर T&C)"
              >
                Page 2 (अलग पेज)
              </button>
              <button
                type="button"
                onClick={() => setTermsPageBreak(false)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  !termsPageBreak ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Print inline on single page"
              >
                Same Page (1 ही पेज)
              </button>
            </div>

            {/* Quick Customize Offer Drawer Button */}
            <button
              type="button"
              onClick={() => setShowQuickEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
              title="Edit Subject, RFQ No, Valid Expiry, Intro Text, and Terms & Conditions"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Customize Offer &amp; T&amp;C</span>
            </button>
          </div>
        </div>
      )}

      {/* Official Pad Subheader Controls (No Print) */}
      {template === 'OFFICIAL_PAD' && (
        <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-200 no-print gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" /> Pad Print Mode
            </span>
            <span className="text-slate-400">Pad: S.K. Khan Traders</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Position Centering Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px]">Position:</span>
              <button
                type="button"
                onClick={() => setVerticalAlignment('center')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  verticalAlignment === 'center' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Print invoice content right in the center of the letter pad"
              >
                Center on Pad
              </button>
              <button
                type="button"
                onClick={() => setVerticalAlignment('top')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  verticalAlignment === 'top' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Align invoice content towards top"
              >
                Top Aligned
              </button>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPadBg}
                onChange={(e) => setShowPadBg(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded accent-amber-500"
              />
              <span className="font-semibold text-slate-200">Pad Background</span>
            </label>

            {/* HSN / SAC Column Print Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px]">HSN/SAC:</span>
              <button
                type="button"
                onClick={() => setShowHsnColumn(!showHsnColumn)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                  showHsnColumn ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="HSN/SAC column: Only printed when code is entered"
              >
                {showHsnColumn ? 'Print HSN (चालू)' : 'Hide HSN (बंद)'}
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px]">Pad Watermark:</span>
              <span className="text-emerald-400 font-bold text-[10px] uppercase bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                Original Pad
              </span>
              <button
                type="button"
                onClick={() => setShowCenterWatermark(!showCenterWatermark)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                  showCenterWatermark ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Toggle extra diagonal text overlay"
              >
                {showCenterWatermark ? '+ Text Overlay ON' : '+ Add Text'}
              </button>
            </div>

            {showCenterWatermark && (
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[11px]">Text Level:</span>
                <button
                  type="button"
                  onClick={() => setWatermarkVisual('LIGHT')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    watermarkVisual === 'LIGHT' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Light watermark (22% opacity)"
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkVisual('CLEAR')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    watermarkVisual === 'CLEAR' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Clear readable watermark (45% contrast in print)"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkVisual('BOLD')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    watermarkVisual === 'BOLD' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Bold watermark (65% contrast)"
                >
                  Bold
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkVisual('DARK')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    watermarkVisual === 'DARK' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Dark watermark (85% contrast for maximum print visibility)"
                >
                  Dark
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px]">Card Style:</span>
              <button
                type="button"
                onClick={() => setCardOpacity('transparent')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  cardOpacity === 'transparent' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Direct print on pad without white box backgrounds"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setCardOpacity('translucent')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  cardOpacity === 'translucent' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Slight white tint so text and pad watermark are both visible"
              >
                Tinted
              </button>
              <button
                type="button"
                onClick={() => setCardOpacity('opaque')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  cardOpacity === 'opaque' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Solid white cards"
              >
                Solid
              </button>
            </div>

            {/* Scale / Fit Controller */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px]">Size Scale:</span>
              <button
                type="button"
                onClick={() => setContentScale(prev => Math.max(65, prev - 4))}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold text-xs"
                title="Reduce scale to fit more items between blue lines"
              >
                -
              </button>
              <span className="font-mono text-amber-300 font-bold text-xs">{contentScale}%</span>
              <button
                type="button"
                onClick={() => setContentScale(prev => Math.min(100, prev + 4))}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold text-xs"
                title="Increase scale"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setContentScale(88)}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                  contentScale === 88 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Auto fit for 1 page"
              >
                Fit
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px]">Top Gap:</span>
              <button
                type="button"
                onClick={() => setHeaderOffset(prev => Math.max(40, prev - 10))}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
              >
                -
              </button>
              <span className="font-mono text-amber-300 font-bold">{headerOffset}px</span>
              <button
                type="button"
                onClick={() => setHeaderOffset(prev => Math.min(300, prev + 10))}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px]">Bottom Gap:</span>
              <button
                type="button"
                onClick={() => setFooterOffset(prev => Math.max(20, prev - 10))}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
              >
                -
              </button>
              <span className="font-mono text-amber-300 font-bold">{footerOffset}px</span>
              <button
                type="button"
                onClick={() => setFooterOffset(prev => Math.min(250, prev + 10))}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setHeaderOffset(148);
                setFooterOffset(125);
                setContentScale(88);
                setVerticalAlignment('top');
              }}
              className="px-2 py-1 bg-blue-950/80 hover:bg-blue-900 border border-blue-600/50 text-blue-300 text-[11px] font-bold rounded-lg transition-colors"
              title="Reset margins to start cleanly below the top letterhead blue/red line"
            >
              🎯 Lock Below Blue Line
            </button>

            {/* Terms Layout & Multi-Page Mode Controls */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px] font-bold">Terms / शर्तें:</span>
              <button
                type="button"
                onClick={() => setTermsMode('auto')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  termsMode === 'auto' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Auto: If terms are long, print on Page 2 Annexure. If short, print on Page 1."
              >
                Auto {isTermsLong ? '(P2)' : '(P1)'}
              </button>
              <button
                type="button"
                onClick={() => setTermsMode('page_2')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  termsMode === 'page_2' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Force print Terms on 2nd Page (अलग पेज पर)"
              >
                Page 2 (अलग पेज)
              </button>
              <button
                type="button"
                onClick={() => setTermsMode('single_page')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  termsMode === 'single_page' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Force fit on 1 Page"
              >
                1 Page (एक पेज)
              </button>
            </div>

            {/* Terms Horizontal Column Grid Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px] font-bold">Terms Grid:</span>
              <button
                type="button"
                onClick={() => setTermsLayout('horizontal_table')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  termsLayout === 'horizontal_table' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Full-Width Horizontal Table / Sheet Rows exactly matching tender format"
              >
                Table (Sheet Rows)
              </button>
              <button
                type="button"
                onClick={() => setTermsLayout('horizontal_2col')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  termsLayout === 'horizontal_2col' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="2-Columns Horizontal layout for Terms"
              >
                2-Cols (Horizontal)
              </button>
              <button
                type="button"
                onClick={() => setTermsLayout('horizontal_3col')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  termsLayout === 'horizontal_3col' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="3-Columns Compact layout for Terms"
              >
                3-Cols
              </button>
              <button
                type="button"
                onClick={() => setTermsLayout('single_col')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  termsLayout === 'single_col' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Single column list for Terms"
              >
                List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Canvas Container with Center Alignment & Responsive Scroll */}
      <div className="flex-1 overflow-x-auto flex justify-center p-2 md:p-6 bg-slate-950/60">
        <div 
          ref={printRef}
          className={`printable-area ${
            template === 'TECHNO_COMMERCIAL' || template === 'SERVICE_ORDER' || (template === 'OFFICIAL_PAD' && shouldSplitToPage2)
              ? 'multi-page-doc w-[794px] bg-transparent shadow-none overflow-visible mx-auto space-y-6 print:space-y-0' 
              : 'bg-white text-slate-900 shadow-2xl rounded-xl overflow-hidden relative mx-auto'
          } ${
            template === 'THERMAL_POS' ? 'w-[360px]' : 'w-[794px]'
          }`}
          style={{
            width: template === 'THERMAL_POS' ? '360px' : '794px',
            minHeight: template === 'THERMAL_POS' ? 'auto' : '1123px',
            height: 'auto',
          }}
        >
          {watermark !== 'NONE' && template !== 'THERMAL_POS' && template !== 'TECHNO_COMMERCIAL' && template !== 'SERVICE_ORDER' && !(template === 'OFFICIAL_PAD' && shouldSplitToPage2) && (
            <div className="absolute top-4 right-4 print:top-2 print:right-2 font-black uppercase text-[10px] tracking-wider px-2.5 py-0.5 rounded border border-slate-800 text-slate-800 bg-slate-50/90 z-20">
              {watermark}
            </div>
          )}

          {/* TEMPLATE: SERVICE ORDER / WORK ORDER */}
          {template === 'SERVICE_ORDER' && (
            <ServiceOrderTemplate
              invoice={effectiveInvoice}
              businessProfile={businessProfile}
              watermark={watermark}
              watermarkVisual={watermarkVisual}
              showCenterWatermark={showCenterWatermark}
              showPadBg={showPadBg}
              headerOffset={headerOffset}
              footerOffset={footerOffset}
              cardOpacity={cardOpacity}
              contentScale={contentScale}
              verticalAlignment={verticalAlignment}
              termsPageBreak={termsPageBreak}
              previewZoom={previewZoom}
            />
          )}

          {/* TEMPLATE: TECHNO-COMMERCIAL INDUSTRIAL OFFER (PRINT ON OFFICIAL LETTER PAD) */}
          {template === 'TECHNO_COMMERCIAL' && (
            <TechnoCommercialOfferTemplate
              invoice={effectiveInvoice}
              businessProfile={businessProfile}
              watermark={watermark}
              watermarkVisual={watermarkVisual}
              showCenterWatermark={showCenterWatermark}
              showPadBg={showPadBg}
              headerOffset={headerOffset}
              footerOffset={footerOffset}
              contentScale={contentScale}
              verticalAlignment={verticalAlignment}
              termsLayout={termsLayout}
              termsPageBreak={termsPageBreak}
              cardOpacity={cardOpacity}
            />
          )}

          {/* TEMPLATE 0: OFFICIAL BILL PAD / LETTERHEAD PRINT */}
          {template === 'OFFICIAL_PAD' && (
            <>
              {/* PAGE 1: PRIMARY INVOICE / QUOTATION DOCUMENT */}
              <div 
                className="a4-page relative font-sans text-xs text-slate-900 leading-relaxed h-[1123px] max-h-[1123px] overflow-hidden flex flex-col justify-between shadow-2xl print:shadow-none bg-white rounded-xl print:rounded-none"
                style={{
                  height: '1123px',
                  maxHeight: '1123px',
                  paddingTop: `${headerOffset}px`,
                  paddingBottom: `${footerOffset}px`,
                  paddingLeft: '38px',
                  paddingRight: '38px',
                  boxSizing: 'border-box',
                }}
              >
              {/* Background Bill Pad Graphic */}
              {showPadBg && (
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                  <img
                    src={businessProfile.billPadUrl || 'https://lh3.googleusercontent.com/d/1XMbVyXZXJ4DsVd_wfJViJ1sooBv3brJ2'}
                    alt="Official Bill Pad"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-fill select-none pointer-events-none"
                    style={{
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                      imageRendering: 'auto',
                    }}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('thumbnail')) {
                        target.src = 'https://drive.google.com/thumbnail?id=1XMbVyXZXJ4DsVd_wfJViJ1sooBv3brJ2&sz=w2000';
                      }
                    }}
                  />
                </div>
              )}

              {/* Big Centered Diagonal Watermark (Visible in Middle of the Pad if chosen) */}
              {showCenterWatermark && watermark !== 'NONE' && !watermark.toLowerCase().includes('ansari') && (
                <div className="absolute inset-0 pointer-events-none z-5 flex items-center justify-center overflow-hidden">
                  <div 
                    className="select-none text-center font-black tracking-widest uppercase pointer-events-none watermark-print-visible transition-all"
                    style={{
                      transform: 'rotate(-30deg)',
                      fontSize: watermark.length > 20 ? '3.5rem' : watermark.length > 14 ? '4.5rem' : '5.8rem',
                      lineHeight: 1.05,
                      maxWidth: '92%',
                      letterSpacing: '0.14em',
                      color: watermarkVisual === 'DARK'
                        ? 'rgba(15, 23, 42, 0.85)'
                        : watermarkVisual === 'BOLD'
                        ? 'rgba(15, 23, 42, 0.65)'
                        : watermarkVisual === 'LIGHT'
                        ? 'rgba(15, 23, 42, 0.22)'
                        : 'rgba(15, 23, 42, 0.45)', // CLEAR (Clear & Crisp in Print)
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  >
                    {watermark}
                  </div>
                </div>
              )}

              {/* Main Content Overlaid on Pad - Formatted in the exact Suhel Engineering Letterhead Model */}
              <div 
                className={`relative z-10 w-full mx-auto ${
                  verticalAlignment === 'center' ? 'my-auto flex-1 flex flex-col justify-center' : ''
                }`}
                style={{
                  transform: contentScale !== 100 ? `scale(${contentScale / 100})` : undefined,
                  transformOrigin: verticalAlignment === 'center' ? 'center center' : 'top center',
                }}
              >
                
                {/* 1. TOP HEADER BANNER: TAX INVOICE */}
                <div className={`w-full border border-slate-900 ${contentCardBg} py-0.5 text-center`}>
                  <span className="font-black text-xs md:text-[13px] text-slate-950 uppercase tracking-widest">
                    {getDocumentTypeName(invoice.documentType)}
                  </span>
                </div>

                {/* 2. PARTY INFO & INVOICE METADATA GRID */}
                <div className={`w-full border border-slate-900 border-t-0 text-[10px] grid grid-cols-12 ${contentCardBg} leading-tight`}>
                  
                  {/* Left Column: BILL TO (7 cols) */}
                  <div className="col-span-7 p-2 border-r border-slate-900 space-y-0.5 overflow-hidden">
                    <div className="font-extrabold text-[10.5px] text-slate-950 uppercase tracking-wide">
                      {effectiveInvoice.documentType === 'PURCHASE_BILL' || effectiveInvoice.documentType === 'PURCHASE_ESTIMATE' ? 'SUPPLIER / VENDOR DETAILS' : 'BILL TO'}
                    </div>
                    <div className="font-black text-xs text-slate-950 uppercase pt-0.5 truncate">
                      {effectiveInvoice.partyName || 'CASH CUSTOMER'}
                    </div>
                    {effectiveInvoice.partyAddress && effectiveInvoice.partyAddress.trim() !== '' && (
                      <div className="text-slate-800 text-[9.5px] leading-tight break-words">
                        Address. {effectiveInvoice.partyAddress.trim()}
                      </div>
                    )}
                    {effectiveInvoice.partyCity && effectiveInvoice.partyCity.trim() !== '' && (
                      <div className="text-slate-800 text-[9.5px] truncate">
                        City. {effectiveInvoice.partyCity.trim()}
                      </div>
                    )}
                    {resolvedPartyStateInfo.stateName && (
                      <div className="text-slate-800 text-[9.5px] truncate">
                        State. {resolvedPartyStateInfo.stateName}
                      </div>
                    )}
                    {resolvedPartyStateInfo.stateCode && (
                      <div className="text-slate-800 text-[9.5px] truncate">
                        State Code. <span className="font-mono font-bold text-slate-950">{resolvedPartyStateInfo.stateCode}</span>
                      </div>
                    )}
                    {effectiveInvoice.partyPincode && effectiveInvoice.partyPincode.trim() !== '' && (
                      <div className="text-slate-800 text-[9.5px] truncate">
                        Pincode. {effectiveInvoice.partyPincode.trim()}
                      </div>
                    )}
                    {effectiveInvoice.partyGstin && effectiveInvoice.partyGstin.trim() !== '' ? (
                      <div className="text-slate-950 font-bold text-[9.5px] pt-0.5">
                        GSTIN : <span className="font-mono font-bold">{effectiveInvoice.partyGstin.trim()}</span>
                      </div>
                    ) : (
                      <div className="text-slate-700 font-medium text-[9px] pt-0.5">
                        GSTIN : <span className="font-mono text-slate-600">URP / Unregistered</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: INVOICE / QUOTATION METADATA TABLE (5 cols) */}
                  <div className="col-span-5 text-[9.5px] flex flex-col justify-start divide-y divide-slate-900 overflow-hidden">
                    {(() => {
                      const metaRows: { label: string; val: string; isMono?: boolean; isBold?: boolean }[] = [];

                      if (isQuotation) {
                        metaRows.push({
                          label: 'QUOTATION NO.',
                          val: effectiveInvoice.invoiceNumber || 'QTN-2026-001',
                          isMono: true,
                          isBold: true,
                        });
                        if (effectiveInvoice.date) {
                          metaRows.push({
                            label: 'QUOTATION DATE.',
                            val: effectiveInvoice.date,
                            isMono: false,
                            isBold: false,
                          });
                        }
                        if (effectiveInvoice.rfqNumber?.trim() || effectiveInvoice.serviceNumber?.trim()) {
                          metaRows.push({
                            label: 'REF / RFQ NO.',
                            val: (effectiveInvoice.rfqNumber || effectiveInvoice.serviceNumber)!.trim(),
                            isMono: true,
                            isBold: false,
                          });
                        }
                        if (effectiveInvoice.validUntil?.trim() || effectiveInvoice.validityDays) {
                          metaRows.push({
                            label: 'VALIDITY TILL.',
                            val: effectiveInvoice.validUntil || `${effectiveInvoice.validityDays} Days`,
                            isMono: false,
                            isBold: false,
                          });
                        }
                        if (effectiveInvoice.quotationStatus?.trim()) {
                          metaRows.push({
                            label: 'STATUS / TERMS.',
                            val: effectiveInvoice.quotationStatus.trim(),
                            isMono: false,
                            isBold: true,
                          });
                        }
                      } else {
                        metaRows.push({
                          label: effectiveInvoice.documentType === 'PURCHASE_ESTIMATE' ? 'PURCHASE ESTIMATE NO.' : effectiveInvoice.documentType === 'SERVICE_ORDER' ? 'SERVICE ORDER NO.' : 'INVOICE NO.',
                          val: effectiveInvoice.invoiceNumber || '06(25-26)',
                          isMono: true,
                          isBold: true,
                        });
                        if (effectiveInvoice.date) {
                          metaRows.push({
                            label: effectiveInvoice.documentType === 'PURCHASE_ESTIMATE' ? 'ESTIMATE DATE.' : effectiveInvoice.documentType === 'SERVICE_ORDER' ? 'ORDER DATE.' : 'INVOICE DATE.',
                            val: effectiveInvoice.date,
                            isMono: false,
                            isBold: false,
                          });
                        }
                        // Conditional Service Number: only print when entered
                        if (effectiveInvoice.serviceNumber && effectiveInvoice.serviceNumber.trim() !== '' && effectiveInvoice.documentType !== 'SERVICE_ORDER') {
                          metaRows.push({
                            label: 'SARVICE NO.',
                            val: effectiveInvoice.serviceNumber.trim(),
                            isMono: true,
                            isBold: false,
                          });
                        }
                        // Conditional Service Date: only print when entered
                        if (effectiveInvoice.serviceDate && effectiveInvoice.serviceDate.trim() !== '' && effectiveInvoice.documentType !== 'SERVICE_ORDER') {
                          metaRows.push({
                            label: 'SARVICE DATE.',
                            val: effectiveInvoice.serviceDate.trim(),
                            isMono: false,
                            isBold: false,
                          });
                        }
                        // Conditional PO / WO Reference
                        if (effectiveInvoice.workOrderRef && effectiveInvoice.workOrderRef.trim() !== '') {
                          metaRows.push({
                            label: 'PO / WO REF.',
                            val: effectiveInvoice.workOrderRef.trim(),
                            isMono: true,
                            isBold: false,
                          });
                        }
                        // Conditional Site Location
                        if (effectiveInvoice.siteLocation && effectiveInvoice.siteLocation.trim() !== '') {
                          metaRows.push({
                            label: 'SITE LOCATION.',
                            val: effectiveInvoice.siteLocation.trim(),
                            isMono: false,
                            isBold: false,
                          });
                        }
                        // Conditional Running Bill: only print when entered
                        if (effectiveInvoice.runningBill && effectiveInvoice.runningBill.trim() !== '') {
                          metaRows.push({
                            label: 'RUNNING BILL.',
                            val: effectiveInvoice.runningBill.trim(),
                            isMono: false,
                            isBold: true,
                          });
                        }
                      }

                      return metaRows.map((row, rIdx) => (
                        <div key={rIdx} className="grid grid-cols-12 flex-1 items-center min-h-[21px]">
                          <div className="col-span-6 p-1 px-1.5 font-bold text-slate-950 border-r border-slate-900 truncate">
                            {row.label}
                          </div>
                          <div className={`col-span-6 p-1 px-1.5 text-slate-950 truncate ${row.isMono ? 'font-mono' : ''} ${row.isBold ? 'font-black' : 'font-semibold'}`}>
                            {row.val}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Optional Quotation Subject / Scope of Work Banner */}
                {(invoice.quotationSubject || invoice.scopeOfWork) && (
                  <div className={`w-full border border-slate-900 border-t-0 text-[9.5px] px-2 py-1 ${contentCardBg} flex items-center gap-1.5 overflow-hidden`}>
                    <span className="font-extrabold text-slate-950 uppercase tracking-wide shrink-0">SCOPE / SUBJECT:</span>
                    <span className="font-bold text-slate-900 truncate">{invoice.scopeOfWork || invoice.quotationSubject}</span>
                  </div>
                )}

                {/* 3. ITEMS TABLE WITH LIGHT BLUE HEADER & STRICT FIXED WIDTHS (EXACT 100%) */}
                <div className={`w-full border border-slate-900 border-t-0 ${contentCardBg} overflow-hidden`}>
                  <table className="w-full text-center text-[9.5px] border-collapse table-fixed">
                    {isNonGstBill ? (
                      <colgroup>
                        <col style={{ width: '6%' }} />
                        <col style={{ width: showHsnColumn ? '46%' : '56%' }} />
                        {showHsnColumn && <col style={{ width: '10%' }} />}
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '18%' }} />
                      </colgroup>
                    ) : invoice.isInterState || (effectiveIgstTotal > 0 && effectiveCgstTotal === 0) ? (
                      <colgroup>
                        <col style={{ width: '5%' }} />
                        <col style={{ width: showHsnColumn ? '29%' : '38%' }} />
                        {showHsnColumn && <col style={{ width: '9%' }} />}
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '7%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '12%' }} />
                      </colgroup>
                    ) : (
                      <colgroup>
                        <col style={{ width: '4%' }} />
                        <col style={{ width: showHsnColumn ? '27%' : '35%' }} />
                        {showHsnColumn && <col style={{ width: '8%' }} />}
                        <col style={{ width: '5%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '10%' }} />
                      </colgroup>
                    )}
                    <thead>
                      <tr className="bg-[#dce6f1] text-slate-950 font-bold border-b border-slate-900 text-center uppercase tracking-tight">
                        <th className="py-1 px-0.5 border-r border-slate-900 text-center text-[8.5px]">SL</th>
                        <th className="py-1 px-1.5 border-r border-slate-900 text-left text-[8.5px]">ITEMS DESCRIPTION</th>
                        {showHsnColumn && (
                          <th className="py-1 px-0.5 border-r border-slate-900 text-center font-mono text-[8.5px]">
                            {invoice.documentType === 'SERVICE_ORDER' ? 'SAC CODE' : 'HSN/SAC'}
                          </th>
                        )}
                        <th className="py-1 px-0.5 border-r border-slate-900 text-center text-[8.5px]">UOM</th>
                        <th className="py-1 px-0.5 border-r border-slate-900 text-center text-[8.5px]">QNY</th>
                        <th className="py-1 px-1 border-r border-slate-900 text-center text-[8.5px]">RATE</th>
                        <th className={`py-1 px-1 ${isNonGstBill ? '' : 'border-r border-slate-900'} text-center text-[8.5px]`}>AMOUNT</th>
                        {!isNonGstBill && (
                          invoice.isInterState || (effectiveIgstTotal > 0 && effectiveCgstTotal === 0) ? (
                            <th className="py-1 px-1 border-r border-slate-900 text-center text-[8.5px]">
                              IGST {primaryTaxRate}%
                            </th>
                          ) : (
                            <>
                              <th className="py-1 px-0.5 border-r border-slate-900 text-center text-[8.5px]">
                                CGST {halfTaxRate}%
                              </th>
                              <th className="py-1 px-0.5 border-r border-slate-900 text-center text-[8.5px]">
                                {utOrSgstLabel} {halfTaxRate}%
                              </th>
                            </>
                          )
                        )}
                        {!isNonGstBill && (
                          <th className="py-1 px-1 text-center text-[8.5px]">TOTAL</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 font-medium">
                      {/* Active Items */}
                      {invoice.items.map((item, idx) => {
                        const itemTaxRate = item.taxRate || primaryTaxRate;
                        const itemHalfRate = itemTaxRate / 2;
                        const itemCgst = item.cgstAmount || (item.taxableAmount * (itemHalfRate / 100));
                        const itemUgstOrSgst = isUT 
                          ? (item.ugstAmount || item.sgstAmount || (item.taxableAmount * (itemHalfRate / 100)))
                          : (item.sgstAmount || (item.taxableAmount * (itemHalfRate / 100)));
                        const itemIgst = item.igstAmount || (item.taxableAmount * (itemTaxRate / 100));
                        const itemAmountVal = isNonGstBill 
                          ? (item.totalAmount || item.taxableAmount || (item.quantity * item.rate))
                          : item.taxableAmount;

                        return (
                          <tr key={item.id || idx} className="h-6">
                            <td className="py-0.5 px-0.5 text-center font-mono border-r border-slate-900 text-slate-800 text-[9px] overflow-hidden">{idx + 1}</td>
                            <td className="py-0.5 px-1.5 border-r border-slate-900 text-left overflow-hidden">
                              <span className="font-bold text-slate-950 uppercase text-[9px] block truncate leading-tight text-left">{item.name}</span>
                              {item.description && <span className="text-[8px] text-slate-600 block leading-tight truncate text-left">{item.description}</span>}
                            </td>
                            {showHsnColumn && (
                              <td className="py-0.5 px-0.5 text-center font-mono border-r border-slate-900 text-slate-900 text-[9px] overflow-hidden">
                                {item.hsnCode && item.hsnCode.trim() !== '' ? item.hsnCode.trim() : ''}
                              </td>
                            )}
                            <td className="py-0.5 px-0.5 text-center font-semibold border-r border-slate-900 text-slate-900 text-[9px] overflow-hidden">{item.unit || 'MT'}</td>
                            <td className="py-0.5 px-0.5 text-center font-mono font-semibold border-r border-slate-900 text-slate-950 text-[9px] overflow-hidden">{item.quantity}</td>
                            <td className="py-0.5 px-1 text-center font-mono border-r border-slate-900 text-slate-900 text-[8.5px] tabular-nums tracking-tighter overflow-hidden">{formatIndianCurrency(item.rate, true)}</td>
                            <td className={`py-0.5 px-1 text-center font-mono ${isNonGstBill ? 'font-bold text-slate-950' : 'font-semibold text-slate-950 border-r border-slate-900'} text-[8.5px] tabular-nums tracking-tighter overflow-hidden`}>
                              {formatIndianCurrency(itemAmountVal, true)}
                            </td>
                            {!isNonGstBill && (
                              invoice.isInterState || (effectiveIgstTotal > 0 && effectiveCgstTotal === 0) ? (
                                <td className="py-0.5 px-1 text-center font-mono border-r border-slate-900 text-slate-900 text-[8.5px] tabular-nums tracking-tighter overflow-hidden">{formatIndianCurrency(itemIgst, true)}</td>
                              ) : (
                                <>
                                  <td className="py-0.5 px-0.5 text-center font-mono border-r border-slate-900 text-slate-900 text-[8.5px] tabular-nums tracking-tighter overflow-hidden">{formatIndianCurrency(itemCgst, true)}</td>
                                  <td className="py-0.5 px-0.5 text-center font-mono border-r border-slate-900 text-slate-900 text-[8.5px] tabular-nums tracking-tighter overflow-hidden">{formatIndianCurrency(itemUgstOrSgst, true)}</td>
                                </>
                              )
                            )}
                            {!isNonGstBill && (
                              <td className="py-0.5 px-1 text-center font-mono font-bold text-slate-950 text-[8.5px] tabular-nums tracking-tighter overflow-hidden">{formatIndianCurrency(item.totalAmount, true)}</td>
                            )}
                          </tr>
                        );
                      })}

                      {/* TOTAL AMOUNT ROW */}
                      <tr className="bg-[#dce6f1] text-slate-950 font-bold border-t border-slate-900 text-[9px]">
                        <td colSpan={showHsnColumn ? (isNonGstBill ? 6 : 6) : (isNonGstBill ? 5 : 5)} className="py-1 px-2 text-center uppercase tracking-wider font-extrabold border-r border-slate-900">
                          TOTAL AMOUNT
                        </td>
                        <td className={`py-1 px-1 text-center font-mono font-black ${isNonGstBill ? '' : 'border-r border-slate-900'} text-slate-950 tabular-nums tracking-tighter overflow-hidden`}>
                          {formatIndianCurrency(isNonGstBill ? invoice.grandTotal : invoice.taxableTotal, true)}
                        </td>
                        {!isNonGstBill && (
                          invoice.isInterState || (effectiveIgstTotal > 0 && effectiveCgstTotal === 0) ? (
                            <td className="py-1 px-1 text-center font-mono font-black border-r border-slate-900 text-slate-950 tabular-nums tracking-tighter overflow-hidden">
                              {formatIndianCurrency(effectiveIgstTotal, true)}
                            </td>
                          ) : (
                            <>
                              <td className="py-1 px-0.5 text-center font-mono font-black border-r border-slate-900 text-slate-950 tabular-nums tracking-tighter overflow-hidden">
                                {formatIndianCurrency(effectiveCgstTotal, true)}
                              </td>
                              <td className="py-1 px-0.5 text-center font-mono font-black border-r border-slate-900 text-slate-950 tabular-nums tracking-tighter overflow-hidden">
                                {formatIndianCurrency(isUT ? effectiveUgstTotal : effectiveSgstTotal, true)}
                              </td>
                            </>
                          )
                        )}
                        {!isNonGstBill && (
                          <td className="py-1 px-1 text-center font-mono font-black text-slate-950 tabular-nums tracking-tighter overflow-hidden">
                            {formatIndianCurrency(invoice.grandTotal, true)}
                          </td>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. INVOICE TOTAL & AMOUNT IN WORDS */}
                <div className={`w-full border border-slate-900 border-t-0 text-[9px] ${contentCardBg}`}>
                  {/* Row 1 (UPAR): Tax Value in Words & TOTAL TAX VALUE - Only show when GST is applicable */}
                  {!isNonGstBill && (
                    <div className="grid grid-cols-12 bg-[#dce6f1]/25 border-b border-slate-900">
                      <div className="col-span-7 p-1 px-2 border-r border-slate-900 flex items-center overflow-hidden">
                        <span className="font-bold text-slate-950 mr-1 shrink-0">Tax Value (In words) : </span>
                        <span className="font-semibold text-slate-950 leading-tight truncate">
                          {numberToIndianWords(effectiveTotalTax)}
                        </span>
                      </div>
                      <div className="col-span-2 p-1 px-1 font-black text-slate-950 border-r border-slate-900 text-right flex items-center justify-end text-[8.5px] truncate bg-[#dce6f1]/60">
                        TOTAL TAX VALUE
                      </div>
                      <div className="col-span-3 p-1 px-1 font-mono font-black text-slate-950 text-right flex items-center justify-end tabular-nums tracking-tighter overflow-hidden text-[9.5px] bg-[#dce6f1]/60">
                        {formatIndianCurrency(effectiveTotalTax, true)}
                      </div>
                    </div>
                  )}

                  {/* Row 2 (NICHE): Invoice / Quotation / Bill Value in Words & TOTAL VALUE */}
                  <div className="grid grid-cols-12 bg-[#dce6f1]/40">
                    <div className="col-span-7 p-1 px-2 border-r border-slate-900 flex items-center overflow-hidden">
                      <span className="font-bold text-slate-950 mr-1 shrink-0">
                        {isQuotation ? 'Quotation Value (In words) : ' : isPurchaseBill ? 'Bill Value (In words) : ' : 'Invoice Value (In words) : '}
                      </span>
                      <span className="font-black text-slate-950 leading-tight truncate">
                        {numberToIndianWords(invoice.grandTotal)}
                      </span>
                    </div>
                    <div className="col-span-2 p-1 px-1 font-black text-slate-950 border-r border-slate-900 text-right flex items-center justify-end text-[8.5px] truncate bg-[#dce6f1]/85">
                      {isQuotation ? 'TOTAL QUOTATION VALUE' : isPurchaseBill ? 'TOTAL BILL VALUE' : 'TOTAL INVOICE VALUE'}
                    </div>
                    <div className="col-span-3 p-1 px-1 font-mono font-black text-slate-950 text-right flex items-center justify-end tabular-nums tracking-tighter overflow-hidden text-[9.5px] bg-[#dce6f1]/85">
                      {formatIndianCurrency(invoice.grandTotal, true)}
                    </div>
                  </div>
                </div>

                {/* 5. BANK DETAILS, TERMS & CONDITIONS & AUTHORISED SIGNATORY */}
                {shouldSplitToPage2 ? (
                  /* When Terms are on Page 2 (Annexure), Page 1 bottom is optimized for Bank Details & Signatory */
                  <div className={`w-full border border-slate-900 border-t-0 grid grid-cols-12 text-[9px] ${contentCardBg}`}>
                    {/* Left: BANK DETAILS (7 cols) or DECLARATION / NOTES if Service Order / Quotation */}
                    {(!isQuotation && invoice.documentType !== 'SERVICE_ORDER') ? (
                      <div className="col-span-7 p-2 border-r border-slate-900 flex flex-col justify-between overflow-hidden">
                        <div>
                          <div className="font-black text-slate-950 uppercase tracking-wider mb-1 text-[9px] border-b border-slate-900 pb-0.5">
                            {invoice.documentType === 'PURCHASE_BILL' && (invoice.buyerAccountDetails?.accountNumber || invoice.buyerAccountDetails?.bankName) ? 'BUYER BANK ACCOUNT DETAILS:' : 'BANK ACCOUNT DETAILS:'}
                          </div>
                          <div className="space-y-0.5 text-[8.5px] leading-tight text-slate-950">
                            <div className="flex items-baseline">
                              <span className="text-slate-600 font-bold w-18 shrink-0">Bank Name:</span>
                              <span className="font-extrabold text-slate-950 truncate">
                                {invoice.buyerAccountDetails?.bankName || businessProfile.bankName || 'HDFC Bank Ltd.'}
                              </span>
                            </div>
                            <div className="flex items-baseline">
                              <span className="text-slate-600 font-bold w-18 shrink-0">A/C No:</span>
                              <span className="font-mono font-black text-slate-950 tracking-wider truncate">
                                {invoice.buyerAccountDetails?.accountNumber || businessProfile.accountNumber || '50200084729103'}
                              </span>
                            </div>
                            <div className="flex items-baseline">
                              <span className="text-slate-600 font-bold w-18 shrink-0">IFSC Code:</span>
                              <span className="font-mono font-black text-slate-950 truncate">
                                {invoice.buyerAccountDetails?.ifscCode || businessProfile.ifscCode || 'HDFC0001042'}
                              </span>
                            </div>
                            {(invoice.buyerAccountDetails?.branchName || businessProfile.branchName) && (
                              <div className="flex items-baseline">
                                <span className="text-slate-600 font-bold w-18 shrink-0">Branch:</span>
                                <span className="font-semibold text-slate-900 truncate">
                                  {invoice.buyerAccountDetails?.branchName || businessProfile.branchName}
                                </span>
                              </div>
                            )}
                            <div className="flex items-baseline">
                              <span className="text-slate-600 font-bold w-18 shrink-0">A/C Name:</span>
                              <span className="font-bold text-slate-950 truncate">
                                {invoice.buyerAccountDetails?.accountHolderName || businessProfile.accountHolderName || businessProfile.name || businessProfile.tradeName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="col-span-7 p-2 border-r border-slate-900 flex flex-col justify-between overflow-hidden">
                        <div>
                          <div className="font-black text-slate-950 uppercase tracking-wider mb-1 text-[9px] border-b border-slate-900 pb-0.5">
                            DECLARATION &amp; NOTES:
                          </div>
                          <p className="text-[8px] text-slate-800 leading-snug">
                            {invoice.notes || 'We declare that this document shows the actual price of the goods/services described and that all particulars are true and correct.'}
                          </p>
                        </div>
                        <div className="text-[7px] text-slate-500 italic mt-1 pt-0.5 border-t border-slate-200">
                          * Annexure attached for detailed terms and specifications.
                        </div>
                      </div>
                    )}

                    {/* Right: AUTHORISED SIGNATORY (5 cols) */}
                    <div className="col-span-5 p-2 flex flex-col justify-between items-center text-center overflow-hidden">
                      <div className="font-bold text-slate-950 uppercase text-[8.5px] tracking-wide truncate w-full">
                        FOR, {businessProfile.name || businessProfile.tradeName || 'SR GROUP'}
                      </div>
                      
                      {/* Signature Space / Digital Signature */}
                      <div className="my-1 py-0.5 text-center min-h-[30px] flex items-center justify-center">
                        {businessProfile.signatureUrl ? (
                          <img 
                            src={businessProfile.signatureUrl} 
                            alt="Signature" 
                            className="max-h-7 object-contain mix-blend-multiply" 
                          />
                        ) : (
                          <div className="h-6"></div>
                        )}
                      </div>

                      <div className="border-t border-slate-600 w-32 pt-0.5 text-center">
                        <span className="text-[8px] font-bold text-slate-950 block uppercase tracking-wider">Authorised Signatory</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Single Page Mode: If Quotation / Service Order, render 8 cols Terms + 4 cols Signatory (No Bank Details) */
                  (!isQuotation && invoice.documentType !== 'SERVICE_ORDER') ? (
                    <div className={`w-full border border-slate-900 border-t-0 grid grid-cols-12 text-[9px] ${contentCardBg}`}>
                      
                      {/* Left: BANK DETAILS (5 cols) */}
                      <div className="col-span-5 p-2 border-r border-slate-900 flex flex-col justify-between overflow-hidden">
                        <div>
                          <div className="font-black text-slate-950 uppercase tracking-wider mb-1 text-[9px] border-b border-slate-900 pb-0.5">
                            {invoice.documentType === 'PURCHASE_BILL' && (invoice.buyerAccountDetails?.accountNumber || invoice.buyerAccountDetails?.bankName) ? 'BUYER BANK ACCOUNT DETAILS:' : 'BANK ACCOUNT DETAILS:'}
                          </div>
                          <div className="space-y-0.5 text-[8.5px] leading-tight text-slate-950">
                            <div className="flex items-baseline">
                              <span className="text-slate-600 font-bold w-18 shrink-0">Bank Name:</span>
                              <span className="font-extrabold text-slate-950 truncate">
                                {invoice.buyerAccountDetails?.bankName || businessProfile.bankName || 'HDFC Bank Ltd.'}
                              </span>
                            </div>
                            <div className="flex items-baseline">
                              <span className="text-slate-600 font-bold w-18 shrink-0">A/C No:</span>
                              <span className="font-mono font-black text-slate-950 tracking-wider truncate">
                                {invoice.buyerAccountDetails?.accountNumber || businessProfile.accountNumber || '50200084729103'}
                              </span>
                            </div>
                            <div className="flex items-baseline">
                              <span className="text-slate-600 font-bold w-18 shrink-0">IFSC Code:</span>
                              <span className="font-mono font-black text-slate-950 truncate">
                                {invoice.buyerAccountDetails?.ifscCode || businessProfile.ifscCode || 'HDFC0001042'}
                              </span>
                            </div>
                            {(invoice.buyerAccountDetails?.branchName || businessProfile.branchName) && (
                              <div className="flex items-baseline">
                                <span className="text-slate-600 font-bold w-18 shrink-0">Branch:</span>
                                <span className="font-semibold text-slate-900 truncate">
                                  {invoice.buyerAccountDetails?.branchName || businessProfile.branchName}
                                </span>
                              </div>
                            )}
                            <div className="flex items-baseline">
                              <span className="text-slate-600 font-bold w-18 shrink-0">A/C Name:</span>
                              <span className="font-bold text-slate-950 truncate">
                                {invoice.buyerAccountDetails?.accountHolderName || businessProfile.accountHolderName || businessProfile.name || businessProfile.tradeName}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-[7px] text-slate-600 font-mono italic pt-1 border-t border-slate-200 mt-1">
                          * Remit payment via Direct RTGS / NEFT / IMPS
                        </div>
                      </div>

                      {/* Middle: TERMS & CONDITIONS (4 cols) */}
                      <div className="col-span-4 p-2 border-r border-slate-900 flex flex-col justify-between overflow-hidden">
                        <div>
                          <div className="font-black text-slate-950 uppercase tracking-wider mb-1 text-[9px] border-b border-slate-900 pb-0.5">
                            TERMS &amp; CONDITIONS:
                          </div>
                          <div className="space-y-0.5 text-[7.5px] text-slate-900 leading-tight font-medium pr-1">
                            {parsedTermsList.map((term, index) => (
                              <div key={index} className="flex items-start gap-1">
                                <span className="font-bold font-mono text-[7px] text-slate-950">{index + 1}.</span>
                                <span className="leading-snug">{term}</span>
                              </div>
                            ))}
                          </div>
                          {invoice.notes && (
                            <div className="mt-1 pt-0.5 border-t border-slate-200 text-[7px] text-slate-700">
                              <strong className="text-slate-900">Note: </strong>{invoice.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-[7px] text-slate-500 italic mt-1 pt-0.5 border-t border-slate-200 flex justify-between">
                          <span>* E. &amp; O.E.</span>
                          <span>Local Jurisdiction</span>
                        </div>
                      </div>

                      {/* Right: AUTHORISED SIGNATORY (3 cols) */}
                      <div className="col-span-3 p-2 flex flex-col justify-between items-center text-center overflow-hidden">
                        <div className="font-bold text-slate-950 uppercase text-[8.5px] tracking-wide truncate w-full">
                          FOR, {businessProfile.name || businessProfile.tradeName || 'SR GROUP'}
                        </div>
                        
                        {/* Signature Space / Digital Signature */}
                        <div className="my-1 py-0.5 text-center min-h-[30px] flex items-center justify-center">
                          {businessProfile.signatureUrl ? (
                            <img 
                              src={businessProfile.signatureUrl} 
                              alt="Signature" 
                              className="max-h-7 object-contain mix-blend-multiply" 
                            />
                          ) : (
                            <div className="h-6"></div>
                          )}
                        </div>

                        <div className="border-t border-slate-600 w-28 pt-0.5 text-center">
                          <span className="text-[8px] font-bold text-slate-950 block uppercase tracking-wider">Authorised Signatory</span>
                        </div>
                      </div>

                    </div>
                  ) : (
                    /* Clean No-Bank-Details Mode for Quotations and Service Orders */
                    <div className={`w-full border border-slate-900 border-t-0 grid grid-cols-12 text-[9px] ${contentCardBg}`}>
                      
                      {/* Left: TERMS & CONDITIONS (8 cols) */}
                      <div className="col-span-8 p-2 border-r border-slate-900 flex flex-col justify-between overflow-hidden">
                        <div>
                          <div className="font-black text-slate-950 uppercase tracking-wider mb-1 text-[9px] border-b border-slate-900 pb-0.5">
                            TERMS &amp; CONDITIONS:
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[7.5px] text-slate-900 leading-tight font-medium pr-1">
                            {parsedTermsList.map((term, index) => (
                              <div key={index} className="flex items-start gap-1">
                                <span className="font-bold font-mono text-[7px] text-slate-950">{index + 1}.</span>
                                <span className="leading-snug">{term}</span>
                              </div>
                            ))}
                          </div>
                          {invoice.notes && (
                            <div className="mt-1 pt-0.5 border-t border-slate-200 text-[7px] text-slate-700">
                              <strong className="text-slate-900">Note: </strong>{invoice.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-[7px] text-slate-500 italic mt-1 pt-0.5 border-t border-slate-200 flex justify-between">
                          <span>* E. &amp; O.E.</span>
                          <span>Local Jurisdiction</span>
                        </div>
                      </div>

                      {/* Right: AUTHORISED SIGNATORY (4 cols) */}
                      <div className="col-span-4 p-2 flex flex-col justify-between items-center text-center overflow-hidden">
                        <div className="font-bold text-slate-950 uppercase text-[8.5px] tracking-wide truncate w-full">
                          FOR, {businessProfile.name || businessProfile.tradeName || 'SR GROUP'}
                        </div>
                        
                        {/* Signature Space / Digital Signature */}
                        <div className="my-1 py-0.5 text-center min-h-[30px] flex items-center justify-center">
                          {businessProfile.signatureUrl ? (
                            <img 
                              src={businessProfile.signatureUrl} 
                              alt="Signature" 
                              className="max-h-7 object-contain mix-blend-multiply" 
                            />
                          ) : (
                            <div className="h-6"></div>
                          )}
                        </div>

                        <div className="border-t border-slate-600 w-32 pt-0.5 text-center">
                          <span className="text-[8px] font-bold text-slate-950 block uppercase tracking-wider">Authorised Signatory</span>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* 6. STATUTORY FOOTER STRIP */}
                <div className="w-full border border-slate-900 border-t-0 bg-[#f8fafc] px-2.5 py-0.5 text-[7.5px] text-slate-700 flex items-center justify-between font-mono">
                  <span>Certified that the particulars given above are true and correct.</span>
                  <span className="font-bold text-slate-950">E. &amp; O.E.</span>
                </div>

              </div>
            </div>

            {/* PAGE 2: HORIZONTAL TERMS & CONDITIONS (ANNEXURE) ON OFFICIAL BILL PAD */}
            {shouldSplitToPage2 && (
              <div 
                className="a4-page relative font-sans text-xs text-slate-900 leading-relaxed h-[1123px] max-h-[1123px] overflow-hidden flex flex-col justify-between shadow-2xl print:shadow-none bg-white rounded-xl print:rounded-none"
                style={{
                  height: '1123px',
                  maxHeight: '1123px',
                  paddingTop: `${headerOffset}px`,
                  paddingBottom: `${footerOffset}px`,
                  paddingLeft: '38px',
                  paddingRight: '38px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Background Bill Pad Graphic */}
                {showPadBg && (
                  <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                    <img
                      src={businessProfile.billPadUrl || 'https://lh3.googleusercontent.com/d/1XMbVyXZXJ4DsVd_wfJViJ1sooBv3brJ2'}
                      alt="Official Bill Pad"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-fill select-none pointer-events-none"
                      style={{
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact',
                        imageRendering: 'auto',
                      }}
                    />
                  </div>
                )}

                {/* Big Centered Diagonal Watermark */}
                {showCenterWatermark && watermark !== 'NONE' && !watermark.toLowerCase().includes('ansari') && (
                  <div className="absolute inset-0 pointer-events-none z-5 flex items-center justify-center overflow-hidden">
                    <div 
                      className="select-none text-center font-black tracking-widest uppercase pointer-events-none watermark-print-visible transition-all"
                      style={{
                        transform: 'rotate(-30deg)',
                        fontSize: watermark.length > 20 ? '3.5rem' : watermark.length > 14 ? '4.5rem' : '5.8rem',
                        lineHeight: 1.05,
                        maxWidth: '92%',
                        letterSpacing: '0.14em',
                        color: watermarkVisual === 'DARK'
                          ? 'rgba(15, 23, 42, 0.85)'
                          : watermarkVisual === 'BOLD'
                          ? 'rgba(15, 23, 42, 0.65)'
                          : watermarkVisual === 'LIGHT'
                          ? 'rgba(15, 23, 42, 0.22)'
                          : 'rgba(15, 23, 42, 0.45)',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact',
                      }}
                    >
                      {watermark}
                    </div>
                  </div>
                )}

                {/* Page 2 Content Container (Starts directly from top below red/blue line) */}
                <div className={`relative z-10 w-full space-y-4 ${
                  verticalAlignment === 'center' ? 'my-auto flex-1 flex flex-col justify-center' : ''
                }`}>
                  <div>
                    {/* HORIZONTAL TERMS GRID */}
                    <div>
                      {termsLayout === 'horizontal_table' ? (
                        /* Full-width Horizontal Grid Table - Clean Terms & Conditions */
                        <div className="border border-slate-400 bg-white/95 print:bg-transparent">
                          {/* Header Row */}
                          <div className="bg-slate-100/90 print:bg-transparent px-3 py-1.5 font-black text-[11px] uppercase tracking-wider text-slate-950 border-b border-slate-400">
                            <span>TERMS &amp; CONDITIONS</span>
                          </div>

                          {/* Table Row Items */}
                          <div className="divide-y divide-slate-300">
                            {parsedTermsList.map((term, index) => (
                              <div 
                                key={index} 
                                className="flex items-start px-2.5 py-1 text-[9.5px] leading-tight text-slate-950 hover:bg-slate-50 print:bg-transparent"
                              >
                                <span className="font-bold min-w-[22px] shrink-0 text-slate-950">
                                  {index + 1}.
                                </span>
                                <span className="flex-1 font-medium">
                                  {renderMarkdownText(term)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : termsLayout === 'horizontal_2col' ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10.5px] leading-snug text-slate-950">
                          {parsedTermsList.map((term, index) => (
                            <div 
                              key={index} 
                              className="flex items-start gap-2 bg-slate-50/90 print:bg-transparent p-2 rounded border border-slate-300 shadow-2xs"
                            >
                              <span className="font-black text-slate-950 min-w-[20px] text-right font-mono text-[11px]">
                                {index + 1}.
                              </span>
                              <p className="text-slate-950 font-medium leading-snug break-words">
                                {renderMarkdownText(term)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : termsLayout === 'horizontal_3col' ? (
                        <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-[9.5px] leading-snug text-slate-950">
                          {parsedTermsList.map((term, index) => (
                            <div 
                              key={index} 
                              className="flex items-start gap-1.5 bg-slate-50/90 print:bg-transparent p-1.5 rounded border border-slate-300 shadow-2xs"
                            >
                              <span className="font-black text-slate-950 min-w-[16px] font-mono text-[10px]">
                                {index + 1}.
                              </span>
                              <p className="text-slate-950 font-medium leading-snug break-words">
                                {renderMarkdownText(term)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-[10.5px] leading-relaxed text-slate-950 max-w-3xl">
                          {parsedTermsList.map((term, index) => (
                            <div key={index} className="flex items-start gap-2 bg-slate-50/90 print:bg-transparent p-1.5 rounded border border-slate-200">
                              <span className="font-black text-slate-950 min-w-[22px] font-mono">
                                {index + 1}.
                              </span>
                              <p className="text-slate-950 font-medium leading-normal break-words">
                                {renderMarkdownText(term)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Sign-off on Terms Page */}
                  <div className="pt-2 flex justify-end items-end">
                    <div className="text-right flex flex-col items-end">
                      <div className="font-bold uppercase text-[9.5px] text-slate-950 tracking-wide">
                        FOR, {businessProfile.name || businessProfile.tradeName || 'SR GROUP'}
                      </div>
                      <div className="my-0.5 min-h-[26px] flex items-center justify-end">
                        {businessProfile.signatureUrl && (
                          <img 
                            src={businessProfile.signatureUrl} 
                            alt="Signature" 
                            className="max-h-7 object-contain mix-blend-multiply" 
                          />
                        )}
                      </div>
                      <div className="border-t border-slate-700 w-32 pt-0.5 text-center">
                        <span className="text-[8.5px] font-bold text-slate-950 block uppercase tracking-wider">
                          Authorised Signatory
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </>
        )}

          {/* TEMPLATE 1: CLASSIC GOVERNMENT GST TAX INVOICE */}
          {template === 'CLASSIC_GST' && (
            <div className="relative p-6 md:p-10 font-sans text-xs text-slate-800 leading-relaxed border border-slate-300 overflow-hidden">
              
              {/* Central Diagonal Watermark */}
              {watermark !== 'NONE' && (
                <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
                  <div 
                    className="select-none text-center font-black tracking-widest uppercase pointer-events-none watermark-print-visible"
                    style={{
                      transform: 'rotate(-30deg)',
                      fontSize: watermark.length > 20 ? '3.5rem' : watermark.length > 14 ? '4.5rem' : '5.8rem',
                      lineHeight: 1.05,
                      maxWidth: '92%',
                      letterSpacing: '0.14em',
                      color: watermarkVisual === 'DARK'
                        ? 'rgba(15, 23, 42, 0.70)'
                        : watermarkVisual === 'BOLD'
                        ? 'rgba(15, 23, 42, 0.50)'
                        : watermarkVisual === 'LIGHT'
                        ? 'rgba(15, 23, 42, 0.18)'
                        : 'rgba(15, 23, 42, 0.35)',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  >
                    {watermark}
                  </div>
                </div>
              )}

              {/* Header Box */}
              <div className="relative z-10 text-center pb-4 border-b border-slate-800">
                <div className="inline-block px-4 py-0.5 bg-slate-100 font-bold uppercase tracking-widest text-slate-800 text-[11px] border border-slate-300 mb-2 rounded-xs">
                  {getDocumentTypeName(invoice.documentType)}
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-950 uppercase">{businessProfile.name}</h1>
                <p className="text-xs text-slate-600">{businessProfile.address}, {businessProfile.city}, {businessProfile.state} - {businessProfile.pincode}</p>
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold mt-1.5 text-slate-700">
                  <span>GSTIN: <strong className="font-mono text-slate-950">{businessProfile.gstin}</strong></span>
                  <span>PAN: <strong className="font-mono text-slate-950">{businessProfile.pan}</strong></span>
                  <span>Phone: {businessProfile.phone}</span>
                  <span>Email: {businessProfile.email}</span>
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-2 border-b border-slate-800 text-xs">
                
                {/* Left: Customer Details */}
                <div className="p-3.5 border-r border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Details of Receiver (Billed To):</div>
                  <div className="font-bold text-sm text-slate-900">{invoice.partyName}</div>
                  {invoice.partyAddress && <div className="text-slate-600">{invoice.partyAddress}</div>}
                  {invoice.partyCity && <div className="text-slate-600">{invoice.partyCity}</div>}
                  {(resolvedPartyStateInfo.stateName || resolvedPartyStateInfo.stateCode) && (
                    <div className="text-slate-700">
                      State: <strong className="text-slate-900">{resolvedPartyStateInfo.stateName}</strong> {resolvedPartyStateInfo.stateCode ? `(State Code: ${resolvedPartyStateInfo.stateCode})` : ''}
                    </div>
                  )}
                  {invoice.partyPincode && <div className="text-slate-600">Pincode: {invoice.partyPincode}</div>}
                  {invoice.partyGstin ? (
                    <div className="font-semibold text-slate-800">
                      GSTIN / UIN: <span className="font-mono text-blue-900 font-bold">{invoice.partyGstin}</span>
                    </div>
                  ) : (
                    <div className="text-slate-500 italic">Unregistered Consumer (B2C)</div>
                  )}
                  {invoice.partyPhone && <div className="text-slate-600">Contact: {invoice.partyPhone}</div>}
                </div>

                {/* Right: Invoice Info & E-Way */}
                <div className="p-3.5 space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Invoice No.</span>
                      <span className="font-mono font-bold text-sm text-slate-950">{invoice.invoiceNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Invoice Date</span>
                      <span className="font-semibold text-slate-900">{invoice.date}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Place of Supply</span>
                      <span className="font-semibold text-slate-900">{invoice.placeOfSupply}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Due Date</span>
                      <span className="font-semibold text-slate-900">{invoice.dueDate || invoice.date}</span>
                    </div>
                  </div>

                  {(invoice.serviceNumber || invoice.serviceDate) && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                      {invoice.serviceNumber && (
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Service No.</span>
                          <span className="font-mono font-bold text-xs text-slate-900">{invoice.serviceNumber}</span>
                        </div>
                      )}
                      {invoice.serviceDate && (
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Service Date</span>
                          <span className="font-semibold text-xs text-slate-900">{invoice.serviceDate}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {invoice.transport?.ewayBillNumber && (
                    <div className="pt-1 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 text-[9px] uppercase font-bold block">E-Way Bill No.</span>
                        <span className="font-mono font-bold text-slate-900">{invoice.transport.ewayBillNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[9px] uppercase font-bold block">Vehicle No.</span>
                        <span className="font-mono font-bold text-slate-900">{invoice.transport.vehicleNumber || '-'}</span>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 pt-1">
                    Tax Type: <strong className="text-slate-800">{invoice.isInterState ? 'Inter-State (IGST Applicable)' : (isUT ? 'Intra-State UT (CGST + UGST Applicable)' : 'Intra-State (CGST + SGST Applicable)')}</strong>
                    {invoice.isReverseCharge && <span className="ml-2 text-rose-700 font-bold">[Reverse Charge Applicable]</span>}
                  </div>
                </div>

              </div>

              {/* Line Items Table */}
              <div className="border-b border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  {!invoice.isInterState ? (
                    <colgroup>
                      <col style={{ width: '4%' }} />
                      <col style={{ width: showHsnColumn ? '25%' : '33%' }} />
                      {showHsnColumn && <col style={{ width: '8%' }} />}
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '6%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '9.5%' }} />
                      <col style={{ width: '9.5%' }} />
                      <col style={{ width: '10%' }} />
                    </colgroup>
                  ) : (
                    <colgroup>
                      <col style={{ width: '4%' }} />
                      <col style={{ width: showHsnColumn ? '30%' : '39%' }} />
                      {showHsnColumn && <col style={{ width: '9%' }} />}
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '6%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '11%' }} />
                    </colgroup>
                  )}
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-800 font-bold text-slate-900 text-[10.5px]">
                      <th className="py-2 px-1 border-r border-slate-300 text-center">#</th>
                      <th className="py-2 px-2 border-r border-slate-300">Description of Goods / Services</th>
                      {showHsnColumn && <th className="py-2 px-1 border-r border-slate-300 text-center font-mono">HSN/SAC</th>}
                      <th className="py-2 px-1 border-r border-slate-300 text-center">Qty</th>
                      <th className="py-2 px-1 border-r border-slate-300 text-right">Rate (₹)</th>
                      <th className="py-2 px-1 border-r border-slate-300 text-right">Disc %</th>
                      <th className="py-2 px-1 border-r border-slate-300 text-right">Taxable (₹)</th>
                      {!invoice.isInterState ? (
                        <>
                          <th className="py-2 px-1 border-r border-slate-300 text-right">CGST (₹)</th>
                          <th className="py-2 px-1 border-r border-slate-300 text-right">{utOrSgstLabel} (₹)</th>
                        </>
                      ) : (
                        <th className="py-2 px-1 border-r border-slate-300 text-right">IGST (₹)</th>
                      )}
                      <th className="py-2 px-1.5 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-1 border-r border-slate-300 text-center text-slate-500 font-mono text-[10.5px] overflow-hidden">{idx + 1}</td>
                        <td className="py-1.5 px-2 border-r border-slate-300 overflow-hidden">
                          <div className="font-semibold text-slate-950 text-[11px] leading-tight break-words">{item.name}</div>
                          {item.description && <div className="text-[9.5px] text-slate-500 break-words leading-tight">{item.description}</div>}
                        </td>
                        {showHsnColumn && (
                          <td className="py-1.5 px-1 border-r border-slate-300 text-center font-mono text-[10.5px] text-slate-700 overflow-hidden">
                            {item.hsnCode && item.hsnCode.trim() !== '' ? item.hsnCode.trim() : ''}
                          </td>
                        )}
                        <td className="py-1.5 px-1 border-r border-slate-300 text-center font-semibold text-slate-800 text-[10.5px] overflow-hidden">
                          {item.quantity} <span className="text-[9px] font-normal text-slate-500">{item.unit}</span>
                        </td>
                        <td className="py-1.5 px-1 border-r border-slate-300 text-right font-mono text-[10.5px] tabular-nums overflow-hidden">{formatIndianCurrency(item.rate, false)}</td>
                        <td className="py-1.5 px-1 border-r border-slate-300 text-right font-mono text-[10.5px] text-slate-600 overflow-hidden">{item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}</td>
                        <td className="py-1.5 px-1 border-r border-slate-300 text-right font-mono font-medium text-[10.5px] tabular-nums overflow-hidden">{formatIndianCurrency(item.taxableAmount, false)}</td>
                        {!invoice.isInterState ? (
                          <>
                            <td className="py-1.5 px-1 border-r border-slate-300 text-right font-mono text-[10px] tabular-nums overflow-hidden">
                              <div className="font-medium text-slate-900">{formatIndianCurrency(item.cgstAmount, false)}</div>
                              <span className="text-[8.5px] text-slate-500">({item.taxRate / 2}%)</span>
                            </td>
                            <td className="py-1.5 px-1 border-r border-slate-300 text-right font-mono text-[10px] tabular-nums overflow-hidden">
                              <div className="font-medium text-slate-900">{formatIndianCurrency(isUT ? (item.ugstAmount || item.sgstAmount) : item.sgstAmount, false)}</div>
                              <span className="text-[8.5px] text-slate-500">({item.taxRate / 2}%)</span>
                            </td>
                          </>
                        ) : (
                          <td className="py-1.5 px-1 border-r border-slate-300 text-right font-mono text-[10px] tabular-nums overflow-hidden">
                            <div className="font-medium text-slate-900">{formatIndianCurrency(item.igstAmount, false)}</div>
                            <span className="text-[8.5px] text-slate-500">({item.taxRate}%)</span>
                          </td>
                        )}
                        <td className="py-1.5 px-1.5 text-right font-mono font-bold text-slate-950 text-[10.5px] tabular-nums overflow-hidden">{formatIndianCurrency(item.totalAmount, false)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Middle Summary & Calculation Section */}
              <div className="grid grid-cols-12 border-b border-slate-800">
                
                {/* Left: Words, Payment Status & Tax Declaration (7 Cols) */}
                <div className="col-span-7 p-3.5 border-r border-slate-800 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Invoice Amount in Words:</div>
                    <div className="font-semibold text-slate-900 italic text-[11px] leading-snug mt-0.5">
                      {numberToIndianWords(invoice.grandTotal)}
                    </div>
                  </div>

                  {/* Payment Status & Declaration Section */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1">
                    <div className="font-bold text-slate-900 uppercase text-[10px] text-slate-800">Payment Status:</div>
                    <div className="text-slate-700 text-xs">
                      Amount Due: <strong className="font-mono text-slate-950">{formatIndianCurrency(invoice.balanceDue > 0 ? invoice.balanceDue : invoice.grandTotal)}</strong>
                      {invoice.balanceDue <= 0 ? (
                        <span className="ml-2 text-emerald-700 font-bold text-[10px]">[Paid in Full]</span>
                      ) : (
                        <span className="ml-2 text-amber-700 font-bold text-[10px]">[Payment Pending]</span>
                      )}
                    </div>
                    <div className="text-[9.5px] text-slate-500 italic pt-1 border-t border-slate-200">
                      Certified that all particulars given in this tax invoice are true and correct.
                    </div>
                  </div>
                </div>

                {/* Right: Bill Math Summary (5 Cols) */}
                <div className="col-span-5 p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount</span>
                    <span className="font-mono font-medium">{formatIndianCurrency(invoice.taxableTotal)}</span>
                  </div>

                  {!invoice.isInterState ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Total CGST</span>
                        <span className="font-mono font-medium">{formatIndianCurrency(invoice.cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{isUT ? 'Total UGST' : 'Total SGST'}</span>
                        <span className="font-mono font-medium">{formatIndianCurrency(isUT ? effectiveUgstTotal : effectiveSgstTotal)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>Total IGST</span>
                      <span className="font-mono font-medium">{formatIndianCurrency(invoice.igstTotal)}</span>
                    </div>
                  )}

                  {invoice.shippingCharges > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Shipping / Freight</span>
                      <span className="font-mono">{formatIndianCurrency(invoice.shippingCharges)}</span>
                    </div>
                  )}

                  {invoice.extraDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount</span>
                      <span className="font-mono">-{formatIndianCurrency(invoice.extraDiscount)}</span>
                    </div>
                  )}

                  {invoice.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Round Off</span>
                      <span className="font-mono">{invoice.roundOff > 0 ? `+${invoice.roundOff}` : invoice.roundOff}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-bold text-slate-950 pt-2 border-t-2 border-slate-800">
                    <span>Total Invoice Value</span>
                    <span className="font-mono text-base text-blue-950">{formatIndianCurrency(invoice.grandTotal)}</span>
                  </div>

                  <div className="flex justify-between text-xs font-semibold text-emerald-800 pt-1">
                    <span>Amount Received</span>
                    <span className="font-mono">{formatIndianCurrency(invoice.paidAmount)}</span>
                  </div>

                  <div className="flex justify-between text-xs font-bold text-rose-800 pt-1 border-t border-slate-200">
                    <span>Balance Due</span>
                    <span className="font-mono">{formatIndianCurrency(invoice.balanceDue)}</span>
                  </div>
                </div>

              </div>

              {/* Footer: Terms & Signature Box */}
              <div className="grid grid-cols-2 pt-4 gap-6 text-[10px] border-t border-slate-300 mt-2">
                <div>
                  <div className="font-black text-slate-900 uppercase tracking-wider mb-1 text-[10px]">Terms &amp; Conditions:</div>
                  <div className="text-slate-800 whitespace-pre-line leading-relaxed font-medium bg-slate-50/80 p-2 rounded border border-slate-200">
                    {effectiveTerms}
                  </div>
                  {invoice.notes && (
                    <div className="text-[9px] text-slate-600 mt-1 italic">
                      <strong className="text-slate-800">Special Note: </strong>{invoice.notes}
                    </div>
                  )}
                </div>
                <div className="text-right flex flex-col justify-between items-end min-h-[90px]">
                  <div>
                    <span className="text-slate-600 block">For <strong>{businessProfile.name || businessProfile.tradeName || 'SR GROUP'}</strong></span>
                  </div>
                  {businessProfile.signatureUrl && (
                    <img 
                      src={businessProfile.signatureUrl} 
                      alt="Signature" 
                      className="max-h-8 object-contain mix-blend-multiply my-1" 
                    />
                  )}
                  <div className="border-t border-slate-600 pt-1 w-48 text-center">
                    <span className="font-bold text-slate-950 block text-[9.5px] uppercase">Authorized Signatory</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TEMPLATE 2: MODERN NIKKAMA BLUE */}
          {template === 'MODERN_BLUE' && (
            <div className="relative p-8 md:p-12 font-sans text-xs text-slate-800 leading-relaxed overflow-hidden">
              
              {/* Central Diagonal Watermark */}
              {watermark !== 'NONE' && (
                <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
                  <div 
                    className="select-none text-center font-black tracking-widest uppercase pointer-events-none watermark-print-visible"
                    style={{
                      transform: 'rotate(-30deg)',
                      fontSize: watermark.length > 20 ? '3.5rem' : watermark.length > 14 ? '4.5rem' : '5.8rem',
                      lineHeight: 1.05,
                      maxWidth: '92%',
                      letterSpacing: '0.14em',
                      color: watermarkVisual === 'DARK'
                        ? 'rgba(15, 23, 42, 0.70)'
                        : watermarkVisual === 'BOLD'
                        ? 'rgba(15, 23, 42, 0.50)'
                        : watermarkVisual === 'LIGHT'
                        ? 'rgba(15, 23, 42, 0.18)'
                        : 'rgba(15, 23, 42, 0.35)',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  >
                    {watermark}
                  </div>
                </div>
              )}

              {/* Top Banner */}
              <div className="relative z-10 flex items-start justify-between pb-8 border-b-2 border-blue-600">
                <div>
                  <h1 className="text-2xl font-black text-blue-900 tracking-tight">{businessProfile.name}</h1>
                  <p className="text-slate-500 mt-1">{businessProfile.address}, {businessProfile.city}, {businessProfile.state} - {businessProfile.pincode}</p>
                  <div className="flex items-center gap-3 text-xs mt-2 text-slate-600">
                    <span>GSTIN: <strong className="font-mono text-slate-900">{businessProfile.gstin}</strong></span>
                    <span>•</span>
                    <span>Phone: {businessProfile.phone}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 font-bold rounded-lg uppercase tracking-wider text-xs mb-1">
                    {getDocumentTypeName(invoice.documentType)}
                  </span>
                  <div className="text-xl font-black font-mono text-slate-900 mt-1">{invoice.invoiceNumber}</div>
                  <div className="text-slate-500 text-xs">Date: {invoice.date}</div>
                </div>
              </div>

              {/* Billed To Box */}
              <div className="grid grid-cols-2 gap-8 my-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Bill To Customer:</span>
                  <div className="font-bold text-base text-slate-900 mt-0.5">{invoice.partyName}</div>
                  <p className="text-slate-600 mt-0.5">{invoice.partyAddress}</p>
                  {(resolvedPartyStateInfo.stateName || resolvedPartyStateInfo.stateCode) && (
                    <p className="text-slate-700 mt-1">State: <strong>{resolvedPartyStateInfo.stateName}</strong> {resolvedPartyStateInfo.stateCode ? `(State Code: ${resolvedPartyStateInfo.stateCode})` : ''}</p>
                  )}
                  {invoice.partyGstin && <p className="font-mono font-semibold text-blue-900">GSTIN: {invoice.partyGstin}</p>}
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-slate-500">Place of Supply: <strong className="text-slate-800">{invoice.placeOfSupply}</strong></div>
                  <div className="text-slate-500">Payment Status: <strong className="text-emerald-700 uppercase">{invoice.paymentStatus}</strong></div>
                  <div className="text-slate-500">Due Date: <strong className="text-slate-800">{invoice.dueDate || invoice.date}</strong></div>
                  {invoice.serviceNumber && (
                    <div className="text-slate-500">Service No: <strong className="font-mono text-slate-800">{invoice.serviceNumber}</strong></div>
                  )}
                  {invoice.serviceDate && (
                    <div className="text-slate-500">Service Date: <strong className="text-slate-800">{invoice.serviceDate}</strong></div>
                  )}
                  {invoice.transport?.ewayBillNumber && (
                    <div className="text-slate-500">E-Way Bill: <strong className="font-mono text-slate-800">{invoice.transport.ewayBillNumber}</strong></div>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left text-xs table-fixed">
                  <colgroup>
                    <col style={{ width: showHsnColumn ? '34%' : '44%' }} />
                    {showHsnColumn && <col style={{ width: '10%' }} />}
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '23%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-blue-900 text-white font-bold rounded-lg text-[11px]">
                      <th className="py-2.5 px-3 rounded-l-lg">Item Description</th>
                      {showHsnColumn && <th className="py-2.5 px-2 text-center font-mono">HSN</th>}
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-2 text-right">Rate</th>
                      <th className="py-2.5 px-2 text-right">Tax %</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 overflow-hidden">
                          <div className="break-words leading-tight">{item.name}</div>
                          {item.description && <div className="text-[10px] text-slate-400 font-normal break-words leading-tight">{item.description}</div>}
                        </td>
                        {showHsnColumn && (
                          <td className="py-2.5 px-2 text-center font-mono text-slate-600 overflow-hidden">
                            {item.hsnCode && item.hsnCode.trim() !== '' ? item.hsnCode.trim() : ''}
                          </td>
                        )}
                        <td className="py-2.5 px-2 text-center font-medium overflow-hidden">{item.quantity} {item.unit}</td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums overflow-hidden">{formatIndianCurrency(item.rate)}</td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums overflow-hidden">{item.taxRate}%</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums overflow-hidden">{formatIndianCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Math & UPI */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-blue-950 uppercase text-[11px]">Pay Online via UPI:</div>
                    <div className="text-slate-600">Scan code with PhonePe, GPay, Paytm or BHIM</div>
                    <div className="font-mono font-bold text-blue-900">{businessProfile.upiId}</div>
                    <div className="text-[10px] text-slate-500 mt-2">Certified tax invoice. E. &amp; O.E.</div>
                  </div>
                  {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="UPI QR" className="w-20 h-20 rounded-lg border bg-white p-1" />}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatIndianCurrency(invoice.subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST Tax ({invoice.isInterState ? 'IGST' : 'CGST + SGST'})</span>
                    <span className="font-mono">{formatIndianCurrency(invoice.cgstTotal + invoice.sgstTotal + invoice.igstTotal)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-blue-950 pt-2 border-t border-slate-300">
                    <span>Grand Total</span>
                    <span className="font-mono">{formatIndianCurrency(invoice.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-rose-800">
                    <span>Balance Due</span>
                    <span className="font-mono">{formatIndianCurrency(invoice.balanceDue)}</span>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions Section */}
              <div className="pt-4 border-t border-slate-200 mt-4 text-[11px] text-slate-700">
                <div className="font-bold text-slate-900 mb-1 uppercase tracking-wider text-[10px]">
                  Terms &amp; Conditions ({getDocumentTypeName(invoice.documentType)}):
                </div>
                <div className="whitespace-pre-line font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] leading-relaxed font-medium text-slate-800">
                  {effectiveTerms}
                </div>
              </div>

              {invoice.notes && (
                <div className="text-[11px] text-slate-500 italic mt-2 text-center">
                  Note: {invoice.notes}
                </div>
              )}

            </div>
          )}

          {/* TEMPLATE 3: THERMAL POS RECEIPT (80mm) */}
          {template === 'THERMAL_POS' && (
            <div className="p-4 font-mono text-[11px] text-slate-900 leading-tight space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <div className="font-bold text-sm uppercase">{businessProfile.name}</div>
                <div className="text-[10px] text-slate-600">{businessProfile.address}, {businessProfile.city}</div>
                <div className="text-[10px] text-slate-600">GSTIN: {businessProfile.gstin}</div>
                <div className="text-[10px] text-slate-600">Ph: {businessProfile.phone}</div>
                <div className="font-bold uppercase text-xs mt-1">*** {getDocumentTypeName(invoice.documentType)} ***</div>
              </div>

              <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span>Bill No: {invoice.invoiceNumber}</span>
                  <span>Date: {invoice.date}</span>
                </div>
                <div>Customer: <strong>{invoice.partyName}</strong></div>
                {invoice.partyGstin && <div>Cust GSTIN: {invoice.partyGstin}</div>}
              </div>

              <div className="border-b border-dashed border-slate-400 pb-2">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-300 font-bold">
                      <th className="py-1">Item</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Price</th>
                      <th className="py-1 text-right">Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1 font-semibold">{item.name}</td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-right">{item.rate}</td>
                        <td className="py-1 text-right font-bold">{item.totalAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span>Taxable Amt:</span>
                  <span>{formatIndianCurrency(invoice.taxableTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total GST:</span>
                  <span>{formatIndianCurrency(invoice.cgstTotal + invoice.sgstTotal + invoice.igstTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1">
                  <span>NET PAYABLE:</span>
                  <span>{formatIndianCurrency(invoice.grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid ({invoice.paymentMode}):</span>
                  <span>{formatIndianCurrency(invoice.paidAmount)}</span>
                </div>
                {invoice.balanceDue > 0 && (
                  <div className="flex justify-between font-bold text-rose-700">
                    <span>Balance Due:</span>
                    <span>{formatIndianCurrency(invoice.balanceDue)}</span>
                  </div>
                )}
              </div>

              {qrCodeDataUrl && (
                <div className="text-center py-1">
                  <img src={qrCodeDataUrl} alt="UPI QR" className="w-24 h-24 mx-auto" />
                  <span className="text-[9px] block">UPI: {businessProfile.upiId}</span>
                </div>
              )}

              <div className="text-center text-[10px] text-slate-500 pt-1">
                Thank you! Visit Again!
              </div>
            </div>
          )}

          {/* TEMPLATE 4: DELIVERY CHALLAN */}
          {template === 'DELIVERY_CHALLAN' && (
            <div className="p-8 md:p-10 font-sans text-xs text-slate-800 leading-relaxed border border-slate-300">
              <div className="text-center pb-4 border-b border-slate-800">
                <div className="inline-block px-4 py-0.5 bg-amber-100 font-bold uppercase tracking-widest text-amber-900 text-xs border border-amber-300 mb-2">
                  DELIVERY CHALLAN / GOODS DISPATCH NOTE
                </div>
                <h1 className="text-2xl font-black text-slate-900 uppercase">{businessProfile.name}</h1>
                <p className="text-xs text-slate-600">{businessProfile.address}, {businessProfile.city}, {businessProfile.state} - {businessProfile.pincode}</p>
                <div className="text-xs font-semibold mt-1">GSTIN: {businessProfile.gstin} | Phone: {businessProfile.phone}</div>
              </div>

              <div className="grid grid-cols-2 border-b border-slate-800 p-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Consignee (Deliver To):</span>
                  <div className="font-bold text-sm text-slate-900">{invoice.partyName}</div>
                  <div>{invoice.partyAddress}</div>
                  {(resolvedPartyStateInfo.stateName || resolvedPartyStateInfo.stateCode) && (
                    <div>State: {resolvedPartyStateInfo.stateName} {resolvedPartyStateInfo.stateCode ? `(State Code: ${resolvedPartyStateInfo.stateCode})` : ''}</div>
                  )}
                  {invoice.partyGstin && <div>GSTIN: <strong className="font-mono">{invoice.partyGstin}</strong></div>}
                </div>
                <div className="space-y-1">
                  <div>Challan No: <strong className="font-mono text-sm text-slate-900">{invoice.invoiceNumber}</strong></div>
                  <div>Date of Dispatch: <strong>{invoice.date}</strong></div>
                  <div>Transporter: <strong>{invoice.transport?.transporterName || 'Self / Local Carrier'}</strong></div>
                  <div>Vehicle Number: <strong className="font-mono">{invoice.transport?.vehicleNumber || 'N/A'}</strong></div>
                  <div>E-Way Bill: <strong className="font-mono">{invoice.transport?.ewayBillNumber || 'N/A'}</strong></div>
                </div>
              </div>

              <div className="overflow-x-auto my-4">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '6%' }} />
                    <col style={{ width: showHsnColumn ? '44%' : '58%' }} />
                    {showHsnColumn && <col style={{ width: '14%' }} />}
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-800 font-bold text-[11px]">
                      <th className="py-2 px-2 text-center">#</th>
                      <th className="py-2 px-3">Item Description</th>
                      {showHsnColumn && <th className="py-2 px-2 text-center">HSN</th>}
                      <th className="py-2 px-2 text-center">Quantity Dispatched</th>
                      <th className="py-2 px-3 text-right">Approx Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 text-center text-slate-500 font-mono overflow-hidden">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900 overflow-hidden break-words">{item.name}</td>
                        {showHsnColumn && (
                          <td className="py-2 px-2 text-center font-mono text-slate-600 overflow-hidden">
                            {item.hsnCode && item.hsnCode.trim() !== '' ? item.hsnCode.trim() : ''}
                          </td>
                        )}
                        <td className="py-2 px-2 text-center font-bold text-slate-900 overflow-hidden">{item.quantity} {item.unit}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-950 tabular-nums overflow-hidden">{formatIndianCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 pt-12 gap-8 text-xs border-t border-slate-800 mt-8">
                <div className="text-center border-t border-slate-400 pt-2">
                  <span className="font-bold text-slate-800">Receiver's Signature & Stamp</span>
                </div>
                <div className="text-center border-t border-slate-400 pt-2">
                  <span className="font-bold text-slate-800">Authorized Signatory ({businessProfile.name || businessProfile.tradeName || 'SR GROUP'})</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Quick Customize Offer & T&C Modal (No Print) */}
      {showQuickEditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Customize Quotation Offer &amp; T&amp;C</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              {/* Subject */}
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Quotation Subject / Scope of Work (ऑफर का विषय)
                </label>
                <textarea
                  rows={2}
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="e.g. TECHNO - COMMERCIAL OFFER FOR, ESP FABRICATION & ERECTION WITH DISMANTLING WORK..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Ref No & Validity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Quotation Ref / RFQ No.
                  </label>
                  <input
                    type="text"
                    value={customRefNo}
                    onChange={(e) => setCustomRefNo(e.target.value)}
                    placeholder="e.g. SRG/2026-27/Q-304"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Validity Expiry (वैधता)
                  </label>
                  <input
                    type="text"
                    value={customValidExpiry}
                    onChange={(e) => setCustomValidExpiry(e.target.value)}
                    placeholder="e.g. 30 Days / 2026-10-15"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Intro Salutation / Dear Sir text */}
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Intro Salutation (प्रारंभिक संदेश)
                </label>
                <input
                  type="text"
                  value={customIntroText}
                  onChange={(e) => setCustomIntroText(e.target.value)}
                  placeholder="e.g. Dear Sir, With reference to the above subject and site inspection, we are pleased to submit our most competitive techno-commercial offer:"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Layout controls */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">T&amp;C Print Layout (नियम एवं शर्तें लेआउट):</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTermsLayout('horizontal_2col')}
                      className={`px-2 py-1 rounded-lg font-bold ${
                        termsLayout === 'horizontal_2col' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border'
                      }`}
                    >
                      Horizontal (2 Col)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTermsLayout('horizontal_3col')}
                      className={`px-2 py-1 rounded-lg font-bold ${
                        termsLayout === 'horizontal_3col' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border'
                      }`}
                    >
                      Horizontal (3 Col)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTermsLayout('single_col')}
                      className={`px-2 py-1 rounded-lg font-bold ${
                        termsLayout === 'single_col' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border'
                      }`}
                    >
                      Single Col
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900">Multi-page T&amp;C Overflow (लंबी शर्तें दूसरे पेज पर):</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTermsPageBreak(true)}
                      className={`px-2.5 py-1 rounded-lg font-bold ${
                        termsPageBreak ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border'
                      }`}
                    >
                      ✓ Page 2 (दूसरा पेज - Multi-Page A4)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTermsPageBreak(false)}
                      className={`px-2.5 py-1 rounded-lg font-bold ${
                        !termsPageBreak ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border'
                      }`}
                    >
                      Same Page (1 ही पेज)
                    </button>
                  </div>
                </div>
              </div>

              {/* Terms Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-900">
                    Terms &amp; Conditions (नियम एवं शर्तें)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomTerms(
                        '1. All manpower required for execution of the work shall be provided by the Contractor as per agreed scope and schedule.\n2. All necessary tools & tackles such as welding machines, cutting sets, chain blocks, wire ropes, D-shackles, levels, grinding machines and other required equipment shall be arranged by the Contractor.\n3. Electric power & water shall be provided by the Client free of cost at one central point within 50 meters of work site.\n4. Accommodation & local transportation for labor/engineers shall be in the scope of Contractor.\n5. Payment Terms: 15 days running bill against work certification by Site In-charge.\n6. Taxes: GST @ 18% extra as applicable at the time of invoicing.\n7. Safety & PPE: All workers shall wear helmets, safety shoes, safety belts, and follow plant safety norms strictly.\n8. Work Schedule: Work shall commence within 7 days from issue of Work Order / Site Clearance.\n9. Scrap & Surplus: Scrap generated during dismantling/fabrication shall be shifted to client designated scrap yard.\n10. Price Validity: This commercial offer is valid for 30 days from the date of submission.'
                      )}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded border border-indigo-200"
                    >
                      ⚡ Industrial ESP Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomTerms(
                        '1. Price Validity: 30 days from offer date.\n2. Payment: 50% advance, balance against delivery.\n3. Taxes: GST extra at 18%.\n4. Delivery: 2-3 weeks from receipt of clear PO.\n5. Freight: Extra at actuals unless specified.\n6. Jurisdiction: Subject to local jurisdiction.'
                      )}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded border border-blue-200"
                    >
                      Standard Preset
                    </button>
                  </div>
                </div>
                <textarea
                  rows={8}
                  value={customTerms}
                  onChange={(e) => setCustomTerms(e.target.value)}
                  placeholder="Enter numbered terms and conditions (e.g. 1. Manpower... 2. Tools...)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowQuickEditModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors"
              >
                Apply &amp; Update Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
