import React, { useState, useMemo, useRef } from 'react';
import { 
  Truck, Plus, Search, Download, Printer, Eye, 
  CheckCircle2, XCircle, Clock, AlertTriangle, FileJson, 
  MapPin, ShieldCheck, ArrowRight, RefreshCw, Sparkles, X, Loader2
} from 'lucide-react';
import QRCode from 'qrcode';
import { EWayBillRecord, Invoice, BusinessProfile, DocumentType } from '../types';
import { downloadElementAsPdf, printElementSafely } from '../utils/pdfExport';

interface EwayBillsViewProps {
  ewayBills: EWayBillRecord[];
  invoices: Invoice[];
  businessProfile: BusinessProfile;
  onAddEwayBill: (ewb: Omit<EWayBillRecord, 'id' | 'generatedAt'>) => void;
  onUpdateEwayStatus: (id: string, status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED') => void;
}

export const EwayBillsView: React.FC<EwayBillsViewProps> = ({
  ewayBills = [],
  invoices = [],
  businessProfile,
  onAddEwayBill,
  onUpdateEwayStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [viewingEwb, setViewingEwb] = useState<EWayBillRecord | null>(null);
  const [ewbQrUrl, setEwbQrUrl] = useState<string>('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const ewbPrintRef = useRef<HTMLDivElement>(null);

  // Selected invoice for generation
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');

  // Form details
  const [transporterName, setTransporterName] = useState('VRL Logistics India Ltd');
  const [transporterId, setTransporterId] = useState('29AABCV1234F1Z1');
  const [vehicleNumber, setVehicleNumber] = useState('MH43AZ9021');
  const [transportMode, setTransportMode] = useState<'ROAD' | 'RAIL' | 'AIR' | 'SHIP'>('ROAD');
  const [distanceKm, setDistanceKm] = useState<number>(45);
  const [supplyType, setSupplyType] = useState<'OUTWARD' | 'INWARD'>('OUTWARD');
  const [subSupplyType, setSubSupplyType] = useState<EWayBillRecord['subSupplyType']>('SUPPLY');
  const [toPincode, setToPincode] = useState('400069');

  // Filtered E-Way Bills
  const filteredEwb = useMemo(() => {
    return (ewayBills || []).filter(ewb => {
      const matchesSearch = 
        ewb.ewayBillNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ewb.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ewb.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ewb.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'ALL' || ewb.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [ewayBills, searchTerm, filterStatus]);

  // Invoices eligible for E-Way Bill (e.g. Total >= 50,000 or Inter-State)
  const eligibleInvoices = useMemo(() => {
    return (invoices || []).filter(inv => inv.documentType === 'TAX_INVOICE' || inv.documentType === 'DELIVERY_CHALLAN');
  }, [invoices]);

  // Open generator with pre-filled invoice
  const handleOpenGeneratorForInvoice = (inv: Invoice) => {
    setSelectedInvoiceId(inv.id);
    setTransporterName(inv.transport?.transporterName || 'Safexpress Logistics');
    setTransporterId(inv.transport?.transporterId || '07AAACS1928L1Z9');
    setVehicleNumber(inv.transport?.vehicleNumber || 'MH04AB9821');
    setDistanceKm(inv.transport?.distanceKm || (inv.isInterState ? 850 : 35));
    setToPincode(inv.partyAddress.match(/\b\d{6}\b/)?.[0] || '400001');
    setIsGenerateModalOpen(true);
  };

  // Generate official EWB record
  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inv = (invoices || []).find(i => i.id === selectedInvoiceId);
    if (!inv) {
      alert('Please select an invoice.');
      return;
    }

    // Auto calculate validity: 1 day for each 200 KM + 1 day base
    const daysValid = Math.max(1, Math.ceil(distanceKm / 200));
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + daysValid);
    const validUptoStr = `${validDate.toISOString().split('T')[0]} 23:59:00`;

    // Generate simulated 12-digit Indian E-Way Bill Number
    const random12 = `${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    onAddEwayBill({
      ewayBillNumber: random12,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.date,
      docType: inv.documentType,
      partyName: inv.partyName,
      partyGstin: inv.partyGstin,
      fromPincode: businessProfile.pincode || '',
      toPincode: toPincode || '',
      distanceKm: distanceKm,
      transporterName: transporterName.trim(),
      transporterId: transporterId.trim().toUpperCase(),
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      transportMode: transportMode,
      supplyType: supplyType,
      subSupplyType: subSupplyType,
      taxableAmount: inv.taxableTotal,
      totalInvoiceAmount: inv.grandTotal,
      validUpto: validUptoStr,
      status: 'ACTIVE',
    });

    setIsGenerateModalOpen(false);
  };

  // View & Generate QR for E-Way Bill Slip
  const handleViewEwb = (ewb: EWayBillRecord) => {
    setViewingEwb(ewb);
    const qrData = `EWB:${ewb.ewayBillNumber}|DOC:${ewb.invoiceNumber}|GSTIN:${businessProfile.gstin}|VEH:${ewb.vehicleNumber}|VAL:${ewb.validUpto}`;
    QRCode.toDataURL(qrData, { width: 140, margin: 1 })
      .then(url => setEwbQrUrl(url))
      .catch(err => console.error(err));
  };

  // Export Official NIC JSON Schema for ewaybillgst.gov.in
  const handleExportNICJson = (ewb: EWayBillRecord) => {
    const inv = (invoices || []).find(i => i.id === ewb.invoiceId);
    
    const nicPayload = {
      version: '1.0.0821',
      billLists: [
        {
          userGstin: businessProfile.gstin,
          supplyType: ewb.supplyType === 'OUTWARD' ? 'O' : 'I',
          subSupplyType: ewb.subSupplyType === 'SUPPLY' ? '1' : '8',
          docType: ewb.docType === 'TAX_INVOICE' ? 'INV' : 'CHL',
          docNo: ewb.invoiceNumber,
          docDate: ewb.invoiceDate.split('-').reverse().join('/'),
          fromGstin: businessProfile.gstin,
          fromTrdName: businessProfile.name,
          fromAddr1: businessProfile.address,
          fromPlace: businessProfile.city,
          fromPincode: parseInt(ewb.fromPincode) || 0,
          fromStateCode: parseInt(businessProfile.stateCode) || 0,
          toGstin: ewb.partyGstin || 'URP',
          toTrdName: ewb.partyName,
          toAddr1: inv?.partyAddress || '',
          toPlace: inv?.partyCity || inv?.partyState || '',
          toPincode: parseInt(ewb.toPincode) || 0,
          toStateCode: parseInt(inv?.partyStateCode || '0') || 0,
          totalValue: ewb.taxableAmount,
          cgstValue: inv?.cgstTotal || 0,
          sgstValue: inv?.sgstTotal || 0,
          igstValue: inv?.igstTotal || 0,
          cessValue: inv?.cessTotal || 0,
          totInvValue: ewb.totalInvoiceAmount,
          transMode: ewb.transportMode === 'ROAD' ? '1' : '2',
          transDistance: String(ewb.distanceKm),
          transporterId: ewb.transporterId,
          transporterName: ewb.transporterName,
          transDocNo: `TR-${ewb.invoiceNumber}`,
          transDocDate: ewb.invoiceDate.split('-').reverse().join('/'),
          vehNo: ewb.vehicleNumber,
          itemList: inv?.items.map((it, idx) => ({
            itemNo: idx + 1,
            productName: it.name,
            productDesc: it.description || it.name,
            hsnCode: parseInt(it.hsnCode) || 8471,
            quantity: it.quantity,
            qtyUnit: it.unit,
            taxableAmount: it.taxableAmount,
            cgstRate: it.taxRate / 2,
            sgstRate: it.taxRate / 2,
            igstRate: 0,
            cessRate: 0
          })) || []
        }
      ]
    };

    const blob = new Blob([JSON.stringify(nicPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EWayBill_NIC_${ewb.ewayBillNumber}_${ewb.invoiceNumber}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 font-heading">E-Way Bill & E-Invoicing Center</h1>
            <span className="text-[11px] font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              GST Portal Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate Government standard E-Way Bills for goods transport, export NIC JSON, and print vehicle transit slips.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (eligibleInvoices.length > 0) {
                handleOpenGeneratorForInvoice(eligibleInvoices[0]);
              } else {
                alert('No invoices available. Create a tax invoice first.');
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Generate E-Way Bill</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Active E-Way Bills</div>
            <div className="text-lg font-black text-slate-900">
              {ewayBills.filter(e => e.status === 'ACTIVE').length} In-Transit
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Total Goods Dispatched</div>
            <div className="text-lg font-black text-emerald-600">
              ₹{ewayBills.reduce((acc, e) => acc + e.totalInvoiceAmount, 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Govt Portal Schema</div>
            <div className="text-xs font-bold text-slate-800">
              NIC JSON v1.0.0821 Compliant
            </div>
          </div>
        </div>
      </div>

      {/* E-Way Bill Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden no-print">
        
        {/* Table Search & Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search E-Way Bill No, Vehicle No, Party, Invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active (In Transit)</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">E-Way Bill No.</th>
                <th className="py-3 px-3">Invoice & Date</th>
                <th className="py-3 px-3">Recipient Party</th>
                <th className="py-3 px-3">Vehicle & Transporter</th>
                <th className="py-3 px-3">Validity</th>
                <th className="py-3 px-3 text-right">Value (₹)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEwb.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No E-Way bills found. Click "+ Generate E-Way Bill" to generate Part-A & Part-B for transport.
                  </td>
                </tr>
              ) : (
                filteredEwb.map((ewb) => (
                  <tr key={ewb.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    <td className="py-3 px-4">
                      <div className="font-mono font-black text-blue-700 text-sm">
                        {ewb.ewayBillNumber}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                          ewb.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {ewb.status}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {ewb.distanceKm} KM
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{ewb.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-500">{ewb.invoiceDate}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{ewb.partyName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {ewb.partyGstin || 'Unregistered Recipient'}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-900">{ewb.vehicleNumber}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                        {ewb.transporterName}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-[11px] font-medium text-slate-800">{ewb.validUpto}</div>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="font-black text-slate-900">
                        ₹{ewb.totalInvoiceAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Taxable: ₹{ewb.taxableAmount.toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* View & Print Slip */}
                        <button
                          onClick={() => handleViewEwb(ewb)}
                          className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                          title="View Official E-Way Bill Slip"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* NIC JSON Download */}
                        <button
                          onClick={() => handleExportNICJson(ewb)}
                          className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Export NIC Government JSON"
                        >
                          <FileJson className="w-3.5 h-3.5 text-indigo-600" />
                        </button>

                        {/* Status Toggle */}
                        {ewb.status === 'ACTIVE' ? (
                          <button
                            onClick={() => onUpdateEwayStatus(ewb.id, 'CANCELLED')}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Cancel E-Way Bill"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onUpdateEwayStatus(ewb.id, 'ACTIVE')}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Reactivate"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* --- GENERATE E-WAY BILL MODAL --- */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Generate Official E-Way Bill</h3>
                  <p className="text-xs text-slate-500">Government Part-A & Part-B Transit Clearance</p>
                </div>
              </div>
              <button 
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="space-y-4 mt-4 text-xs">
              
              {/* Select Invoice */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Invoice to Transport *</label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    const matched = (invoices || []).find(i => i.id === e.target.value);
                    if (matched) {
                      setDistanceKm(matched.isInterState ? 850 : 45);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Invoice --</option>
                  {eligibleInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.partyName} (₹{inv.grandTotal.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Part-A: Supply Subtype & Distance */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  PART - A : Transaction Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Supply Type</label>
                    <select
                      value={supplyType}
                      onChange={(e) => setSupplyType(e.target.value as 'OUTWARD' | 'INWARD')}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                    >
                      <option value="OUTWARD">Outward Supply</option>
                      <option value="INWARD">Inward Supply</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Sub-Supply Type</label>
                    <select
                      value={subSupplyType}
                      onChange={(e) => setSubSupplyType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                    >
                      <option value="SUPPLY">1. Supply</option>
                      <option value="EXPORT">2. Export</option>
                      <option value="JOB_WORK">3. Job Work</option>
                      <option value="SKD_CKD">4. SKD / CKD</option>
                      <option value="FOR_OWN_USE">5. For Own Use</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Approx Distance (KM) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(parseInt(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">From Dispatch Pincode</label>
                    <input
                      type="text"
                      readOnly
                      value={businessProfile.pincode || ''}
                      placeholder="Enter pincode in Profile"
                      className="w-full px-2.5 py-1.5 bg-slate-200/60 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">To Destination Pincode *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={toPincode}
                      onChange={(e) => setToPincode(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Part-B: Transportation Details */}
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
                <span className="font-bold text-blue-900 uppercase tracking-wider text-[11px] block">
                  PART - B : Vehicle & Transporter Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Vehicle Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MH43AZ9021"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Transport Mode</label>
                    <select
                      value={transportMode}
                      onChange={(e) => setTransportMode(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-medium"
                    >
                      <option value="ROAD">1. Road (Truck / Lorry / Tempo)</option>
                      <option value="RAIL">2. Rail Cargo</option>
                      <option value="AIR">3. Air Cargo</option>
                      <option value="SHIP">4. Ship / Ocean</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Transporter Name</label>
                    <input
                      type="text"
                      placeholder="e.g. VRL Logistics, TCI Express"
                      value={transporterName}
                      onChange={(e) => setTransporterName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Transporter ID (15-Digit GSTIN)</label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="29AABCV1234F1Z1"
                      value={transporterId}
                      onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate E-Way Bill</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* --- OFFICIAL GOVERNMENT E-WAY BILL SLIP PREVIEW MODAL --- */}
      {viewingEwb && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
            
            {/* Modal Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 no-print">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">Official E-Way Bill Document</span>
                <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                  GST System Form EWB-01
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportNICJson(viewingEwb)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  title="Export Government NIC Portal JSON"
                >
                  <FileJson className="w-3.5 h-3.5 text-blue-600" />
                  <span>NIC JSON</span>
                </button>
                <button
                  onClick={async () => {
                    if (!ewbPrintRef.current) return;
                    setIsDownloadingPdf(true);
                    try {
                      await downloadElementAsPdf(ewbPrintRef.current, `EWayBill_${viewingEwb.ewayBillNumber}.pdf`, { scale: 2.2 });
                    } catch (e) {
                      console.error(e);
                      window.print();
                    } finally {
                      setIsDownloadingPdf(false);
                    }
                  }}
                  disabled={isDownloadingPdf}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs"
                  title="Download E-Way bill slip as PDF"
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Save PDF</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (ewbPrintRef.current) {
                      printElementSafely(ewbPrintRef.current, `EWayBill_${viewingEwb.ewayBillNumber}`);
                    } else {
                      window.print();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  title="Print E-Way bill transit slip"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setViewingEwb(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Official E-Way Bill Slip */}
            <div ref={ewbPrintRef} className="printable-area mt-4 border-2 border-slate-800 p-6 rounded-lg text-slate-900 text-xs font-sans leading-normal bg-white">
              
              {/* Slip Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
                <div>
                  <div className="text-base font-black uppercase tracking-wider text-slate-950">
                    e-Way Bill Slip (Goods In Transit)
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                    Government of India • Goods and Services Tax
                  </div>
                  <div className="mt-2 space-y-0.5 text-xs">
                    <div><span className="font-bold">E-Way Bill No:</span> <span className="font-mono font-black text-sm text-blue-900">{viewingEwb.ewayBillNumber}</span></div>
                    <div><span className="font-bold">Generated Date & Time:</span> {viewingEwb.generatedAt.replace('T', ' ').slice(0, 19)}</div>
                    <div><span className="font-bold">Valid Until:</span> <span className="font-bold text-emerald-800">{viewingEwb.validUpto}</span></div>
                  </div>
                </div>

                {/* QR Code */}
                {ewbQrUrl && (
                  <div className="text-center">
                    <img src={ewbQrUrl} alt="E-Way Bill QR" className="w-24 h-24 border border-slate-300 p-1" />
                    <div className="text-[9px] font-mono text-slate-500 mt-1">Scan for GST Verification</div>
                  </div>
                )}
              </div>

              {/* Part A Table */}
              <div className="mt-4">
                <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[11px] uppercase tracking-wider">
                  PART-A (Invoice & Consignment Particulars)
                </div>
                
                <table className="w-full border-collapse border border-slate-400 text-xs mt-1">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="p-2 font-bold bg-slate-100 w-1/3">GSTIN of Supplier:</td>
                      <td className="p-2 font-mono font-bold">{businessProfile.gstin} ({businessProfile.name})</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="p-2 font-bold bg-slate-100">Place of Dispatch:</td>
                      <td className="p-2">{businessProfile.address}, {businessProfile.city} - {viewingEwb.fromPincode}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="p-2 font-bold bg-slate-100">GSTIN of Recipient:</td>
                      <td className="p-2 font-mono font-bold">{viewingEwb.partyGstin || 'URP'} ({viewingEwb.partyName})</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="p-2 font-bold bg-slate-100">Place of Delivery:</td>
                      <td className="p-2">PIN {viewingEwb.toPincode} (Approx Distance: {viewingEwb.distanceKm} KM)</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="p-2 font-bold bg-slate-100">Document No. & Date:</td>
                      <td className="p-2 font-bold">{viewingEwb.docType} #{viewingEwb.invoiceNumber} dt. {viewingEwb.invoiceDate}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="p-2 font-bold bg-slate-100">Total Goods Value:</td>
                      <td className="p-2 font-black text-sm">₹{viewingEwb.totalInvoiceAmount.toLocaleString('en-IN')} (Taxable: ₹{viewingEwb.taxableAmount.toLocaleString('en-IN')})</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold bg-slate-100">Supply / Sub-Supply:</td>
                      <td className="p-2 font-semibold">{viewingEwb.supplyType} - {viewingEwb.subSupplyType}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Part B Table */}
              <div className="mt-4">
                <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[11px] uppercase tracking-wider">
                  PART-B (Vehicle & Transportation Details)
                </div>

                <table className="w-full border-collapse border border-slate-400 text-xs mt-1 text-center">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                      <th className="p-2">Mode</th>
                      <th className="p-2">Vehicle No.</th>
                      <th className="p-2">Transporter Doc No.</th>
                      <th className="p-2">Transporter ID / Name</th>
                      <th className="p-2">Entered By</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 font-bold">{viewingEwb.transportMode}</td>
                      <td className="p-2 font-mono font-black text-blue-900">{viewingEwb.vehicleNumber}</td>
                      <td className="p-2 font-mono">LR-{viewingEwb.invoiceNumber}</td>
                      <td className="p-2">{viewingEwb.transporterName} ({viewingEwb.transporterId})</td>
                      <td className="p-2 font-mono">{businessProfile.gstin}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer Note */}
              <div className="mt-4 pt-3 border-t border-slate-300 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Computer generated E-Way bill printout. No signature required.</span>
                <span className="font-mono font-bold text-slate-800">SR Group GST Compliance Engine</span>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
