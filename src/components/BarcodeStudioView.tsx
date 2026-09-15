import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, QrCode, Tag, LayoutGrid, Sliders, CheckCircle2, 
  RefreshCw, Copy, Download, Search, Sparkles, AlertCircle, ShoppingBag, Loader2
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Item, BusinessProfile } from '../types';
import { downloadElementAsPdf, printElementSafely } from '../utils/pdfExport';

interface BarcodeStudioViewProps {
  items: Item[];
  businessProfile: BusinessProfile;
}

type LabelFormat = 'THERMAL_50X25' | 'THERMAL_38X25' | 'BOX_75X50' | 'A4_SHEET_24' | 'A4_SHEET_40';
type BarcodeFormat = 'CODE128' | 'EAN13' | 'CODE39' | 'QR';

export const BarcodeStudioView: React.FC<BarcodeStudioViewProps> = ({
  items = [],
  businessProfile,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || '');
  const [customText, setCustomText] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [customMrp, setCustomMrp] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('B-2026/08');
  const [expDate, setExpDate] = useState<string>('08/2028');
  const [printQuantity, setPrintQuantity] = useState<number>(12);
  
  // Customization options
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('THERMAL_50X25');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('CODE128');
  const [showBusinessName, setShowBusinessName] = useState(true);
  const [showItemName, setShowItemName] = useState(true);
  const [showMrp, setShowMrp] = useState(true);
  const [showSellingPrice, setShowSellingPrice] = useState(true);
  const [showHsn, setShowHsn] = useState(true);
  const [showBatchExp, setShowBatchExp] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const selectedItem = (items || []).find(i => i.id === selectedItemId);

  // Derived barcode value
  const barcodeValue = selectedItem?.barcode || selectedItem?.sku || customText || '890123456701';
  const itemName = selectedItem?.name || customText || 'Standard Retail Product';
  const sellingPrice = selectedItem ? selectedItem.sellingPrice : (parseFloat(customPrice) || 999);
  const mrp = selectedItem ? Math.round(selectedItem.sellingPrice * 1.25) : (parseFloat(customMrp) || 1299);
  const hsnCode = selectedItem?.hsnCode || '8471';

  // Barcode SVG Ref for Single Preview
  const previewBarcodeRef = useRef<SVGSVGElement | null>(null);

  // Generate barcode or QR code
  useEffect(() => {
    if (barcodeFormat === 'QR') {
      QRCode.toDataURL(barcodeValue, { width: 100, margin: 1 })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error(err));
    } else {
      if (previewBarcodeRef.current) {
        try {
          // Clean barcode value for standard formats
          let cleanVal = barcodeValue.replace(/[^A-Za-z0-9]/g, '');
          if (barcodeFormat === 'EAN13') {
            cleanVal = cleanVal.padEnd(13, '0').slice(0, 13);
          }
          JsBarcode(previewBarcodeRef.current, cleanVal, {
            format: barcodeFormat,
            width: labelFormat === 'THERMAL_38X25' ? 1.2 : 1.5,
            height: labelFormat === 'THERMAL_38X25' ? 24 : 32,
            displayValue: true,
            fontSize: 9,
            margin: 2,
            background: 'transparent',
          });
        } catch (e) {
          // Fallback to CODE128 if EAN13 checksum fails
          try {
            JsBarcode(previewBarcodeRef.current, barcodeValue, {
              format: 'CODE128',
              width: 1.4,
              height: 30,
              displayValue: true,
              fontSize: 9,
              margin: 2,
              background: 'transparent',
            });
          } catch {
            // silent ignore
          }
        }
      }
    }
  }, [barcodeValue, barcodeFormat, labelFormat]);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const sheetPrintRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (sheetPrintRef.current) {
      printElementSafely(sheetPrintRef.current, `Barcodes_${itemName || 'Labels'}`);
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!sheetPrintRef.current) return;
    setIsDownloadingPdf(true);
    try {
      await downloadElementAsPdf(sheetPrintRef.current, `Labels_${itemName || 'Sheet'}.pdf`, {
        scale: 2.2,
      });
    } catch (e) {
      console.error(e);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Generate stickers array for print
  const stickers = Array.from({ length: printQuantity }, (_, idx) => ({ id: idx }));

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 font-heading">Barcode & Label Print Studio</h1>
            <span className="text-[11px] font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              Label Maker
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate and print barcode/QR stickers for your products, thermal rolls (50x25mm), and A4 sticker sheets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            title="Download labels sheet as PDF"
          >
            {isDownloadingPdf ? (
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
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print {printQuantity} Labels</span>
          </button>
        </div>
      </div>

      {/* Main Studio Controls + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        
        {/* Left Settings Sidebar (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-blue-600" />
            Label Configuration
          </h3>

          {/* 1. Select Product from Inventory */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Select Product from Inventory</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Or Custom Product --</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} (₹{item.sellingPrice}) {item.barcode ? `[${item.barcode}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {!selectedItemId && (
            <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Custom Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Wireless Mouse"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    placeholder="999"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    placeholder="1299"
                    value={customMrp}
                    onChange={(e) => setCustomMrp(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. Sticker Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Label Size / Format</label>
              <select
                value={labelFormat}
                onChange={(e) => setLabelFormat(e.target.value as LabelFormat)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="THERMAL_50X25">50mm × 25mm (Thermal Roll 2"x1")</option>
                <option value="THERMAL_38X25">38mm × 25mm (Compact Retail)</option>
                <option value="BOX_75X50">75mm × 50mm (Box / Carton)</option>
                <option value="A4_SHEET_24">A4 Sheet (24 Labels - 3×8)</option>
                <option value="A4_SHEET_40">A4 Sheet (40 Labels - 4×10)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Barcode Type</label>
              <select
                value={barcodeFormat}
                onChange={(e) => setBarcodeFormat(e.target.value as BarcodeFormat)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="CODE128">Code 128 (Standard Alpha-Numeric)</option>
                <option value="EAN13">EAN-13 (13 Digit Retail)</option>
                <option value="CODE39">Code 39</option>
                <option value="QR">2D QR Code</option>
              </select>
            </div>
          </div>

          {/* 3. Number of Stickers to Print */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Print Quantity</label>
              <input
                type="number"
                min="1"
                max="240"
                value={printQuantity}
                onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Batch / Lot No.</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* 4. Display Toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-700 block mb-1">Fields on Sticker:</span>
            
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBusinessName}
                  onChange={(e) => setShowBusinessName(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Company Name</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showItemName}
                  onChange={(e) => setShowItemName(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Item Name</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSellingPrice}
                  onChange={(e) => setShowSellingPrice(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Our Price (₹)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMrp}
                  onChange={(e) => setShowMrp(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>MRP Strike-through</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHsn}
                  onChange={(e) => setShowHsn(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>HSN Code</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBatchExp}
                  onChange={(e) => setShowBatchExp(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Batch & Expiry</span>
              </label>
            </div>
          </div>

        </div>

        {/* Right Live Preview Sheet (7 cols) */}
        <div className="lg:col-span-7 bg-slate-200 p-6 rounded-2xl border border-slate-300 flex flex-col items-center justify-center min-h-[420px]">
          
          <div className="text-center mb-3">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-white/80 px-3 py-1 rounded-full shadow-xs">
              Live Sticker Label Preview (Single Unit)
            </span>
          </div>

          {/* Single Sticker Card Simulation */}
          <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-400 w-[240px] min-h-[140px] flex flex-col justify-between items-center text-center font-sans">
            
            {showBusinessName && (
              <div className="text-[10px] font-black uppercase text-slate-800 tracking-wider truncate w-full border-b border-slate-200 pb-0.5">
                {businessProfile.name}
              </div>
            )}

            {showItemName && (
              <div className="text-[11px] font-extrabold text-slate-900 leading-tight line-clamp-2 my-1 px-1">
                {itemName}
              </div>
            )}

            {/* Barcode Graphic */}
            <div className="my-1 flex items-center justify-center w-full">
              {barcodeFormat === 'QR' ? (
                qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-16 h-16" />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-[10px]">QR Code</div>
                )
              ) : (
                <svg ref={previewBarcodeRef} className="max-w-full h-auto" />
              )}
            </div>

            {/* Price & HSN Details */}
            <div className="w-full flex items-center justify-between text-[10px] pt-1 border-t border-slate-200 mt-auto font-medium">
              {showHsn && <span className="text-slate-500 font-mono">HSN: {hsnCode}</span>}
              
              <div className="flex items-center gap-1.5 ml-auto">
                {showMrp && (
                  <span className="line-through text-slate-400 text-[9px]">
                    MRP: ₹{mrp}
                  </span>
                )}
                {showSellingPrice && (
                  <span className="font-black text-slate-900 text-xs">
                    ₹{sellingPrice}
                  </span>
                )}
              </div>
            </div>

            {showBatchExp && (
              <div className="w-full flex items-center justify-between text-[8px] text-slate-500 pt-0.5">
                <span>Lot: {batchNumber}</span>
                <span>Exp: {expDate}</span>
              </div>
            )}

          </div>

          <div className="mt-4 text-xs text-slate-600 flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Click the print button above to output directly to thermal sticker roll or laser A4 sheet.</span>
          </div>

        </div>

      </div>

      {/* --- PRINT SHEET CONTAINER (Accessible for PDF export & @media print) --- */}
      <div 
        ref={sheetPrintRef}
        className="printable-area fixed -left-[9999px] top-0 w-[210mm] bg-white p-4 print:static print:block print:w-full"
      >
        <div className={`grid gap-2 ${
          labelFormat === 'A4_SHEET_24' 
            ? 'grid-cols-3' 
            : labelFormat === 'A4_SHEET_40' 
            ? 'grid-cols-4' 
            : 'grid-cols-2'
        }`}>
          {stickers.map((stk) => (
            <div 
              key={stk.id}
              className="p-2 border border-slate-300 rounded bg-white text-center flex flex-col justify-between items-center break-inside-avoid text-slate-900"
              style={{ minHeight: labelFormat === 'THERMAL_38X25' ? '90px' : '110px' }}
            >
              {showBusinessName && (
                <div className="text-[9px] font-black uppercase tracking-wider truncate w-full border-b border-slate-200 pb-0.5">
                  {businessProfile.name}
                </div>
              )}

              {showItemName && (
                <div className="text-[10px] font-bold leading-tight line-clamp-2 my-0.5">
                  {itemName}
                </div>
              )}

              {/* Barcode representation */}
              <div className="my-0.5 flex items-center justify-center">
                {barcodeFormat === 'QR' && qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="QR" className="w-14 h-14" />
                ) : (
                  <div className="font-mono text-center">
                    <div className="text-sm tracking-widest font-black">||| | |||| | |||</div>
                    <div className="text-[9px] font-bold">{barcodeValue}</div>
                  </div>
                )}
              </div>

              {/* Prices */}
              <div className="w-full flex items-center justify-between text-[9px] pt-0.5 border-t border-slate-200">
                {showHsn && <span className="text-[8px] text-slate-600">HSN:{hsnCode}</span>}
                <div className="flex items-center gap-1 ml-auto font-bold">
                  {showMrp && <span className="line-through text-slate-400 text-[8px]">₹{mrp}</span>}
                  {showSellingPrice && <span className="text-[11px] font-black">₹{sellingPrice}</span>}
                </div>
              </div>

              {showBatchExp && (
                <div className="w-full flex items-center justify-between text-[7px] text-slate-500">
                  <span>B:{batchNumber}</span>
                  <span>Exp:{expDate}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
