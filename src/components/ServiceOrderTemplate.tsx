import React from 'react';
import { Invoice, BusinessProfile } from '../types';
import { formatIndianCurrency, numberToIndianWords } from '../utils/gstCalculations';

export interface ServiceOrderTemplateProps {
  invoice: Invoice;
  businessProfile: BusinessProfile;
  watermark?: string;
  watermarkVisual?: 'LIGHT' | 'CLEAR' | 'BOLD' | 'DARK';
  showCenterWatermark?: boolean;
  showPadBg?: boolean;
  headerOffset?: number;
  footerOffset?: number;
  contentScale?: number;
  verticalAlignment?: 'center' | 'top';
  cardOpacity?: 'transparent' | 'translucent' | 'opaque';
  termsPageBreak?: boolean;
  previewZoom?: number;
}

// 8 Comprehensive PO / Service Order clauses
const DEFAULT_SERVICE_ORDER_TERMS = [
  '**Delivery & Inspection:** All materials, tools and workmanship shall strictly comply with the technical specifications mentioned in this Service Order and drawings, and shall be subject to thorough inspection at site by the designated engineer/in-charge.',
  '**Test Certificates & Quality Reports:** Mill Test Certificates (MTC), calibration reports, inspection test plans (ITP), and other required statutory/quality documents shall be provided along with material delivery / work completion.',
  '**Rejection & Replacement Policy:** Any defective, damaged, sub-standard or non-compliant material or workmanship shall be rejected immediately. The entire cost of rectification, replacement, transportation, and related expenses shall be borne solely by the Supplier/Contractor.',
  '**Payment Terms:** Payment shall be made within **30 days** from the date of receipt of verified materials / work measurement sheet certification along with original Tax Invoice and required supporting documents.',
  '**Delivery & Execution Timeline:** Strict adherence to agreed delivery schedule and milestone completion is mandatory. Any unavoidable delay shall be communicated in writing in advance and shall be subject to prior written approval by the Buyer.',
  '**Packing, Safety & Transportation:** All materials shall be properly packed, handled and delivered in safe, undamaged condition. Any damage, transit loss or pilferage occurring during loading, transportation or unloading shall be the responsibility of the Supplier/Transporter.',
  '**Safety & Statutory Compliance:** Contractor/Vendor shall strictly follow all industrial safety norms, PPE mandates, Workmen Compensation Act, PF/ESIC regulations, and labor laws. The Buyer shall not be held liable for any accident, injury or statutory default at site.',
  '**Site Examination & Scope of Work:** The Contractor confirms that site conditions, drawings, accessibility, and local regulations have been fully examined and understood. No extra or escalated claim will be entertained on account of site conditions.',
];

// Helper to render bold markdown tags like **Text**
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

