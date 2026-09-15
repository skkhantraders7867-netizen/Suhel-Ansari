import React from 'react';
import { Invoice, BusinessProfile } from '../types';
import { formatIndianCurrency } from '../utils/gstCalculations';

interface TechnoCommercialOfferTemplateProps {
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
  termsLayout?: 'horizontal_table' | 'horizontal_2col' | 'horizontal_3col' | 'single_col';
  termsPageBreak?: boolean;
  cardOpacity?: 'transparent' | 'translucent' | 'opaque';
}

// Default standard industrial terms matching exact techno-commercial offer
const DEFAULT_TECHNO_TERMS = [
  'All manpower required for execution of the work shall be provided by the Contractor as per the agreed scope and schedule.',
  'All necessary tools & tackles such as welding machines, cutting sets, chain blocks, wire ropes, D-shackles, levels, grinding machines and other required equipment shall be arranged by the Contractor.',
  'Consumables such as LPG, Oxygen, welding rods/electrodes, grinding wheels and other required consumables shall be provided by the Contractor, unless otherwise agreed in writing.',
  'Required mobile crane for execution of the work shall be arranged as per the agreed scope and site requirement.',
  'Accommodation, water and electricity facilities required at site shall be provided by the Company/Client.',
  'Any additional work beyond the approved scope of work shall be carried out with mutual consent and shall be charged separately.',
  'Work measurements and quantities shall be jointly verified and approved by the authorized representatives of both parties.',
  'Mobilization shall commence after receipt of the Work Order.',
  '20% of the total Work Order value shall be paid as mobilization advance along with the Work Order.',
  'Running Account (RA) bills shall be submitted as per the progress of work and payment shall be released within 7 days from the date of submission/approval of the RA bill.',
  'GST and other applicable statutory taxes/duties shall be charged extra as applicable.',
  'Any delay or stoppage of work due to non-availability of site, drawings, materials, approvals, electricity, water or other required facilities from the Company/Client\'s side shall not be the responsibility of the Contractor.',
  'The work shall be executed as per the approved scope, agreed methodology and mutually agreed work schedule.',
  'Once the Work Order is issued and accepted, it shall not be cancelled. In case the Company/Client cancels the Work Order, the Company/Client shall compensate the Contractor for all mobilization expenses, work executed and other related costs incurred by the Contractor.',
  'Any dispute arising in connection with the work shall first be resolved through mutual discussion. If the matter remains unresolved, it shall be subject to arbitration as mutually agreed between both parties.',
  'This quotation shall remain valid for the period mentioned in the commercial offer, unless otherwise agreed in writing by both parties.',
  'The job sequence, duration, schedule and methodology of execution shall be submitted during further discussions.'
];

// Helper to format bold markdown tags
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

