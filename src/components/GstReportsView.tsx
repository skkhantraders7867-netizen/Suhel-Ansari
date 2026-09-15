import React, { useState } from 'react';
import { 
  FileSpreadsheet, Download, ShieldCheck, 
  TrendingUp, Calendar, Filter, FileText, CheckCircle2, ArrowUpRight
} from 'lucide-react';
import { Invoice, BusinessProfile } from '../types';
import { formatIndianCurrency, downloadCSV } from '../utils/gstCalculations';

interface GstReportsViewProps {
  invoices: Invoice[];
  businessProfile: BusinessProfile;
}

export const GstReportsView: React.FC<GstReportsViewProps> = ({
  invoices,
  businessProfile,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'GSTR1' | 'GSTR3B' | 'HSN_SUMMARY' | 'PROFIT_LOSS'>('GSTR1');
  const [selectedMonth, setSelectedMonth] = useState('2026-08');

  // Filter invoices for GST computations (Only Tax Invoices and Purchases count)
  const salesInvoices = invoices.filter(i => i.documentType === 'TAX_INVOICE');
  const purchaseBills = invoices.filter(i => i.documentType === 'PURCHASE_BILL');

  // GSTR-1 Categorization
  // 1. B2B: Registered parties with GSTIN
  const b2bInvoices = salesInvoices.filter(i => !!i.partyGstin && i.partyGstin.trim().length === 15);
  // 2. B2CS / B2C: Unregistered customers
  const b2cInvoices = salesInvoices.filter(i => !i.partyGstin || i.partyGstin.trim().length !== 15);

  // Totals for GSTR-3B (3.1.a Outward Taxable Supplies)
  const totalTaxableOutward = salesInvoices.reduce((s, i) => s + i.taxableTotal, 0);
  const totalCgstOutward = salesInvoices.reduce((s, i) => s + i.cgstTotal, 0);
  const totalSgstOutward = salesInvoices.reduce((s, i) => s + i.sgstTotal, 0);
  const totalIgstOutward = salesInvoices.reduce((s, i) => s + i.igstTotal, 0);

  // ITC from Purchases (4.A Eligible ITC)
  const totalTaxableInward = purchaseBills.reduce((s, i) => s + i.taxableTotal, 0);
  const totalCgstInward = purchaseBills.reduce((s, i) => s + i.cgstTotal, 0);
  const totalSgstInward = purchaseBills.reduce((s, i) => s + i.sgstTotal, 0);
  const totalIgstInward = purchaseBills.reduce((s, i) => s + i.igstTotal, 0);

  // Net Tax Payable
  const netCgstPayable = Math.max(0, totalCgstOutward - totalCgstInward);
  const netSgstPayable = Math.max(0, totalSgstOutward - totalSgstInward);
  const netIgstPayable = Math.max(0, totalIgstOutward - totalIgstInward);
  const netTotalPayable = netCgstPayable + netSgstPayable + netIgstPayable;

  // HSN-wise Summary Aggregation
  const hsnMap: { [hsn: string]: { description: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number; total: number; rate: number } } = {};
  salesInvoices.forEach(inv => {
    inv.items.forEach(item => {
      const code = item.hsnCode || 'OTHER';
      if (!hsnMap[code]) {
        hsnMap[code] = {
          description: item.name,
          qty: 0,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: 0,
          rate: item.taxRate,
        };
      }
      hsnMap[code].qty += item.quantity;
      hsnMap[code].taxable += item.taxableAmount;
      hsnMap[code].cgst += item.cgstAmount;
      hsnMap[code].sgst += item.sgstAmount;
      hsnMap[code].igst += item.igstAmount;
      hsnMap[code].total += item.totalAmount;
    });
  });

  const hsnSummaryList = Object.keys(hsnMap).map(code => ({ code, ...hsnMap[code] }));

  // CSV Exporters
  const handleExportGstr1 = () => {
    const headers = ['Table', 'GSTIN/UIN', 'Receiver Name', 'Invoice Number', 'Invoice Date', 'Invoice Value', 'Place of Supply', 'Reverse Charge', 'Rate', 'Taxable Value', 'Cess Amount'];
    const rows = b2bInvoices.map(inv => [
      '4A-B2B',
      inv.partyGstin,
      `"${inv.partyName}"`,
      inv.invoiceNumber,
      inv.date,
      inv.grandTotal,
      `"${inv.placeOfSupply}"`,
      inv.isReverseCharge ? 'Y' : 'N',
      inv.items[0]?.taxRate || 18,
      inv.taxableTotal,
      0
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, `GSTR1_B2B_${selectedMonth}_${businessProfile.gstin}.csv`);
  };

  const handleExportHsn = () => {
    const headers = ['HSN Code', 'Description', 'Total Qty', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Value'];
    const rows = hsnSummaryList.map(h => [
      h.code,
      `"${h.description}"`,
      h.qty,
      h.taxable,
      h.cgst,
      h.sgst,
      h.igst,
      h.total
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, `GSTR1_Table12_HSN_Summary_${selectedMonth}.csv`);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-mono">
              GSTIN: {businessProfile.gstin}
            </span>
            <span className="text-xs text-slate-500">• Tax Filing Period: August 2026</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">GST Reports & Tax Filing Computation</h1>
          <p className="text-xs text-slate-500">Government compliant GSTR-1, GSTR-3B, HSN Table 12, and Input Tax Credit (ITC)</p>
        </div>

        <div className="flex items-center gap-2">
          {activeReportTab === 'GSTR1' && (
            <button
              onClick={handleExportGstr1}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" /> Export GSTR-1 CSV
            </button>
          )}

          {activeReportTab === 'HSN_SUMMARY' && (
            <button
              onClick={handleExportHsn}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" /> Export HSN Summary CSV
            </button>
          )}
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveReportTab('GSTR1')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeReportTab === 'GSTR1' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> GSTR-1 (Outward Supplies)
        </button>

        <button
          onClick={() => setActiveReportTab('GSTR3B')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeReportTab === 'GSTR3B' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> GSTR-3B (Tax Computation & ITC)
        </button>

        <button
          onClick={() => setActiveReportTab('HSN_SUMMARY')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeReportTab === 'HSN_SUMMARY' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" /> HSN Summary (Table 12)
        </button>
      </div>

      {/* TAB 1: GSTR-1 REPORT */}
      {activeReportTab === 'GSTR1' && (
        <div className="space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">4A - B2B Invoices</span>
              <div className="font-mono text-xl font-bold text-blue-900">
                {formatIndianCurrency(b2bInvoices.reduce((s, i) => s + i.grandTotal, 0))}
              </div>
              <div className="text-xs text-slate-500">{b2bInvoices.length} Registered GST invoices</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">7 - B2C Small Supplies</span>
              <div className="font-mono text-xl font-bold text-emerald-900">
                {formatIndianCurrency(b2cInvoices.reduce((s, i) => s + i.grandTotal, 0))}
              </div>
              <div className="text-xs text-slate-500">{b2cInvoices.length} Consumer invoices</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total Tax Liability (GSTR-1)</span>
              <div className="font-mono text-xl font-bold text-slate-900">
                {formatIndianCurrency(totalCgstOutward + totalSgstOutward + totalIgstOutward)}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                CGST: {formatIndianCurrency(totalCgstOutward, false)} | SGST: {formatIndianCurrency(totalSgstOutward, false)}
              </div>
            </div>
          </div>

          {/* B2B Invoices Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700">
              4A - B2B Invoices (Registered Parties)
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                    <th className="py-2.5 px-4">Party GSTIN</th>
                    <th className="py-2.5 px-4">Receiver Name</th>
                    <th className="py-2.5 px-3 font-mono">Invoice #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {b2bInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{inv.partyGstin}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{inv.partyName}</td>
                      <td className="py-3 px-3 font-mono font-medium">{inv.invoiceNumber}</td>
                      <td className="py-3 px-3 text-slate-600">{inv.date}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatIndianCurrency(inv.taxableTotal, false)}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatIndianCurrency(inv.cgstTotal, false)}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatIndianCurrency(inv.sgstTotal, false)}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatIndianCurrency(inv.igstTotal, false)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(inv.grandTotal, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: GSTR-3B COMPUTATION & ITC */}
      {activeReportTab === 'GSTR3B' && (
        <div className="space-y-6">
          
          {/* Main GSTR-3B Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm">GSTR-3B Monthly Tax Return Summary</h2>
                <p className="text-xs text-slate-400">Section 3.1 Outward supplies & Section 4 Eligible Input Tax Credit (ITC)</p>
              </div>
              <span className="font-mono text-xs bg-slate-800 text-emerald-400 px-3 py-1 rounded-lg border border-slate-700">
                FY 2026-27
              </span>
            </div>

            <div className="p-5 space-y-6 text-xs">
              
              {/* 3.1 Outward Supplies */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm border-b pb-1.5">
                  3.1 Details of Outward Supplies and inward supplies liable to reverse charge
                </h3>
                <table className="w-full text-left border border-slate-200">
                  <thead className="bg-slate-100 font-semibold text-slate-700">
                    <tr>
                      <th className="p-2.5 border-r border-slate-200">Nature of Supplies</th>
                      <th className="p-2.5 text-right border-r border-slate-200">Taxable Value</th>
                      <th className="p-2.5 text-right border-r border-slate-200">IGST</th>
                      <th className="p-2.5 text-right border-r border-slate-200">CGST</th>
                      <th className="p-2.5 text-right">SGST/UTGST</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-200">
                      <td className="p-2.5 font-medium border-r border-slate-200">
                        (a) Outward taxable supplies (other than zero rated, nil rated and exempted)
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold border-r border-slate-200">{formatIndianCurrency(totalTaxableOutward)}</td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-200">{formatIndianCurrency(totalIgstOutward)}</td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-200">{formatIndianCurrency(totalCgstOutward)}</td>
                      <td className="p-2.5 text-right font-mono">{formatIndianCurrency(totalSgstOutward)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4 Eligible ITC */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm border-b pb-1.5">
                  4. Eligible Input Tax Credit (ITC from Inward Purchases)
                </h3>
                <table className="w-full text-left border border-slate-200">
                  <thead className="bg-slate-100 font-semibold text-slate-700">
                    <tr>
                      <th className="p-2.5 border-r border-slate-200">Details</th>
                      <th className="p-2.5 text-right border-r border-slate-200">IGST</th>
                      <th className="p-2.5 text-right border-r border-slate-200">CGST</th>
                      <th className="p-2.5 text-right">SGST/UTGST</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-200">
                      <td className="p-2.5 font-medium border-r border-slate-200">
                        (A) ITC Available (All other ITC - Purchase Bills)
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-200">{formatIndianCurrency(totalIgstInward)}</td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-200">{formatIndianCurrency(totalCgstInward)}</td>
                      <td className="p-2.5 text-right font-mono">{formatIndianCurrency(totalSgstInward)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Final Net Tax Payable in Cash */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">Net Tax Payable in Cash / Bank Ledger</span>
                  <span className="text-slate-500 text-[11px]">(Output Tax Liability minus Eligible ITC)</span>
                </div>
                <div className="font-mono font-black text-xl text-blue-900">
                  {formatIndianCurrency(netTotalPayable)}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 3: HSN SUMMARY TABLE 12 */}
      {activeReportTab === 'HSN_SUMMARY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700">
            Table 12 - HSN-wise Summary of Outward Supplies
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-2.5 px-4 font-mono">HSN Code</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-center">GST %</th>
                  <th className="py-2.5 px-3 text-right">Taxable Amount (₹)</th>
                  <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                  <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                  <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                  <th className="py-2.5 px-4 text-right">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hsnSummaryList.map(h => (
                  <tr key={h.code} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">{h.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{h.description}</td>
                    <td className="py-3 px-3 text-center font-mono">{h.qty}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">{h.rate}%</td>
                    <td className="py-3 px-3 text-right font-mono">{formatIndianCurrency(h.taxable, false)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatIndianCurrency(h.cgst, false)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatIndianCurrency(h.sgst, false)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatIndianCurrency(h.igst, false)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(h.total, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