export const ServiceOrderTemplate: React.FC<ServiceOrderTemplateProps> = ({
  invoice,
  businessProfile,
  watermark,
  watermarkVisual = 'CLEAR',
  showCenterWatermark = false,
  showPadBg = false,
  headerOffset,
  footerOffset,
  contentScale = 100,
  verticalAlignment = 'top',
  cardOpacity = 'transparent',
  termsPageBreak = true,
}) => {
  const topPadOffset = headerOffset !== undefined ? headerOffset : (showPadBg ? (businessProfile.billPadHeaderOffset ?? 148) : 32);
  const bottomPadOffset = footerOffset !== undefined ? footerOffset : (showPadBg ? (businessProfile.billPadFooterOffset ?? 125) : 32);
  const billPadImage = businessProfile.billPadUrl || 'https://lh3.googleusercontent.com/d/1XMbVyXZXJ4DsVd_wfJViJ1sooBv3brJ2';

  const contentCardBg = cardOpacity === 'opaque'
    ? 'bg-white'
    : cardOpacity === 'translucent'
    ? 'bg-white/70 backdrop-blur-2xs'
    : 'bg-transparent';

  // Parse party address details
  const partyName = invoice.partyName || 'RAJ HARDWARE STORE';
  const partyAddress = invoice.partyAddress || 'Plot no. 331/332, Shop no. 6, Jivandeep Complex, 12-B';
  const partyCity = invoice.partyCity || 'Kachchh';
  const partyState = invoice.partyState || 'Gujarat';
  const partyPincode = invoice.partyPincode || '370201';
  const partyGstin = invoice.partyGstin || '24AAQPL3381D1ZQ';

  // Company details
  const companyName = businessProfile.name || businessProfile.tradeName || 'SR GROUP';
  const companyAddress = businessProfile.address || 'Sec-07, Plot No- 295, Ground floor-02,';
  const companyCity = businessProfile.city || 'Gandhidham';
  const companyDistrict = businessProfile.district || businessProfile.city || 'KUTCH';
  const companyState = (businessProfile.state || 'GUJARAT').toUpperCase();
  const companyPincode = businessProfile.pincode || '370201';
  const companyGstin = businessProfile.gstin || '24CTGPR1641K1ZJ';

  // Service Order No & Date
  const serviceOrderNo = (invoice.serviceOrderNumber || invoice.serviceNumber || invoice.invoiceNumber || 'SO/2026/001').trim();
  const serviceOrderDate = invoice.serviceOrderDate || invoice.serviceDate || invoice.date || new Date().toISOString().split('T')[0];

  // Items & Tax computation
  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
    {
      id: 'item-1',
      name: 'STRUCTURAL FABRICATION & ERECTION SERVICE',
      unit: 'MT',
      quantity: 10,
      rate: 4500,
      taxRate: 18,
      taxableAmount: 45000,
      cgstAmount: 4050,
      sgstAmount: 4050,
      igstAmount: 0,
      cessAmount: 0,
      totalAmount: 53100,
    }
  ];

  const isInterState = Boolean(invoice.isInterState);
  const primaryTaxRate = items[0]?.taxRate || 18;
  const halfTaxRate = primaryTaxRate / 2;

  // Totals
  const totalTaxable = invoice.taxableTotal || items.reduce((sum, it) => sum + (it.taxableAmount || (it.quantity * it.rate)), 0);
  const totalCgst = invoice.cgstTotal || items.reduce((sum, it) => sum + (it.cgstAmount || 0), 0);
  const totalSgst = invoice.sgstTotal || items.reduce((sum, it) => sum + (it.sgstAmount || 0), 0);
  const totalIgst = invoice.igstTotal || items.reduce((sum, it) => sum + (it.igstAmount || 0), 0);
  const totalGst = isInterState ? totalIgst : (totalCgst + totalSgst);
  const grandTotal = invoice.grandTotal || (totalTaxable + totalGst);

  const taxValueWords = numberToIndianWords(Math.round(totalGst));
  const orderValueWords = numberToIndianWords(Math.round(grandTotal));

  // Parse terms into an array of clean strings
  const rawTerms = invoice.terms?.trim() || '';
  let parsedTerms: string[] = [];
  if (rawTerms.length > 0) {
    const lines = rawTerms.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    parsedTerms = lines.map(line => line.replace(/^\d+[\.\)\-]\s*/, '').trim()).filter(t => t.length > 0);
  }
  if (parsedTerms.length === 0) {
    parsedTerms = DEFAULT_SERVICE_ORDER_TERMS;
  }

  // Helper to check if string contains "suhel ansari" or personal name
  const isPersonalWatermark = (str?: string) => {
    if (!str) return false;
    const lower = str.trim().toLowerCase();
    return lower === 'suhel ansari' || lower.includes('ansari');
  };

  // Determine active watermark text
  let activeWatermark: string | null = null;
  if (showCenterWatermark && watermark && watermark !== 'NONE' && !isPersonalWatermark(watermark)) {
    activeWatermark = watermark;
  }

  // Watermark color strength
  const watermarkTextColor = watermarkVisual === 'DARK'
    ? 'rgba(15, 23, 42, 0.85)'
    : watermarkVisual === 'BOLD'
    ? 'rgba(15, 23, 42, 0.65)'
    : watermarkVisual === 'LIGHT'
    ? 'rgba(15, 23, 42, 0.20)'
    : 'rgba(15, 23, 42, 0.40)';

  // Reusable Letter Pad Graphic Component
  const renderPadBackground = () => {
    if (!showPadBg) return null;
    return (
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src={billPadImage}
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
    );
  };

  // Reusable Clear Diagonal Watermark Component
  const renderWatermark = () => {
    if (!showCenterWatermark || !activeWatermark || activeWatermark === 'NONE') return null;
    return (
      <div className="absolute inset-0 pointer-events-none z-5 flex items-center justify-center overflow-hidden">
        <div 
          className="select-none text-center font-black tracking-widest uppercase pointer-events-none watermark-print-visible transition-all"
          style={{
            transform: 'rotate(-30deg)',
            fontSize: activeWatermark.length > 20 ? '3.5rem' : activeWatermark.length > 14 ? '4.5rem' : '5.5rem',
            lineHeight: 1.05,
            maxWidth: '92%',
            letterSpacing: '0.14em',
            color: watermarkTextColor,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {activeWatermark}
        </div>
      </div>
    );
  };

  // Common Header & Order Meta component for Page 1
  const renderPage1Content = () => (
    <div 
      className={`relative z-10 w-full flex-1 flex flex-col justify-between ${
        verticalAlignment === 'center' ? 'my-auto justify-center' : ''
      }`}
      style={{
        transform: contentScale !== 100 ? `scale(${contentScale / 100})` : undefined,
        transformOrigin: verticalAlignment === 'center' ? 'center center' : 'top center',
      }}
    >
      <div className="space-y-3">
        {/* 1. DOCUMENT TITLE */}
        <div className="text-center pt-0.5 pb-0.5">
          <h1 className="text-base md:text-[17px] font-black tracking-wider uppercase text-slate-950">
            SARVICE ORDER
          </h1>
          <p className="text-[9.5px] font-semibold tracking-wider uppercase text-slate-700">
            (WORK ORDER / PURCHASE ORDER)
          </p>
        </div>

        {/* 2. ORDER NUMBER & DATE */}
        <div className="flex justify-between items-end text-[11.5px] text-slate-950 font-bold border-b border-black pb-1">
          <div className="space-y-0.5">
            <div>
              <span>SARVICE NO : </span>
              <span className="font-mono font-extrabold">{serviceOrderNo}</span>
            </div>
            <div>
              <span>SARVICE DATE : </span>
              <span className="font-semibold">{serviceOrderDate}</span>
            </div>
          </div>
          <div className="text-right space-y-0.5 text-[10.5px]">
            {invoice.poNumber && (
              <div>
                <span className="font-medium text-slate-700">REF / PO NO : </span>
                <span className="font-mono font-bold">{invoice.poNumber}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-slate-700">PAYMENT TERMS : </span>
              <span className="font-bold">30 Days</span>
            </div>
          </div>
        </div>

        {/* 3. ADDRESSES TWO-COLUMN BOX */}
        <div className={`w-full border-2 border-black grid grid-cols-2 text-[11px] leading-tight divide-x-2 divide-black ${contentCardBg}`}>
          {/* Left Column: TO (Supplier / Vendor) */}
          <div className="p-2 space-y-0.5 text-slate-950">
            <div className="font-bold text-[11px] uppercase text-slate-800">TO (SUPPLIER / CONTRACTOR)</div>
            <div className="font-black text-xs uppercase pt-0.5">{partyName}</div>
            <div className="text-[10.5px] leading-tight pt-0.5">
              <span className="font-medium">ADDRESS- </span>
              <span>{partyAddress}</span>
            </div>
            <div className="text-[10.5px]">
              <span className="font-medium">DIST- </span>
              <span>{partyCity}</span>
            </div>
            <div className="text-[10.5px]">
              <span className="font-medium">STATE- </span>
              <span>{partyState}</span>
            </div>
            <div className="text-[10.5px]">
              <span className="font-medium">PIN CODE- </span>
              <span className="font-mono">{partyPincode}</span>
            </div>
            <div className="text-[10.5px] font-bold pt-0.5">
              <span>GSTIN : </span>
              <span className="font-mono font-bold">{partyGstin}</span>
            </div>
          </div>

          {/* Right Column: BILLING ADDRESS (Company / Buyer) */}
          <div className="p-2 space-y-0.5 text-slate-950">
            <div className="font-bold text-[11px] uppercase text-slate-800">BILLING ADDRESS (BUYER)</div>
            <div className="font-black text-xs uppercase pt-0.5">{companyName}</div>
            <div className="text-[10.5px] leading-tight pt-0.5">
              <span className="font-medium">ADDRESS : </span>
              <span>{companyAddress}</span>
            </div>
            <div className="text-[10.5px]">
              <span>Taluka {companyCity}</span>
            </div>
            <div className="text-[10.5px]">
              <span className="font-medium">DIST : </span>
              <span>{companyDistrict}</span>
            </div>
            <div className="text-[10.5px]">
              <span className="font-medium">STATE : </span>
              <span>{companyState}</span>
            </div>
            <div className="text-[10.5px]">
              <span className="font-medium">PIN CODE : </span>
              <span className="font-mono">{companyPincode}</span>
            </div>
            <div className="text-[10.5px] font-bold pt-0.5">
              <span>GSTIN : </span>
              <span className="font-mono font-bold">{companyGstin}</span>
            </div>
          </div>
        </div>

        {/* 4. ITEMS & GST BREAKDOWN TABLE */}
        <div className={`w-full border-2 border-black text-slate-950 ${contentCardBg}`}>
          <table className="w-full border-collapse text-[10.5px] bg-transparent">
            <thead>
              <tr className="bg-[#d0ddec] text-slate-950 font-bold uppercase text-[10px] tracking-tight">
                <th rowSpan={2} className="border border-black py-1 px-1 text-center w-[6%]">
                  SL NO.
                </th>
                <th rowSpan={2} className="border border-black py-1 px-2 text-center w-[41%]">
                  ITEM DISCRIPTION
                </th>
                <th rowSpan={2} className="border border-black py-1 px-1 text-center w-[7%]">
                  UNIT
                </th>
                <th rowSpan={2} className="border border-black py-1 px-1 text-center w-[11%]">
                  RATE
                </th>
                <th rowSpan={2} className="border border-black py-1 px-1 text-center w-[7%]">
                  QNTY
                </th>
                {isInterState ? (
                  <th rowSpan={2} className="border border-black py-1 px-1 text-center w-[14%]">
                    IGST {primaryTaxRate}%
                  </th>
                ) : (
                  <th colSpan={2} className="border border-black py-0.5 px-1 text-center w-[14%]">
                    GST {primaryTaxRate}%
                  </th>
                )}
                <th rowSpan={2} className="border border-black py-1 px-1 text-center w-[14%]">
                  AMOUNT
                </th>
              </tr>
              {!isInterState && (
                <tr className="bg-[#d0ddec] text-slate-950 font-bold uppercase text-[9px] tracking-tight">
                  <th className="border border-black py-0.5 px-1 text-center w-[7%]">
                    SGST {halfTaxRate}%
                  </th>
                  <th className="border border-black py-0.5 px-1 text-center w-[7%]">
                    CGST {halfTaxRate}%
                  </th>
                </tr>
              )}
            </thead>
            <tbody className="bg-transparent">
              {items.map((item, index) => {
                const itemCgst = item.cgstAmount || (isInterState ? 0 : (item.taxableAmount || (item.quantity * item.rate)) * (halfTaxRate / 100));
                const itemSgst = item.sgstAmount || (isInterState ? 0 : (item.taxableAmount || (item.quantity * item.rate)) * (halfTaxRate / 100));
                const itemIgst = item.igstAmount || (isInterState ? (item.taxableAmount || (item.quantity * item.rate)) * (primaryTaxRate / 100) : 0);
                const itemTotal = item.totalAmount || ((item.taxableAmount || (item.quantity * item.rate)) + (isInterState ? itemIgst : (itemCgst + itemSgst)));

                return (
                  <tr key={item.id || index} className="h-6 text-[10px] text-slate-950 bg-transparent">
                    <td className="border border-black py-0.5 px-1 text-center font-medium bg-transparent">
                      {index + 1}
                    </td>
                    <td className="border border-black py-0.5 px-2 text-left font-medium bg-transparent">
                      <div className="font-semibold">{item.name}</div>
                      {item.description && (
                        <div className="text-[9px] text-slate-700 font-normal mt-0.5 whitespace-pre-line">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="border border-black py-0.5 px-1 text-center font-medium uppercase bg-transparent">
                      {item.unit || 'PCS'}
                    </td>
                    <td className="border border-black py-0.5 px-1 text-center font-mono font-medium bg-transparent">
                      {item.rate > 0 ? (item.rate % 1 === 0 ? item.rate.toString() : formatIndianCurrency(item.rate)) : ''}
                    </td>
                    <td className="border border-black py-0.5 px-1 text-center font-mono font-medium bg-transparent">
                      {item.quantity}
                    </td>
                    {isInterState ? (
                      <td className="border border-black py-0.5 px-1 text-center font-mono bg-transparent">
                        ₹ {formatIndianCurrency(itemIgst)}
                      </td>
                    ) : (
                      <>
                        <td className="border border-black py-0.5 px-1 text-center font-mono bg-transparent">
                          ₹ {formatIndianCurrency(itemSgst)}
                        </td>
                        <td className="border border-black py-0.5 px-1 text-center font-mono bg-transparent">
                          ₹ {formatIndianCurrency(itemCgst)}
                        </td>
                      </>
                    )}
                    <td className="border border-black py-0.5 px-1.5 text-right font-mono font-bold bg-transparent">
                      ₹ {formatIndianCurrency(itemTotal)}
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal Row */}
              <tr className="h-6 font-bold bg-transparent">
                <td className="border border-black py-0.5 px-1 bg-transparent">&nbsp;</td>
                <td className="border border-black py-0.5 px-2 bg-transparent text-left uppercase text-[9.5px]">SUBTOTAL / TAXABLE VALUE</td>
                <td className="border border-black py-0.5 px-1 bg-transparent">&nbsp;</td>
                <td className="border border-black py-0.5 px-1 bg-transparent">&nbsp;</td>
                <td className="border border-black py-0.5 px-1 bg-transparent">&nbsp;</td>
                {isInterState ? (
                  <td className="border border-black py-0.5 px-1 text-center font-mono font-bold bg-transparent">
                    ₹ {formatIndianCurrency(totalIgst)}
                  </td>
                ) : (
                  <>
                    <td className="border border-black py-0.5 px-1 text-center font-mono font-bold bg-transparent">
                      ₹ {formatIndianCurrency(totalSgst)}
                    </td>
                    <td className="border border-black py-0.5 px-1 text-center font-mono font-bold bg-transparent">
                      ₹ {formatIndianCurrency(totalCgst)}
                    </td>
                  </>
                )}
                <td className="border border-black py-0.5 px-1.5 text-right font-mono font-bold bg-transparent">
                  ₹ {formatIndianCurrency(grandTotal)}
                </td>
              </tr>

              {/* Tax Value Words Row */}
              <tr className="bg-transparent">
                <td colSpan={5} className="border border-black py-1 px-2 font-bold text-left text-[9.5px] bg-transparent">
                  TAX VALUE WORDS (INR) : <span className="font-normal uppercase">{taxValueWords}</span>
                </td>
                <td colSpan={isInterState ? 1 : 2} className="border border-black py-1 px-1 text-center font-bold text-[9.5px] uppercase bg-transparent">
                  GST VALUE (INR)
                </td>
                <td className="border border-black py-1 px-1.5 text-right font-mono font-bold text-[10.5px] bg-transparent">
                  ₹ {formatIndianCurrency(totalGst)}
                </td>
              </tr>

              {/* Order Value Words Row */}
              <tr className="bg-transparent">
                <td colSpan={5} className="border border-black py-1 px-2 font-bold text-left text-[9.5px] bg-transparent">
                  ORDER VALUE WORDS (INR) : <span className="font-normal uppercase">{orderValueWords}</span>
                </td>
                <td colSpan={isInterState ? 1 : 2} className="border border-black py-1 px-1 text-center font-bold text-[9.5px] uppercase bg-transparent">
                  ORDER VALUE (INR)
                </td>
                <td className="border border-black py-1 px-1.5 text-right font-mono font-bold text-[10.5px] bg-transparent">
                  ₹ {formatIndianCurrency(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Page 1 Informational Note when 2-Page mode is active */}
        {termsPageBreak && (
          <div className="border border-slate-700 bg-slate-50/80 px-2.5 py-1.5 text-[10px] text-slate-800 flex items-center justify-between rounded-sm">
            <span className="font-semibold">
              📌 Note: Detailed Terms &amp; Conditions, Work Scope, and Jurisdiction are printed on Page 2 (Annexure on Letter Pad).
            </span>
            <span className="font-bold text-slate-900 shrink-0 ml-2">
              (Please refer to Page 2)
            </span>
          </div>
        )}
      </div>

      {/* Page 1 Bottom Signatory Section */}
      <div className="pt-4 pb-1">
        <div className="flex justify-between items-end">
          {/* Left: Optional Acceptance Note */}
          <div className="text-left text-[9px] text-slate-500 max-w-[280px]">
            <div className="font-semibold text-slate-700">Contractor / Vendor Acceptance:</div>
            <div>Subject to terms &amp; conditions of this service order.</div>
          </div>

          {/* Right: Company Authorized Signatory (from Company & GST Details) */}
          <div className="text-right flex flex-col items-end min-w-[220px]">
            <div className="font-bold uppercase tracking-wide text-[11px] text-slate-950">
              For, {companyName}
            </div>

            <div className="my-1 min-h-[36px] flex items-center justify-end">
              {businessProfile.signatureUrl ? (
                <img 
                  src={businessProfile.signatureUrl} 
                  alt="Signature" 
                  className="h-9 max-w-[140px] object-contain mix-blend-multiply"
                />
              ) : (
                <div className="h-9">&nbsp;</div>
              )}
            </div>

            <div className="space-y-0.5">
              <div className="border-t border-slate-900 w-44 inline-block mb-1"></div>
              <div className="font-bold text-[10px] uppercase text-slate-950 tracking-wider">
                Authorized Signatory
              </div>
              <div className="text-[9px] text-slate-600 font-medium">
                ({companyName})
              </div>
            </div>
          </div>
        </div>

        {/* Page 1 of 2 Footer Indicator */}
        <div className="mt-3 pt-1 border-t border-slate-300 flex justify-between text-[9px] text-slate-500 font-medium">
          <span>Service Order No: {serviceOrderNo}</span>
          <span>Page 1 of {termsPageBreak ? '2' : '1'}</span>
        </div>
      </div>
    </div>
  );

  // Page 2: Terms and Conditions on Letter Pad
  const renderPage2Content = () => (
    <div 
      className={`relative z-10 w-full flex-1 flex flex-col justify-between ${
        verticalAlignment === 'center' ? 'my-auto justify-center' : ''
      }`}
      style={{
        transform: contentScale !== 100 ? `scale(${contentScale / 100})` : undefined,
        transformOrigin: verticalAlignment === 'center' ? 'center center' : 'top center',
      }}
    >
      <div className="space-y-3.5">
        {/* Annexure Header */}
        <div className="border-b-2 border-black pb-2">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-[14px] font-black uppercase tracking-wider text-slate-950">
                ANNEXURE: TERMS &amp; CONDITIONS
              </h2>
              <p className="text-[10.5px] font-semibold text-slate-800">
                (नियम एवं शर्तें - Service Order / Work Order Clauses)
              </p>
            </div>
            <div className="text-right text-[10px] font-bold text-slate-900 space-y-0.5">
              <div>
                <span className="text-slate-600">Service Order No: </span>
                <span className="font-mono font-extrabold">{serviceOrderNo}</span>
              </div>
              <div>
                <span className="text-slate-600">Date: </span>
                <span>{serviceOrderDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reference Party Bar */}
        <div className="bg-slate-100/90 border border-black px-3 py-1.5 text-[10.5px] text-slate-950 flex flex-wrap justify-between items-center">
          <div>
            <span className="font-bold text-slate-700">Contractor / Vendor: </span>
            <span className="font-extrabold uppercase">{partyName}</span>
          </div>
          {partyGstin && (
            <div>
              <span className="font-bold text-slate-700">GSTIN: </span>
              <span className="font-mono font-bold">{partyGstin}</span>
            </div>
          )}
        </div>

        {/* Detailed Numbered Terms List */}
        <div className="space-y-2 text-[10.5px] leading-relaxed text-slate-950">
          {parsedTerms.map((term, index) => (
            <div key={index} className="flex items-start gap-1.5 text-justify">
              <span className="font-extrabold min-w-[20px] text-slate-950 shrink-0">
                {index + 1}.
              </span>
              <p className="flex-1 text-slate-900 leading-normal">
                {renderMarkdownText(term)}
              </p>
            </div>
          ))}
        </div>

        {/* Jurisdiction Clause */}
        <div className="border-t border-slate-300 pt-2 space-y-1">
          <div className="font-bold underline text-[11px] text-slate-950">
            Jurisdiction
          </div>
          <div className="text-[10px] text-slate-900 leading-normal">
            For all disputes arising out of this Service/Work Order, the Jurisdiction shall lie exclusively with the competent court in{' '}
            <strong>{businessProfile.city || 'Anjar'}</strong>, Dist- <strong>{companyDistrict}</strong>, and State- <strong>{companyState}</strong>.
          </div>
        </div>

        {/* Acknowledgement & Acceptance Notes */}
        <div className="bg-slate-50/90 border border-slate-400 p-2 text-[9.5px] text-slate-900 space-y-1">
          <div className="font-medium">
            • The above Service Order / P.O is issued by mail. Please revert your signed Acknowledged and Acceptance copy on mail.
          </div>
          <div className="font-semibold text-slate-950">
            *** In case of acceptance of the Service Order / P.O, it will be taken for granted that above scope of the work, specifications, and site conditions have been fully examined by you &amp; understood by you totally.***
          </div>
          <div className="font-bold pt-0.5 text-slate-950">
            Thanking You,
          </div>
        </div>
      </div>

      {/* Page 2 Bottom Signatory Footer */}
      <div className="pt-4 pb-1">
        <div className="flex justify-end items-end">
          {/* Right Signatory: For, Company (from Company & GST Details) */}
          <div className="text-right flex flex-col items-end min-w-[220px]">
            <div className="font-bold uppercase tracking-wide text-[11px] text-slate-950">
              For, {companyName}
            </div>

            <div className="my-1 min-h-[36px] flex items-center justify-end">
              {businessProfile.signatureUrl ? (
                <img 
                  src={businessProfile.signatureUrl} 
                  alt="Signature" 
                  className="h-9 max-w-[140px] object-contain mix-blend-multiply"
                />
              ) : (
                <div className="h-9">&nbsp;</div>
              )}
            </div>

            <div className="space-y-0.5">
              <div className="border-t border-slate-900 w-44 inline-block mb-1"></div>
              <div className="font-bold text-[10px] uppercase text-slate-950 tracking-wider">
                Authorized Signatory
              </div>
              <div className="text-[9px] text-slate-600 font-medium">
                ({companyName})
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 of 2 Footer Indicator */}
        <div className="mt-3 pt-1 border-t border-slate-300 flex justify-between text-[9px] text-slate-500 font-medium">
          <span>Service Order No: {serviceOrderNo}</span>
          <span>Page 2 of 2 (Annexure &amp; Terms)</span>
        </div>
      </div>
    </div>
  );

  // Single-Page Fallback (when user explicitly selects 1-Page mode)
  if (!termsPageBreak) {
    return (
      <div 
        className="a4-page relative font-sans text-slate-900 leading-normal min-h-[1123px] overflow-hidden flex flex-col justify-between shadow-2xl print:shadow-none bg-white rounded-xl print:rounded-none"
        style={{
          width: '794px',
          paddingTop: `${topPadOffset}px`,
          paddingBottom: `${bottomPadOffset}px`,
          paddingLeft: '36px',
          paddingRight: '36px',
          boxSizing: 'border-box',
        }}
      >
        {renderPadBackground()}
        {renderWatermark()}
        {renderPage1Content()}
      </div>
    );
  }

  // Multi-Page Mode: Page 1 (Service Order) + Page 2 (Terms & Conditions on Letter Pad)
  return (
    <div className="multi-page-doc w-full bg-slate-200/70 print:bg-white flex flex-col items-center gap-6 print:gap-0 font-sans text-slate-900">
      
      {/* ========================================================================= */}
      {/* PAGE 1: SERVICE ORDER DETAILS                                             */}
      {/* ========================================================================= */}
      <div 
        className="a4-page relative w-[794px] min-h-[1123px] max-h-[1123px] bg-white text-slate-900 shadow-xl print:shadow-none flex flex-col justify-between box-border overflow-hidden"
        style={{
          width: '794px',
          height: '1123px',
          maxHeight: '1123px',
          paddingTop: `${topPadOffset}px`,
          paddingBottom: `${bottomPadOffset}px`,
          paddingLeft: '36px',
          paddingRight: '36px',
          boxSizing: 'border-box',
        }}
      >
        {renderPadBackground()}
        {renderWatermark()}
        {renderPage1Content()}
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: TERMS AND CONDITIONS (PRINTED ON LETTER PAD AS REQUESTED)        */}
      {/* ========================================================================= */}
      <div 
        className="a4-page relative w-[794px] min-h-[1123px] max-h-[1123px] bg-white text-slate-900 shadow-xl print:shadow-none flex flex-col justify-between box-border overflow-hidden"
        style={{
          width: '794px',
          height: '1123px',
          maxHeight: '1123px',
          paddingTop: `${topPadOffset}px`,
          paddingBottom: `${bottomPadOffset}px`,
          paddingLeft: '36px',
          paddingRight: '36px',
          boxSizing: 'border-box',
        }}
      >
        {/* Background Bill Pad Letterhead on Page 2 ("latter pad pr hi") */}
        {renderPadBackground()}
        {renderWatermark()}
        {renderPage2Content()}
      </div>

    </div>
  );
};