export const TechnoCommercialOfferTemplate: React.FC<TechnoCommercialOfferTemplateProps> = ({
  invoice,
  businessProfile,
  watermark,
  watermarkVisual = 'CLEAR',
  showCenterWatermark = false,
  showPadBg = true,
  headerOffset,
  footerOffset,
  contentScale = 100,
  verticalAlignment = 'top',
  termsLayout = 'single_col',
  termsPageBreak = true,
  cardOpacity = 'transparent',
}) => {
  // Top and bottom offsets to fit perfectly inside the official pre-printed Letter Pad (starts right below the blue/red line)
  const topPadOffset = headerOffset !== undefined ? headerOffset : (businessProfile.billPadHeaderOffset ?? 148);
  const bottomPadOffset = footerOffset !== undefined ? footerOffset : (businessProfile.billPadFooterOffset ?? 125);
  const billPadImage = businessProfile.billPadUrl || 'https://lh3.googleusercontent.com/d/1XMbVyXZXJ4DsVd_wfJViJ1sooBv3brJ2';

  const contentCardBg = cardOpacity === 'opaque'
    ? 'bg-white'
    : cardOpacity === 'translucent'
    ? 'bg-white/70 backdrop-blur-2xs'
    : 'bg-transparent';

  // Parse client address lines cleanly
  const partyName = invoice.partyName || 'Mono Steel (India) Ltd';
  const partyAddress = invoice.partyAddress || 'Office :202,2nd Floor,Aashopalav Arcade\nSector 9-A , Plot No.4 ,Tagor Road B/h\nS.B.I. , Gandhidham Kutch Gujarat.';
  const addressParts = partyAddress.split('\n').map(s => s.trim()).filter(Boolean);
  const line1 = addressParts[0] || partyAddress;
  const line2 = addressParts[1] || (invoice.partyCity ? `Sector 9-A , Plot No.4 ,Tagor Road B/h` : '');
  const line3 = addressParts[2] || (invoice.partyState ? `S.B.I. , ${invoice.partyCity || 'Gandhidham'} ${invoice.partyState || 'Gujarat'}.` : `${invoice.partyCity || 'Gandhidham'}, Gujarat.`);

  // Reference details
  const refNo = (invoice.rfqNumber || invoice.invoiceNumber || 'SRG/2026-27/Q-304').trim();
  const dateStr = invoice.date || '10-09-2026';
  const validExpiry = (invoice.validUntil || (invoice.validityDays ? `${invoice.validityDays} Days` : '')).trim();

  // Subject line (exact format from user's image)
  let rawSubject = invoice.quotationSubject?.trim();
  if (!rawSubject) {
    const itemDesc = invoice.items?.[0]?.name ? invoice.items[0].name.toUpperCase() : 'ESP FABRICATION & ERECTION WITH DISMATLING WORK';
    const clientName = (invoice.partyName || 'MONO STEEL INDIA LIMITED').toUpperCase();
    const cityState = (invoice.partyCity || invoice.partyState || 'GANDHIDHAM KUTCH GUJARAT, (INDIA)').toUpperCase();
    rawSubject = `TECHNO - COMMERCIAL OFFER FOR, ${itemDesc} M/S ${clientName}. ${cityState}`;
  }
  const displaySubject = rawSubject.toUpperCase().startsWith('SUBJECT')
    ? rawSubject
    : `SUBJECT: ${rawSubject}`;

  // Intro paragraph
  const introText = invoice.quotationIntroText?.trim() ||
    `Inviting reference to the discussions had with our project team for the subjected project works, here-with we are pleased to submit our"Techno - Commercial Offer"for the same as depicted below.`;

  // Parse terms into an array of clean strings
  const rawTerms = invoice.terms?.trim() || businessProfile.quotationTermsAndConditions?.trim() || '';
  let parsedTerms: string[] = [];

  if (rawTerms.length > 0) {
    const lines = rawTerms.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    parsedTerms = lines.map(line => line.replace(/^\d+[\.\)\-]\s*/, '').trim()).filter(t => t.length > 0);
  }

  if (parsedTerms.length === 0) {
    parsedTerms = DEFAULT_TECHNO_TERMS;
  }

  // Items list
  const items = invoice.items || [];

  // Helper to check if string contains "suhel ansari" or personal name
  const isSuhelAnsari = (str?: string) => {
    if (!str) return false;
    const lower = str.trim().toLowerCase();
    return lower === 'suhel ansari' || lower.includes('ansari') || lower.includes('suhel ansari');
  };

  // Determine active watermark text
  let activeWatermark: string | null = null;
  if (showCenterWatermark && watermark && watermark !== 'NONE' && !isSuhelAnsari(watermark)) {
    activeWatermark = watermark;
  }

  // Watermark color strength
  const watermarkTextColor = watermarkVisual === 'DARK'
    ? 'rgba(15, 23, 42, 0.85)'
    : watermarkVisual === 'BOLD'
    ? 'rgba(15, 23, 42, 0.65)'
    : watermarkVisual === 'LIGHT'
    ? 'rgba(15, 23, 42, 0.22)'
    : 'rgba(15, 23, 42, 0.45)';

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
            fontSize: activeWatermark.length > 22 ? '3.2rem' : activeWatermark.length > 14 ? '4.2rem' : '5.2rem',
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

  // Signatory company name (Defaults strictly to business profile name as configured in Company & GST Details)
  const companySignatoryName = businessProfile.name || businessProfile.tradeName || 'SR GROUP';

  return (
    <div className="multi-page-doc w-full bg-slate-200/70 print:bg-white flex flex-col items-center gap-6 print:gap-0 font-sans text-slate-900">
      
      {/* ========================================================================= */}
      {/* PAGE 1: TECHNO - COMMERCIAL OFFER (MATCHING USER'S PHOTO EXACTLY)       */}
      {/* ========================================================================= */}
      <div 
        className="a4-page relative w-[794px] min-h-[1123px] max-h-[1123px] bg-white text-slate-900 shadow-xl print:shadow-none flex flex-col justify-between box-border overflow-hidden"
        style={{
          width: '794px',
          height: '1123px',
          maxHeight: '1123px',
          paddingTop: `${topPadOffset}px`,
          paddingBottom: `${bottomPadOffset}px`,
          paddingLeft: '42px',
          paddingRight: '42px',
          boxSizing: 'border-box',
        }}
      >
        {/* Background Bill Pad Letterhead */}
        {renderPadBackground()}

        {/* Optional Diagonal Watermark */}
        {renderWatermark()}

        {/* Content Container on Page 1 */}
        <div 
          className="relative z-10 flex-1 flex flex-col justify-between"
          style={{
            transform: contentScale && contentScale !== 100 ? `scale(${contentScale / 100})` : undefined,
            transformOrigin: verticalAlignment === 'center' ? 'center center' : 'top center',
          }}
        >
          
          <div className="space-y-3.5">
            {/* 1. TOP HEADER: CLIENT INFO (LEFT) & METADATA (RIGHT) */}
            <div className="flex justify-between items-start pt-1 text-[11.5px] leading-snug">
              {/* Left Column: Client Name & Office Address */}
              <div className="max-w-[58%] text-slate-950">
                <div className="font-bold text-[13.5px] text-slate-950 mb-0.5">
                  {partyName}
                </div>
                <div className="text-[11px] text-slate-900 space-y-0.5">
                  <p>{line1.startsWith('Office') ? line1 : `Office :${line1}`}</p>
                  {line2 && <p>{line2}</p>}
                  {line3 && <p>{line3}</p>}
                  {invoice.partyGstin && (
                    <p className="font-semibold text-slate-950 mt-0.5">
                      GSTIN : <span className="font-mono">{invoice.partyGstin}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: REF NO, DATE, VALID EXPIRY */}
              <div className="w-[40%] text-left pl-6 font-medium text-[11px] space-y-1.5 text-slate-950">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-950 min-w-[82px]">REF NO :</span>
                  <span className="font-semibold text-slate-950">{refNo}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-950 min-w-[82px]">DATE :</span>
                  <span className="font-semibold text-slate-950">{dateStr}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-950 min-w-[82px]">VALID EXPIRY :</span>
                  <span className="font-semibold text-slate-950">{validExpiry}</span>
                </div>
              </div>
            </div>

            {/* 2. SUBJECT LINE */}
            <div className="pt-2 text-[11px] leading-relaxed text-slate-950 font-bold">
              <span>{displaySubject}</span>
            </div>

            {/* 3. SALUTATION */}
            <div className="pt-1 text-[11.5px] font-semibold text-slate-950">
              Dear sir
            </div>

            {/* 4. INTRODUCTORY TEXT */}
            <div className="text-[11px] text-slate-900 leading-relaxed text-center px-4">
              {introText}
            </div>

            {/* 5. TECHNICAL OFFER SECTION TITLE */}
            <div className="pt-2 font-bold text-[11px] uppercase tracking-wide text-slate-950">
              TECHNICAL OFFER
            </div>

            {/* 6. TECHNICAL OFFER TABLE */}
            <div className={`w-full border border-black text-slate-950 ${contentCardBg}`}>
              <table className="w-full border-collapse text-xs bg-transparent">
                <thead>
                  <tr className="bg-[#b0c4de]/90 text-slate-950 font-bold uppercase text-[10px] tracking-tight">
                    <th className="border border-black py-1.5 px-1 text-center w-[8%]">
                      SL NO.
                    </th>
                    <th className="border border-black py-1.5 px-2 text-center w-[48%]">
                      ITEM DISCRIPTION
                    </th>
                    <th className="border border-black py-1.5 px-1 text-center w-[8%]">
                      UOM
                    </th>
                    <th className="border border-black py-1.5 px-1 text-center w-[8%]">
                      QTY
                    </th>
                    <th className="border border-black py-1.5 px-1 text-center w-[13%]">
                      RATE
                    </th>
                    <th className="border border-black py-1.5 px-1 text-center w-[15%]">
                      REMARKS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent">
                  {items.map((item, index) => (
                    <tr key={item.id || index} className="text-[10.5px] text-slate-950 h-6 bg-transparent">
                      <td className="border border-black py-0.5 px-1 text-center font-medium bg-transparent">
                        {index + 1}
                      </td>
                      <td className="border border-black py-0.5 px-2 text-left font-medium bg-transparent">
                        <div>{item.name}</div>
                        {item.description && (
                          <div className="text-[9px] text-slate-700 font-normal mt-0.5 whitespace-pre-line">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="border border-black py-0.5 px-1 text-center font-medium uppercase bg-transparent">
                        {item.unit || 'MT'}
                      </td>
                      <td className="border border-black py-0.5 px-1 text-center font-medium bg-transparent">
                        {item.quantity}
                      </td>
                      <td className="border border-black py-0.5 px-1 text-center font-medium font-mono bg-transparent">
                        {item.rate > 0 ? (item.rate % 1 === 0 ? item.rate.toString() : formatIndianCurrency(item.rate)) : ''}
                      </td>
                      <td className="border border-black py-0.5 px-1 text-center font-medium text-[9.5px] bg-transparent">
                        {item.remarks || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* 7. PAGE 1 BOTTOM RIGHT SIGNATORY BLOCK */}
          <div className="pt-6 pb-2 flex justify-end items-end">
            <div className="text-right space-y-6">
              <div className="font-bold text-[11px] text-slate-950 tracking-wide uppercase">
                FOR, {companySignatoryName}
              </div>

              {businessProfile.signatureUrl && (
                <div className="flex justify-end -my-3 pointer-events-none">
                  <img 
                    src={businessProfile.signatureUrl} 
                    alt="Signature" 
                    className="h-10 object-contain select-none mix-blend-multiply"
                  />
                </div>
              )}

              <div className="text-center ml-auto">
                <span className="text-[11px] font-bold text-slate-950 block">
                  Authorised Signatury
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: TERMS & CONDITIONS (MATCHING USER'S PHOTO EXACTLY)               */}
      {/* ========================================================================= */}
      {termsPageBreak && (
        <div 
          className="a4-page relative w-[794px] min-h-[1123px] max-h-[1123px] bg-white text-slate-900 shadow-xl print:shadow-none flex flex-col justify-between box-border overflow-hidden"
          style={{
            width: '794px',
            height: '1123px',
            maxHeight: '1123px',
            paddingTop: `${topPadOffset}px`,
            paddingBottom: `${bottomPadOffset}px`,
            paddingLeft: '42px',
            paddingRight: '42px',
            boxSizing: 'border-box',
          }}
        >
          {/* Background Bill Pad Letterhead on Page 2 */}
          {renderPadBackground()}

          {/* Optional Diagonal Watermark */}
          {renderWatermark()}

          {/* Content Container on Page 2 (Starts right below the header line) */}
          <div 
            className="relative z-10 w-full flex-1 flex flex-col justify-between"
            style={{
              transform: contentScale && contentScale !== 100 ? `scale(${contentScale / 100})` : undefined,
              transformOrigin: verticalAlignment === 'center' ? 'center center' : 'top center',
            }}
          >
            <div>
              {/* Heading */}
              <div className="font-bold text-[12.5px] uppercase tracking-wide text-slate-950 mb-5">
                TERMS &amp; CONDITIONS
              </div>

              {/* Numbered Terms List with spacing between points matching user's photo */}
              <div className="space-y-3.5 text-[10.5px] leading-relaxed text-slate-950">
                {parsedTerms.map((term, index) => (
                  <div key={index} className="flex items-start gap-1.5">
                    <span className="font-bold min-w-[18px] text-slate-950 shrink-0">
                      {index + 1}.
                    </span>
                    <p className="flex-1 text-slate-950 font-normal leading-relaxed">
                      {renderMarkdownText(term)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Signatory on Page 2 */}
            <div className="pt-4 pb-2 flex justify-end items-end">
              <div className="text-right space-y-6">
                <div className="font-bold text-[10.5px] text-slate-950 tracking-wide uppercase">
                  FOR, {companySignatoryName}
                </div>

                {businessProfile.signatureUrl && (
                  <div className="flex justify-end -my-3 pointer-events-none">
                    <img 
                      src={businessProfile.signatureUrl} 
                      alt="Signature" 
                      className="h-9 object-contain select-none mix-blend-multiply" 
                    />
                  </div>
                )}

                <div className="text-center ml-auto">
                  <span className="text-[10.5px] font-bold text-slate-950 block">
                    Authorised Signatury
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
