import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Plus, Trash2, Search, ArrowLeft, Save, Printer, Share2, Sparkles, 
  HelpCircle, Truck, ChevronDown, ChevronUp, FileText, UserPlus, Calculator, CheckCircle2,
  Wrench, ClipboardList, HardHat, MapPin, UserCheck, Briefcase, Calendar, Edit2
} from 'lucide-react';
import { 
  Invoice, Party, Item, BusinessProfile, DocumentType, 
  PaymentMode, UnitType, InvoiceItem, TransportDetails 
} from '../types';
import { GST_STATES } from '../data/mockData';
import { 
  formatIndianCurrency, numberToIndianWords, 
  calculateLineItem, calculateInvoiceTotals, detectStateFromGSTIN 
} from '../utils/gstCalculations';
import { HsnFinderModal } from './HsnFinderModal';

interface InvoiceBuilderProps {
  businessProfile: BusinessProfile;
  parties?: Party[];
  items?: Item[];
  invoices?: Invoice[];
  editingInvoice?: Invoice | null;
  existingInvoice?: Invoice | null;
  defaultDocType?: DocumentType;
  initialDocType?: DocumentType;
  initialPartyId?: string;
  onSave?: (invoice: Invoice, openPreview?: boolean) => void;
  onSaveInvoice?: (invoice: Invoice, openPreview?: boolean) => void;
  onCancel: () => void;
  onAddNewParty: (party: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>) => Party;
  onAddNewItem: (item: Omit<Item, 'id' | 'createdAt'>) => Item;
  onUpdateParty?: (party: Party) => void;
}

export const InvoiceBuilder: React.FC<InvoiceBuilderProps> = ({
  businessProfile,
  parties = [],
  items = [],
  invoices = [],
  editingInvoice,
  existingInvoice,
  defaultDocType = 'TAX_INVOICE',
  initialDocType,
  initialPartyId,
  onSave,
  onSaveInvoice,
  onCancel,
  onAddNewParty,
  onAddNewItem,
  onUpdateParty,
}) => {
  const activeEditingInvoice = editingInvoice || existingInvoice || null;
  const activeDefaultDocType = initialDocType || defaultDocType;
  const handleSaveAction = onSave || onSaveInvoice || (() => {});

  // Document Type
  const [docType, setDocType] = useState<DocumentType>(activeEditingInvoice?.documentType || activeDefaultDocType);
  
  // Header details
  const [invoiceNumber, setInvoiceNumber] = useState(
    activeEditingInvoice?.invoiceNumber || (activeDefaultDocType === 'QUOTATION' 
      ? `QTN-${new Date().getFullYear()}-${String(invoices.filter(i => i.documentType === 'QUOTATION').length + 1).padStart(3, '0')}`
      : `${businessProfile.invoicePrefix}${businessProfile.nextInvoiceNumber}`)
  );
  const [date, setDate] = useState(activeEditingInvoice?.date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(activeEditingInvoice?.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [serviceNumber, setServiceNumber] = useState(activeEditingInvoice?.serviceNumber || '');
  const [serviceDate, setServiceDate] = useState(activeEditingInvoice?.serviceDate || '');
  const [runningBill, setRunningBill] = useState(activeEditingInvoice?.runningBill || '');

  // Service Order / Work Order Dedicated States
  const [showServiceOrderSection, setShowServiceOrderSection] = useState<boolean>(
    docType === 'SERVICE_ORDER' ||
    !!activeEditingInvoice?.serviceOrderNumber ||
    !!activeEditingInvoice?.workOrderRef ||
    !!activeEditingInvoice?.serviceNumber ||
    !!activeEditingInvoice?.siteLocation
  );
  const [serviceOrderNumber, setServiceOrderNumber] = useState<string>(
    activeEditingInvoice?.serviceOrderNumber || activeEditingInvoice?.serviceNumber || ''
  );
  const [serviceOrderDate, setServiceOrderDate] = useState<string>(
    activeEditingInvoice?.serviceOrderDate || activeEditingInvoice?.serviceDate || ''
  );
  const [workOrderRef, setWorkOrderRef] = useState<string>(activeEditingInvoice?.workOrderRef || '');
  const [servicePeriod, setServicePeriod] = useState<string>(
    activeEditingInvoice?.servicePeriod || activeEditingInvoice?.deliveryPeriod || ''
  );
  const [siteLocation, setSiteLocation] = useState<string>(activeEditingInvoice?.siteLocation || '');
  const [contractorEngineer, setContractorEngineer] = useState<string>(activeEditingInvoice?.contractorEngineer || '');
  const [scopeOfWork, setScopeOfWork] = useState<string>(activeEditingInvoice?.scopeOfWork || '');

  // Quotation Specific States
  const [quotationStatus, setQuotationStatus] = useState<'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'>(
    activeEditingInvoice?.quotationStatus || 'SENT'
  );
  const [validUntil, setValidUntil] = useState<string>(
    activeEditingInvoice?.validUntil || activeEditingInvoice?.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [validityDays, setValidityDays] = useState<number>(activeEditingInvoice?.validityDays || 30);
  const [rfqNumber, setRfqNumber] = useState<string>(activeEditingInvoice?.rfqNumber || '');
  const [quotationSubject, setQuotationSubject] = useState<string>(activeEditingInvoice?.quotationSubject || '');
  const [deliveryPeriod, setDeliveryPeriod] = useState<string>(activeEditingInvoice?.deliveryPeriod || 'Within 15 to 20 working days');
  const [paymentTermsNote, setPaymentTermsNote] = useState<string>(
    activeEditingInvoice?.paymentTermsNote || '50% Advance with PO, 40% against dispatch, balance 10% after completion'
  );

  // Debit Note / Credit Note Reference Fields
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState<string>(activeEditingInvoice?.originalInvoiceNumber || '');
  const [originalInvoiceDate, setOriginalInvoiceDate] = useState<string>(activeEditingInvoice?.originalInvoiceDate || '');
  const [reasonForNote, setReasonForNote] = useState<string>(activeEditingInvoice?.reasonForNote || '');

  // TDS (Tax Deducted at Source) State - Defaults to 1% as requested
  const [isTdsApplicable, setIsTdsApplicable] = useState<boolean>(activeEditingInvoice?.isTdsApplicable ?? false);
  const [tdsRate, setTdsRate] = useState<number>(activeEditingInvoice?.tdsRate ?? 1);
  const [tdsSection, setTdsSection] = useState<string>(activeEditingInvoice?.tdsSection || 'Sec 194C / 194Q (1%)');
  const [tdsBase, setTdsBase] = useState<'TAXABLE' | 'TOTAL'>(activeEditingInvoice?.tdsBase || 'TAXABLE');

  // Purchase Bill Specific Options: Without GST & Buyer Account Details
  const [isWithoutGst, setIsWithoutGst] = useState<boolean>(activeEditingInvoice?.isWithoutGst ?? false);
  const [buyerAccountDetails, setBuyerAccountDetails] = useState({
    bankName: activeEditingInvoice?.buyerAccountDetails?.bankName ?? businessProfile.bankName ?? '',
    accountNumber: activeEditingInvoice?.buyerAccountDetails?.accountNumber ?? businessProfile.accountNumber ?? '',
    ifscCode: activeEditingInvoice?.buyerAccountDetails?.ifscCode ?? businessProfile.ifscCode ?? '',
    branchName: activeEditingInvoice?.buyerAccountDetails?.branchName ?? businessProfile.branchName ?? '',
    accountHolderName: activeEditingInvoice?.buyerAccountDetails?.accountHolderName ?? businessProfile.accountHolderName ?? businessProfile.tradeName ?? businessProfile.name ?? '',
  });
  
  // Selected Customer / Party
  const defaultPartyId = activeEditingInvoice?.partyId || initialPartyId || (parties[0]?.id || '');
  const [selectedPartyId, setSelectedPartyId] = useState<string>(defaultPartyId);
  const [selectedParty, setSelectedParty] = useState<Party | null>(
    (parties || []).find(p => p.id === defaultPartyId) || null
  );

  // Place of Supply & Inter-state flag
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(
    activeEditingInvoice?.placeOfSupply || `${selectedParty?.stateCode || businessProfile.stateCode} - ${selectedParty?.state || businessProfile.state}`
  );
  const [isInterState, setIsInterState] = useState<boolean>(
    activeEditingInvoice?.isInterState ?? (selectedParty?.stateCode ? selectedParty.stateCode !== businessProfile.stateCode : false)
  );
  const [isReverseCharge, setIsReverseCharge] = useState<boolean>(activeEditingInvoice?.isReverseCharge || false);

  // Line items
  const [lineItems, setLineItems] = useState<InvoiceItem[]>(() => {
    if (activeEditingInvoice && activeEditingInvoice.items.length > 0) {
      return activeEditingInvoice.items;
    }
    return [
      {
        id: 'item-' + Date.now(),
        name: '',
        description: '',
        hsnCode: '',
        unit: 'PCS',
        quantity: 1,
        rate: 0,
        discountPercent: 0,
        taxableAmount: 0,
        taxRate: 18,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        cessAmount: 0,
        totalAmount: 0,
      }
    ];
  });

  // Sundry / Charges
  const [extraDiscount, setExtraDiscount] = useState<number>(editingInvoice?.extraDiscount || 0);
  const [shippingCharges, setShippingCharges] = useState<number>(editingInvoice?.shippingCharges || 0);
  const [paidAmount, setPaidAmount] = useState<number>(editingInvoice?.paidAmount || 0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(editingInvoice?.paymentMode || 'UPI');
  const [paymentReference, setPaymentReference] = useState<string>(editingInvoice?.paymentReference || '');

  // Transport & E-Way Bill Accordion
  const [showTransport, setShowTransport] = useState<boolean>(!!editingInvoice?.transport?.ewayBillNumber);
  const [transport, setTransport] = useState<TransportDetails>(editingInvoice?.transport || {
    transporterName: '',
    vehicleNumber: '',
    ewayBillNumber: '',
    lrNumber: '',
    distanceKm: 0,
  });

  // Default terms helper based on Document Type
  const getDocDefaultTerms = (type: DocumentType, profile: BusinessProfile) => {
    if (type === 'SERVICE_ORDER') {
      return '1. **Delivery & Inspection:** All materials shall strictly comply with the specifications mentioned in the Purchase Order (PO) and shall be subject to inspection at site.\n2. **Test Certificates:** Mill Test Certificates (MTC), inspection reports and other required quality documents shall be provided along with the material delivery.\n3. **Rejection Policy:** Any defective, damaged or non-compliant material shall be rejected. The cost of replacement, transportation and other related expenses shall be borne by the Supplier.\n4. **Payment Terms:** Payment shall be made within **30 days** from the date of receipt of verified materials along with the original Tax Invoice and required documents.\n5. **Delivery Timeline:** Strict adherence to the agreed delivery schedule is mandatory. Any delay in delivery shall be communicated in advance and shall be subject to approval by the Buyer.\n6. **Packing & Transportation:** Materials shall be properly packed and delivered in safe condition. Any damage or loss occurring during transportation shall be the responsibility of the Supplier.';
    }
    if (type === 'QUOTATION' || type === 'PROFORMA_INVOICE') {
      return profile.quotationTermsAndConditions || '1. Price Validity: This quotation is valid for 30 days from the date of issue.\n2. Payment Terms: 50% advance along with confirmed Purchase Order, balance against proforma before dispatch.\n3. Taxes & Duties: GST applicable as per prevailing statutory rates.\n4. Delivery Schedule: Within 2-3 weeks from receipt of clear PO and technical approval.\n5. Freight & Handling: Extra at actuals unless explicitly included.\n6. Jurisdiction: Subject to jurisdiction of our registered office.';
    }
    if (type === 'PURCHASE_ESTIMATE') {
      return '1. **Estimate Validity:** This purchase estimate / inquiry is valid for supplier review and commercial finalization.\n2. **Quality & Material Specs:** All proposed goods must meet the stated technical specifications and quality parameters.\n3. **Delivery & Freight:** Delivery schedule and freight terms as per agreed dispatch point.\n4. **Payment Terms:** Subject to verified delivery and commercial PO confirmation.\n5. **Statutory Taxes:** GST rates as prevailing on date of formal purchase order.';
    }
    if (type === 'PURCHASE_BILL') {
      return profile.purchaseTermsAndConditions || '1. Delivery & Inspection: Materials must strictly comply with PO specifications and site inspection.\n2. Test Certificates: Mill Test Certificates (MTC) and inspection reports must accompany the delivery.\n3. Rejection Policy: Defective or non-compliant materials will be rejected at supplier cost.\n4. Payment Terms: Payment within 30 days of receipt of verified material and original tax invoice.\n5. Delivery Timeline: Strict adherence to agreed delivery schedules is mandatory.';
    }
    return profile.termsAndConditions || '1. Goods once sold will not be taken back or exchanged.\n2. Interest @ 18% p.a. will be charged if bill is not paid within due date.\n3. Subject to jurisdiction of our registered office.\n4. All disputes are subject to local arbitration.';
  };

  // Notes & Terms
  const [notes, setNotes] = useState<string>(editingInvoice?.notes || businessProfile.invoiceNotes);
  const [terms, setTerms] = useState<string>(editingInvoice?.terms || getDocDefaultTerms(docType, businessProfile));

  // Modals
  const [isHsnModalOpen, setIsHsnModalOpen] = useState(false);
  const [activeItemIndexForHsn, setActiveItemIndexForHsn] = useState<number | null>(null);
  const [isQuickPartyModalOpen, setIsQuickPartyModalOpen] = useState(false);

  // Quick Party Form State (Supports both Add and Edit)
  const [editingPartyInBuilder, setEditingPartyInBuilder] = useState<Party | null>(null);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyGstin, setNewPartyGstin] = useState('');
  const [newPartyAddress, setNewPartyAddress] = useState('');
  const [newPartyCity, setNewPartyCity] = useState('');
  const [newPartyStateCode, setNewPartyStateCode] = useState('27');

  const handleOpenAddPartyInBuilder = () => {
    setEditingPartyInBuilder(null);
    setNewPartyName('');
    setNewPartyPhone('');
    setNewPartyGstin('');
    setNewPartyAddress('');
    setNewPartyCity('');
    setNewPartyStateCode(businessProfile.stateCode || '27');
    setIsQuickPartyModalOpen(true);
  };

  const handleOpenEditCustomerInBuilder = (party: Party) => {
    setEditingPartyInBuilder(party);
    setNewPartyName(party.name || '');
    setNewPartyPhone(party.phone || '');
    setNewPartyGstin(party.gstin || '');
    setNewPartyAddress(party.billingAddress || '');
    setNewPartyCity(party.city || '');
    setNewPartyStateCode(party.stateCode || businessProfile.stateCode || '27');
    setIsQuickPartyModalOpen(true);
  };

  // Recalculate intra vs inter state whenever party or place of supply changes
  useEffect(() => {
    if (selectedParty) {
      let partyStateCode = selectedParty.stateCode?.trim() || '';
      let partyStateName = selectedParty.state?.trim() || '';

      if (!partyStateCode && selectedParty.gstin && /^\d{2}/.test(selectedParty.gstin.trim())) {
        partyStateCode = selectedParty.gstin.trim().substring(0, 2);
      }
      if (!partyStateCode && partyStateName) {
        partyStateCode = GST_STATES.find(s => s.name.toLowerCase() === partyStateName.toLowerCase() || partyStateName.toLowerCase().includes(s.name.toLowerCase()))?.code || '';
      }
      if (!partyStateName && partyStateCode) {
        partyStateName = GST_STATES.find(s => s.code === partyStateCode)?.name || '';
      }
      if (!partyStateCode) {
        partyStateCode = businessProfile.stateCode || '07';
        partyStateName = businessProfile.state || 'Delhi';
      }

      const isInter = partyStateCode !== businessProfile.stateCode;
      setIsInterState(isInter);
      setPlaceOfSupply(`${partyStateCode} - ${partyStateName}`);
    }
  }, [selectedParty, businessProfile.stateCode, businessProfile.state]);

  // Recalculate line items tax breakdown whenever isInterState changes
  useEffect(() => {
    setLineItems(prev => prev.map(item => {
      const calc = calculateLineItem(
        item.quantity,
        item.rate,
        item.discountPercent,
        item.taxRate,
        isInterState,
        0
      );
      return { ...item, ...calc };
    }));
  }, [isInterState]);

  // Update Party Selection
  const handlePartyChange = (partyId: string) => {
    setSelectedPartyId(partyId);
    const party = (parties || []).find(p => p.id === partyId) || null;
    setSelectedParty(party);
    if (party) {
      const isInter = party.stateCode !== businessProfile.stateCode;
      setIsInterState(isInter);
      setPlaceOfSupply(`${party.stateCode} - ${party.state}`);
      if (party.paymentTermsDays) {
        const d = new Date(date);
        d.setDate(d.getDate() + party.paymentTermsDays);
        setDueDate(d.toISOString().split('T')[0]);
      }
    }
  };

  // Add Item Row
  const handleAddRow = () => {
    const newItem: InvoiceItem = {
      id: 'item-' + Date.now() + Math.random(),
      name: '',
      description: '',
      hsnCode: '',
      unit: 'PCS',
      quantity: 1,
      rate: 0,
      discountPercent: 0,
      taxableAmount: 0,
      taxRate: 18,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      cessAmount: 0,
      totalAmount: 0,
    };
    setLineItems(prev => [...prev, newItem]);
  };

  // Remove Item Row
  const handleRemoveRow = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Update item field
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setLineItems(prev => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      // If user selected a saved item from dropdown catalog
      if (field === 'itemId' && value) {
        const catalogItem = (items || []).find(i => i.id === value);
        if (catalogItem) {
          current.name = catalogItem.name;
          current.description = catalogItem.description || '';
          current.hsnCode = docType === 'QUOTATION' ? '' : catalogItem.hsnCode;
          current.unit = catalogItem.unit;
          current.rate = catalogItem.sellingPrice;
          current.taxRate = docType === 'QUOTATION' ? 18 : catalogItem.taxRate;
          current.discountPercent = docType === 'QUOTATION' ? 0 : (catalogItem.discountPercent || 0);
        }
      }

      // For Quotations: keep HSN empty, disc% 0, and GST rate standard 18%
      if (docType === 'QUOTATION') {
        current.hsnCode = '';
        current.discountPercent = 0;
        current.taxRate = 18;
      }

      // For Purchase Bill with Without GST option
      if (docType === 'PURCHASE_BILL' && isWithoutGst) {
        current.taxRate = 0;
      }

      // Recalculate line totals
      const calc = calculateLineItem(
        current.quantity,
        current.rate,
        current.discountPercent,
        current.taxRate,
        isInterState,
        0
      );

      updated[index] = { ...current, ...calc };
      return updated;
    });
  };

  // Toggle Without GST for Purchase Bill
  const handleToggleWithoutGst = (withoutGst: boolean) => {
    setIsWithoutGst(withoutGst);
    setLineItems(prev => prev.map(item => {
      const newTaxRate = withoutGst ? 0 : (item.taxRate === 0 ? 18 : item.taxRate);
      const calc = calculateLineItem(
        item.quantity,
        item.rate,
        item.discountPercent,
        newTaxRate,
        isInterState,
        0
      );
      return { ...item, taxRate: newTaxRate, ...calc };
    }));
  };

  // Duplicate Invoice Number Check
  const duplicateInvoice = (invoices || []).find(inv => 
    inv.invoiceNumber.trim().toLowerCase() === invoiceNumber.trim().toLowerCase() &&
    inv.id !== activeEditingInvoice?.id
  );

  const handleAutoGenerateUniqueNumber = () => {
    const prefix = businessProfile.invoicePrefix || 'SKK-25-26/';
    let maxNum = 0;
    (invoices || []).forEach(inv => {
      const match = inv.invoiceNumber.match(/(\d+)$/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed > maxNum) maxNum = parsed;
      }
    });
    const nextNum = Math.max(maxNum + 1, Number(businessProfile.nextInvoiceNumber) || 1);
    const formattedNext = String(nextNum).padStart(3, '0');
    setInvoiceNumber(`${prefix}${formattedNext}`);
  };

  // Live Totals calculation with TDS and Without GST support
  const totals = React.useMemo(() => {
    if (docType === 'PURCHASE_BILL' && isWithoutGst) {
      const calculatedItems = lineItems.map(item => {
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        const discPct = Math.min(100, Math.max(0, Number(item.discountPercent) || 0));
        const baseAmount = qty * rate;
        const discountAmount = (baseAmount * discPct) / 100;
        const taxableAmount = Math.max(0, baseAmount - discountAmount);
        return {
          ...item,
          taxRate: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          ugstAmount: 0,
          igstAmount: 0,
          cessAmount: 0,
          taxableAmount,
          totalAmount: taxableAmount
        };
      });
      const subTotal = calculatedItems.reduce((acc, i) => acc + ((Number(i.quantity) || 0) * (Number(i.rate) || 0)), 0);
      const itemDiscountTotal = calculatedItems.reduce((acc, i) => acc + (((Number(i.quantity) || 0) * (Number(i.rate) || 0) * (Number(i.discountPercent) || 0)) / 100), 0);
      const taxableTotal = Math.max(0, subTotal - itemDiscountTotal);
      const rawGrandTotal = taxableTotal + (Number(shippingCharges) || 0) - (Number(extraDiscount) || 0);
      const grandTotal = Math.round(rawGrandTotal);
      const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));
      const paid = Math.min(grandTotal, Math.max(0, Number(paidAmount) || 0));
      const balanceDue = Math.max(0, grandTotal - paid);

      const tdsRateNum = Number(tdsRate) || 0;
      const tdsBaseAmount = tdsBase === 'TAXABLE' ? taxableTotal : grandTotal;
      const tdsAmount = isTdsApplicable ? Math.round((tdsBaseAmount * tdsRateNum) / 100) : 0;
      const netPayableAfterTds = Math.max(0, grandTotal - tdsAmount);

      return {
        subTotal,
        itemDiscountTotal,
        taxableTotal,
        cgstTotal: 0,
        sgstTotal: 0,
        ugstTotal: 0,
        igstTotal: 0,
        cessTotal: 0,
        taxTotal: 0,
        roundOff,
        grandTotal,
        paidAmount: paid,
        balanceDue,
        paymentStatus: paid >= grandTotal && grandTotal > 0 ? ('PAID' as const) : paid > 0 ? ('PARTIAL' as const) : ('UNPAID' as const),
        tdsAmount,
        netPayableAfterTds,
      };
    }

    return calculateInvoiceTotals(
      lineItems, 
      extraDiscount, 
      shippingCharges, 
      paidAmount,
      false,
      isTdsApplicable,
      tdsRate,
      tdsBase
    );
  }, [lineItems, extraDiscount, shippingCharges, paidAmount, isTdsApplicable, tdsRate, tdsBase, docType, isWithoutGst]);

  // Trigger celebration confetti & Save
  const handleSaveInvoice = (openPreview: boolean = true) => {
    if (!selectedParty) {
      alert('Please select or add a Customer/Party first.');
      return;
    }

    if (lineItems.length === 0 || !lineItems.some(i => i.name.trim() !== '')) {
      alert('Please add at least one line item with a name.');
      return;
    }

    if (duplicateInvoice) {
      alert(`Invoice Number "${invoiceNumber}" is already in use for ${duplicateInvoice.partyName} on ${duplicateInvoice.date}!\n\nDuplicate invoice numbers are not allowed under GST compliance. Please use a unique invoice number or click 'Auto-Generate Unique No.'.`);
      return;
    }

    const posParts = placeOfSupply ? placeOfSupply.split(' - ') : [];
    let derivedStateCode = posParts[0]?.trim() || selectedParty.stateCode?.trim() || '';
    let derivedStateName = posParts[1]?.trim() || selectedParty.state?.trim() || '';

    if (!derivedStateCode && selectedParty.gstin && /^\d{2}/.test(selectedParty.gstin.trim())) {
      derivedStateCode = selectedParty.gstin.trim().substring(0, 2);
    }
    if (!derivedStateCode && derivedStateName) {
      derivedStateCode = GST_STATES.find(s => s.name.toLowerCase() === derivedStateName.toLowerCase() || derivedStateName.toLowerCase().includes(s.name.toLowerCase()))?.code || '';
    }
    if (!derivedStateName && derivedStateCode) {
      derivedStateName = GST_STATES.find(s => s.code === derivedStateCode)?.name || '';
    }

    const newInvoice: Invoice = {
      id: activeEditingInvoice?.id || `inv-${Date.now()}`,
      documentType: docType,
      invoiceNumber: invoiceNumber.trim() || `SKK-${Date.now()}`,
      date,
      dueDate,
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      partyGstin: selectedParty.gstin,
      partyPhone: selectedParty.phone,
      partyAddress: selectedParty.billingAddress,
      partyCity: selectedParty.city || undefined,
      partyState: derivedStateName,
      partyStateCode: derivedStateCode,
      partyPincode: selectedParty.pincode || undefined,
      placeOfSupply: derivedStateCode && derivedStateName ? `${derivedStateCode} - ${derivedStateName}` : placeOfSupply,
      isInterState,
      isReverseCharge,
      items: lineItems.filter(i => i.name.trim() !== '').map(item => {
        if (docType === 'QUOTATION') {
          return {
            ...item,
            hsnCode: '',
            discountPercent: 0,
            taxRate: 18,
          };
        }
        return item;
      }),
      subTotal: totals.subTotal,
      itemDiscountTotal: totals.itemDiscountTotal,
      extraDiscount: Number(extraDiscount) || 0,
      shippingCharges: Number(shippingCharges) || 0,
      taxableTotal: totals.taxableTotal,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      cessTotal: totals.cessTotal,
      taxTotal: (totals.cgstTotal || 0) + (totals.sgstTotal || 0) + (totals.ugstTotal || 0) + (totals.igstTotal || 0) + (totals.cessTotal || 0),
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      paidAmount: totals.paidAmount,
      balanceDue: totals.balanceDue,
      paymentStatus: totals.paymentStatus,
      paymentMode,
      paymentReference,
      isTdsApplicable,
      tdsRate: isTdsApplicable ? Number(tdsRate) : undefined,
      tdsSection: isTdsApplicable ? tdsSection : undefined,
      tdsBase: isTdsApplicable ? tdsBase : undefined,
      tdsAmount: isTdsApplicable ? totals.tdsAmount : undefined,
      netPayableAfterTds: isTdsApplicable ? totals.netPayableAfterTds : undefined,
      originalInvoiceNumber: (docType === 'DEBIT_NOTE' || docType === 'CREDIT_NOTE') ? (originalInvoiceNumber.trim() || undefined) : undefined,
      originalInvoiceDate: (docType === 'DEBIT_NOTE' || docType === 'CREDIT_NOTE') ? (originalInvoiceDate || undefined) : undefined,
      reasonForNote: (docType === 'DEBIT_NOTE' || docType === 'CREDIT_NOTE') ? (reasonForNote.trim() || undefined) : undefined,
      serviceNumber: (serviceOrderNumber.trim() || serviceNumber.trim()) || undefined,
      serviceDate: (serviceOrderDate || serviceDate) || undefined,
      runningBill: runningBill.trim() || undefined,
      serviceOrderNumber: serviceOrderNumber.trim() || undefined,
      serviceOrderDate: serviceOrderDate || undefined,
      workOrderRef: workOrderRef.trim() || undefined,
      servicePeriod: servicePeriod.trim() || undefined,
      siteLocation: siteLocation.trim() || undefined,
      contractorEngineer: contractorEngineer.trim() || undefined,
      scopeOfWork: scopeOfWork.trim() || undefined,
      quotationStatus: docType === 'QUOTATION' ? quotationStatus : undefined,
      validUntil: docType === 'QUOTATION' ? validUntil : undefined,
      validityDays: docType === 'QUOTATION' ? validityDays : undefined,
      rfqNumber: docType === 'QUOTATION' ? (rfqNumber.trim() || undefined) : undefined,
      quotationSubject: docType === 'QUOTATION' ? (quotationSubject.trim() || undefined) : undefined,
      deliveryPeriod: (docType === 'QUOTATION' ? (deliveryPeriod.trim() || undefined) : (servicePeriod.trim() || undefined)),
      paymentTermsNote: docType === 'QUOTATION' ? (paymentTermsNote.trim() || undefined) : undefined,
      transport: showTransport ? transport : undefined,
      isWithoutGst: docType === 'PURCHASE_BILL' ? isWithoutGst : undefined,
      buyerAccountDetails: docType === 'PURCHASE_BILL' ? buyerAccountDetails : undefined,
      notes,
      terms,
      createdAt: activeEditingInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.85 }
    });

    handleSaveAction(newInvoice, openPreview);
  };

  // Handle Quick Party Add / Edit
  const handleQuickAddPartySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) return;

    const stateObj = GST_STATES.find(s => s.code === newPartyStateCode) || GST_STATES[0];

    if (editingPartyInBuilder) {
      const updatedParty: Party = {
        ...editingPartyInBuilder,
        name: newPartyName.trim(),
        phone: newPartyPhone.trim(),
        gstin: newPartyGstin.trim().toUpperCase() || undefined,
        billingAddress: newPartyAddress.trim() || '',
        city: newPartyCity.trim() || '',
        state: stateObj ? stateObj.name : '',
        stateCode: stateObj ? stateObj.code : '',
      };
      if (onUpdateParty) {
        onUpdateParty(updatedParty);
      }
      setSelectedParty(updatedParty);
      setIsQuickPartyModalOpen(false);
      setEditingPartyInBuilder(null);
      setNewPartyName('');
      setNewPartyPhone('');
      setNewPartyGstin('');
      return;
    }

    const createdParty = onAddNewParty({
      type: (docType === 'SERVICE_ORDER' || docType === 'PURCHASE_BILL' || docType === 'PURCHASE_ESTIMATE') ? 'SUPPLIER' : 'CUSTOMER',
      name: newPartyName.trim(),
      phone: newPartyPhone.trim(),
      gstin: newPartyGstin.trim().toUpperCase() || undefined,
      billingAddress: newPartyAddress.trim() || '',
      city: newPartyCity.trim() || '',
      state: stateObj ? stateObj.name : '',
      stateCode: stateObj ? stateObj.code : '',
      pincode: '',
      openingBalance: 0,
      paymentTermsDays: 15,
    });

    setSelectedPartyId(createdParty.id);
    setSelectedParty(createdParty);
    setIsQuickPartyModalOpen(false);
    setNewPartyName('');
    setNewPartyPhone('');
    setNewPartyGstin('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {editingInvoice ? 'Edit Document' : 'Create New Document'}
            </h1>
            <p className="text-xs text-slate-500">Fast, compliant GST Tax Invoicing & Quotations</p>
          </div>
        </div>

        {/* Document Type Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          {(['TAX_INVOICE', 'SERVICE_ORDER', 'QUOTATION', 'PURCHASE_ESTIMATE', 'PROFORMA_INVOICE', 'DELIVERY_CHALLAN', 'PURCHASE_BILL', 'DEBIT_NOTE', 'CREDIT_NOTE'] as DocumentType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setDocType(type);
                if (type === 'SERVICE_ORDER') {
                  setShowServiceOrderSection(true);
                  if (!editingInvoice) {
                    const nextSoNum = `SO-${new Date().getFullYear()}-${String(invoices.filter(i => i.documentType === 'SERVICE_ORDER').length + 1).padStart(3, '0')}`;
                    setInvoiceNumber(nextSoNum);
                    setServiceOrderNumber(nextSoNum);
                  }
                }
                if (type === 'PURCHASE_ESTIMATE') {
                  if (!editingInvoice) {
                    const nextPeNum = `PE-${new Date().getFullYear()}-${String(invoices.filter(i => i.documentType === 'PURCHASE_ESTIMATE').length + 1).padStart(3, '0')}`;
                    setInvoiceNumber(nextPeNum);
                  }
                }
                if (type === 'QUOTATION') {
                  setLineItems(prev => prev.map(item => {
                    const calc = calculateLineItem(item.quantity, item.rate, 0, 18, isInterState, 0);
                    return { ...item, hsnCode: '', discountPercent: 0, taxRate: 18, ...calc };
                  }));
                }
                if (!editingInvoice) {
                  setTerms(getDocDefaultTerms(type, businessProfile));
                }
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                docType === type 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {type === 'TAX_INVOICE' && 'Tax Invoice'}
              {type === 'SERVICE_ORDER' && 'Service Order'}
              {type === 'QUOTATION' && 'Quotation'}
              {type === 'PURCHASE_ESTIMATE' && 'Purchase Estimate'}
              {type === 'PROFORMA_INVOICE' && 'Proforma'}
              {type === 'DELIVERY_CHALLAN' && 'Delivery Challan'}
              {type === 'PURCHASE_BILL' && 'Purchase Bill'}
              {type === 'DEBIT_NOTE' && 'Debit Note'}
              {type === 'CREDIT_NOTE' && 'Credit Note'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Party & Document Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Customer Selection Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                {docType === 'SERVICE_ORDER' ? 'TO / Supplier / Vendor Details (सर्विस पार्टी)' : (docType === 'PURCHASE_BILL' || docType === 'PURCHASE_ESTIMATE') ? 'Supplier / Vendor Details (सप्लायर पार्टी)' : 'Customer (Billed To) Details'}
              </span>
              <div className="flex items-center gap-2">
                {selectedParty && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditCustomerInBuilder(selectedParty)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Edit Customer Details"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Customer
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenAddPartyInBuilder}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + Add New Party
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {docType === 'SERVICE_ORDER' ? 'Select Party / Vendor (TO)' : 'Select Customer'}
                </label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => handlePartyChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white transition-colors"
                >
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.gstin ? `(${p.gstin.substring(0, 8)}...)` : '(Unregistered)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Place of Supply (State)</label>
                <select
                  value={placeOfSupply}
                  onChange={(e) => {
                    setPlaceOfSupply(e.target.value);
                    const stateCode = e.target.value.split(' - ')[0];
                    setIsInterState(stateCode !== businessProfile.stateCode);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white transition-colors"
                >
                  {GST_STATES.map(st => (
                    <option key={st.code} value={`${st.code} - ${st.name}`}>
                      {st.code} - {st.name} {st.code === businessProfile.stateCode ? '(Home State)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Party Summary Card */}
            {selectedParty && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{selectedParty.name}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditCustomerInBuilder(selectedParty)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md cursor-pointer hover:bg-blue-100"
                      title="Edit Customer Details"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  <div className="text-slate-600">{selectedParty.billingAddress}, {selectedParty.city}</div>
                  {selectedParty.phone ? <div className="text-slate-500">Phone: {selectedParty.phone}</div> : null}
                </div>
                <div className="text-right space-y-1">
                  {selectedParty.gstin ? (
                    <span className="font-mono font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md inline-block">
                      GSTIN: {selectedParty.gstin}
                    </span>
                  ) : (
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md inline-block font-medium">
                      Unregistered / B2C
                    </span>
                  )}
                  <div className="text-[11px] font-semibold text-slate-600">
                    Tax Slab Mode: <strong className={isWithoutGst && docType === 'PURCHASE_BILL' ? 'text-amber-700 font-bold' : isInterState ? 'text-purple-700 font-bold' : 'text-blue-700 font-bold'}>
                      {docType === 'PURCHASE_BILL' && isWithoutGst ? 'Without GST (Non-GST)' : isInterState ? 'IGST (Inter-State)' : 'CGST + SGST (Intra-State)'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Bill Without GST Option Toggle */}
            {docType === 'PURCHASE_BILL' && (
              <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-sm font-bold text-amber-900">
                    %
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <span>Purchase Bill GST Mode</span>
                      {isWithoutGst ? (
                        <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">Without GST (Active)</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">GST Bill</span>
                      )}
                    </div>
                    <div className="text-[11px] text-amber-900/80">
                      Enable "Without GST" if this purchase bill is without tax/GST calculation.
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-2 rounded-lg border border-amber-300 hover:border-amber-400 shadow-xs select-none transition-all">
                  <input
                    type="checkbox"
                    checked={isWithoutGst}
                    onChange={(e) => handleToggleWithoutGst(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span className="text-xs font-bold text-amber-950">
                    Without GST (Non-GST / Exempt)
                  </span>
                </label>
              </div>
            )}

            {/* Debit / Credit Note Link to Original Invoice */}
            {(docType === 'DEBIT_NOTE' || docType === 'CREDIT_NOTE') && (
              <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    📑 Original Invoice Reference for {docType === 'DEBIT_NOTE' ? 'Debit Note' : 'Credit Note'}
                  </span>
                  <span className="text-[10px] bg-amber-200/70 text-amber-900 font-bold px-2 py-0.5 rounded">
                    GST Compliant
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-950 mb-1">
                      Original Invoice No. *
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. SKK-24-25/001"
                      value={originalInvoiceNumber}
                      onChange={(e) => setOriginalInvoiceNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-950 mb-1">
                      Original Invoice Date
                    </label>
                    <input 
                      type="date"
                      value={originalInvoiceDate}
                      onChange={(e) => setOriginalInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-950 mb-1">
                      Reason for Issue
                    </label>
                    <select
                      value={reasonForNote}
                      onChange={(e) => setReasonForNote(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 text-xs"
                    >
                      <option value="">Select Reason...</option>
                      <option value="01-Sales Return">01-Sales Return</option>
                      <option value="02-Post Sale Discount">02-Post Sale Discount</option>
                      <option value="03-Deficiency in Services">03-Deficiency in Services</option>
                      <option value="04-Correction in Invoice">04-Correction in Invoice</option>
                      <option value="05-Change in POS">05-Change in POS</option>
                      <option value="06-Price Revision / Rate Difference">06-Price Revision / Rate Difference</option>
                      <option value="Other">Other Adjustment</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Line Items Manager Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  {docType === 'QUOTATION' ? 'Quotation Items & Services' : 'Items & Services'}
                </span>
                <span className="text-xs text-slate-500">({lineItems.length} items)</span>
              </div>
              {docType !== 'QUOTATION' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveItemIndexForHsn(0);
                    setIsHsnModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" /> HSN Finder
                </button>
              )}
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div 
                  key={item.id || index}
                  className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 space-y-3 transition-colors group"
                >
                  <div className="grid grid-cols-12 gap-3 items-center">
                    
                    {/* Item Name / Catalog Quick Select */}
                    <div className={docType === 'QUOTATION' ? "col-span-12 sm:col-span-6" : "col-span-12 sm:col-span-5"}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">Item #{index + 1}</label>
                        <select
                          onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                          className="text-[11px] text-blue-600 bg-transparent font-medium border-0 cursor-pointer p-0 focus:ring-0"
                          defaultValue=""
                        >
                          <option value="" disabled>⚡ Pick from Inventory</option>
                          {items.map(catItem => (
                            <option key={catItem.id} value={catItem.id}>
                              {catItem.name} (₹{catItem.sellingPrice})
                            </option>
                          ))}
                        </select>
                      </div>
                      <input 
                        type="text"
                        placeholder="Product name or service description..."
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>

                    {/* HSN Code - Hidden for Quotations */}
                    {docType !== 'QUOTATION' && (
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">HSN / SAC</label>
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="HSN"
                            value={item.hsnCode}
                            onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)}
                            className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    )}

                    {/* Quantity & Unit */}
                    <div className={docType === 'QUOTATION' ? "col-span-6 sm:col-span-3" : "col-span-4 sm:col-span-2"}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-700">Qty &amp; Unit</label>
                        <span className="text-[9px] text-blue-600 font-medium hidden sm:inline">(Type manual)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={item.quantity === 0 ? '0' : (item.quantity ?? '')}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            if (valStr === '') {
                              handleItemChange(index, 'quantity', 0);
                            } else {
                              const parsed = parseFloat(valStr);
                              handleItemChange(index, 'quantity', isNaN(parsed) ? 0 : parsed);
                            }
                          }}
                          className="w-16 px-1.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 shadow-2xs"
                          title="Type Quantity"
                        />
                        <div className="relative flex-1 min-w-[70px]">
                          <input
                            type="text"
                            list="unit-suggestions-datalist"
                            placeholder="Unit"
                            value={item.unit || ''}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 uppercase focus:ring-2 focus:ring-blue-600 shadow-2xs"
                            title="Type or choose Unit (e.g. MTR, SQMTR, TON, PCS, SET, BAG, LUMP SUM...)"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Unit Price Rate */}
                    <div className={docType === 'QUOTATION' ? "col-span-6 sm:col-span-3" : "col-span-4 sm:col-span-3"}>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rate (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={item.rate || ''}
                        onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                  </div>

                  {/* Second subrow for Tax, Discount & Total */}
                  <div className="grid grid-cols-12 gap-3 items-center pt-1 text-xs">
                    
                    {/* Discount % - Hidden for Quotations */}
                    {docType !== 'QUOTATION' && (
                      <div className="col-span-3 sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Disc %</label>
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent || ''}
                          placeholder="0%"
                          onChange={(e) => handleItemChange(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700"
                        />
                      </div>
                    )}

                    {/* Tax Slab - Hidden for Quotations */}
                    {docType !== 'QUOTATION' && (
                      <div className="col-span-4 sm:col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-0.5">
                          {docType === 'PURCHASE_BILL' && isWithoutGst ? 'Tax Rate (Without GST)' : 'GST Rate'}
                        </label>
                        {docType === 'PURCHASE_BILL' && isWithoutGst ? (
                          <div className="w-full px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-900">
                            0% (Without GST)
                          </div>
                        ) : (
                          <select
                            value={item.taxRate}
                            onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                          >
                            <option value={0}>0% (Exempt)</option>
                            <option value={5}>5% GST (2.5+2.5)</option>
                            <option value={12}>12% GST (6+6)</option>
                            <option value={18}>18% GST (9+9)</option>
                            <option value={28}>28% GST (14+14)</option>
                          </select>
                        )}
                      </div>
                    )}

                    {/* Taxable / Basic Value - Hidden for Quotations */}
                    {docType !== 'QUOTATION' && (
                      <div className="col-span-5 sm:col-span-3">
                        <span className="block text-[10px] text-slate-500">Taxable:</span>
                        <span className="font-mono font-medium text-slate-800 text-xs">
                          {formatIndianCurrency(item.taxableAmount)}
                        </span>
                      </div>
                    )}

                    {/* Line Total */}
                    <div className={docType === 'QUOTATION' ? "col-span-10 sm:col-span-11 text-right" : "col-span-10 sm:col-span-3 text-right"}>
                      <span className="block text-[10px] text-slate-500">
                        {docType === 'QUOTATION' ? 'Total Amount (₹):' : 'Item Total:'}
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatIndianCurrency(item.totalAmount)}
                      </span>
                    </div>

                    {/* Delete Row Button */}
                    <div className={docType === 'QUOTATION' ? "col-span-2 sm:col-span-1 text-right" : "col-span-2 sm:col-span-1 text-right"}>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        disabled={lineItems.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Item Remarks for Quotations */}
                    {docType === 'QUOTATION' && (
                      <div className="col-span-12 pt-2 border-t border-slate-200/80 flex items-center gap-2">
                        <label className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">Remarks (ऑफर रिमार्क):</label>
                        <input
                          type="text"
                          placeholder="e.g. As per technical drawing / Site clearance by client / Extra at actuals..."
                          value={item.remarks || ''}
                          onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                          className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                        />
                      </div>
                    )}

                  </div>
                </div>
              ))}
            </div>

            {/* Add Row Button */}
            <button
              type="button"
              onClick={handleAddRow}
              className="w-full py-2.5 border-2 border-dashed border-blue-200 hover:border-blue-500 hover:bg-blue-50/50 text-blue-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> + Add Another Item Line
            </button>
          </div>

          {/* Service Order & Work Contract Details Section - Show for TAX_INVOICE as optional contract metadata */}
          {docType === 'TAX_INVOICE' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setShowServiceOrderSection(!showServiceOrderSection)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      Service Order &amp; Work Contract Details (सर्विस / वर्क ऑर्डर सेक्शन)
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Service No., Date, Site Location, RA Bill &amp; Scope of Work
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {showServiceOrderSection ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {showServiceOrderSection && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs">
                  
                  {/* 1. Order Numbers & Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Service / SO Number
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. SO/2026/089"
                        value={serviceOrderNumber}
                        onChange={(e) => {
                          setServiceOrderNumber(e.target.value);
                          setServiceNumber(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Service / Order Date
                      </label>
                      <input 
                        type="date"
                        value={serviceOrderDate}
                        onChange={(e) => {
                          setServiceOrderDate(e.target.value);
                          setServiceDate(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Client PO / WO Reference
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. PO-88219 / WO-004"
                        value={workOrderRef}
                        onChange={(e) => setWorkOrderRef(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Running Bill (RA Bill No.)
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. RA-01, RA-02"
                        value={runningBill}
                        onChange={(e) => setRunningBill(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* 2. Site Location & Execution Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>Site / Plant Location</span>
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. Plot 4, Tagore Road, Gandhidham"
                        value={siteLocation}
                        onChange={(e) => setSiteLocation(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>Service Period / Timeline</span>
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. 15-09-2026 to 30-09-2026"
                        value={servicePeriod}
                        onChange={(e) => setServicePeriod(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-slate-500" />
                        <span>Engineer / Supervisor Incharge</span>
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. Er. Project Incharge"
                        value={contractorEngineer}
                        onChange={(e) => setContractorEngineer(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* 3. Scope of Work / Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-500" />
                        <span>Scope of Work / Service Description (कार्य का विस्तृत विवरण):</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setScopeOfWork('ESP FABRICATION & ERECTION WITH DISMANTLING WORK INCLUDING ALIGNMENT, WELDING, RIGGING & COMMISSIONING AT CLIENT SITE.')}
                          className="text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded font-medium transition-colors"
                        >
                          ⚡ ESP Work
                        </button>
                        <button
                          type="button"
                          onClick={() => setScopeOfWork('PLANT PREVENTIVE & BREAKDOWN MAINTENANCE SERVICES INCLUDING LABOUR, CONSUMABLES, TOOLING & SAFETY COMPLIANCE.')}
                          className="text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded font-medium transition-colors"
                        >
                          ⚡ Maintenance
                        </button>
                        <button
                          type="button"
                          onClick={() => setScopeOfWork('STRUCTURAL STEEL FABRICATION, HEAVY CRANE RIGGING, PIPELINE ERECTION & HYDRO TESTING.')}
                          className="text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded font-medium transition-colors"
                        >
                          ⚡ Fabrication
                        </button>
                      </div>
                    </div>
                    <textarea 
                      rows={2}
                      placeholder="Enter detailed scope of work, technical specifications, safety protocols or service notes..."
                      value={scopeOfWork}
                      onChange={(e) => setScopeOfWork(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400 leading-relaxed"
                    />
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Transport & E-Way Bill Accordion - Only for Invoices, Challans & Purchase */}
          {docType !== 'QUOTATION' && docType !== 'SERVICE_ORDER' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTransport(!showTransport)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Transport, Vehicle &amp; E-Way Bill Details (Optional)
                  </span>
                </div>
                {showTransport ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showTransport && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">E-Way Bill Number</label>
                    <input 
                      type="text"
                      placeholder="e.g. 281098239012"
                      value={transport.ewayBillNumber || ''}
                      onChange={(e) => setTransport({ ...transport, ewayBillNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Vehicle Number</label>
                    <input 
                      type="text"
                      placeholder="e.g. MH-43-AK-8120"
                      value={transport.vehicleNumber || ''}
                      onChange={(e) => setTransport({ ...transport, vehicleNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono uppercase text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Transporter Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. BlueDart / V-Trans"
                      value={transport.transporterName || ''}
                      onChange={(e) => setTransport({ ...transport, transporterName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">LR / GR Number</label>
                    <input 
                      type="text"
                      placeholder="e.g. LR-99218"
                      value={transport.lrNumber || ''}
                      onChange={(e) => setTransport({ ...transport, lrNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Distance (in KM)</label>
                    <input 
                      type="number"
                      placeholder="KM"
                      value={transport.distanceKm || ''}
                      onChange={(e) => setTransport({ ...transport, distanceKm: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Buyer Account Details Card - Only for Purchase Bill */}
          {docType === 'PURCHASE_BILL' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-sm">
                    🏦
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Buyer Account Details (खरीदार के बैंक खाते का विवरण)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      These bank details will be printed on the Purchase Bill PDF for vendor reference.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBuyerAccountDetails({
                      bankName: businessProfile.bankName || '',
                      accountNumber: businessProfile.accountNumber || '',
                      ifscCode: businessProfile.ifscCode || '',
                      branchName: businessProfile.branchName || '',
                      accountHolderName: businessProfile.accountHolderName || businessProfile.tradeName || businessProfile.name || '',
                    });
                  }}
                  className="text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded font-semibold transition-colors"
                >
                  ↺ Reset to Company Bank
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India / HDFC Bank"
                    value={buyerAccountDetails.bankName}
                    onChange={(e) => setBuyerAccountDetails(prev => ({ ...prev, bankName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 123456789012"
                    value={buyerAccountDetails.accountNumber}
                    onChange={(e) => setBuyerAccountDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0001234"
                    value={buyerAccountDetails.ifscCode}
                    onChange={(e) => setBuyerAccountDetails(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono uppercase font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Industrial Area Branch"
                    value={buyerAccountDetails.branchName}
                    onChange={(e) => setBuyerAccountDetails(prev => ({ ...prev, branchName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Account Holder Name / Entity</label>
                  <input
                    type="text"
                    placeholder="e.g. Suhel Engineering Works"
                    value={buyerAccountDetails.accountHolderName}
                    onChange={(e) => setBuyerAccountDetails(prev => ({ ...prev, accountHolderName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Terms & Conditions and Notes Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Terms & Conditions & Remarks
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Appears on printed document
              </span>
            </div>

            {/* Quick Presets Bar */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">Quick 1-Click Terms Presets:</label>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setTerms(
                    businessProfile.termsAndConditions || 
                    '1. Goods once sold will not be taken back or exchanged.\n2. Interest @ 18% p.a. will be charged if bill is not paid within due date.\n3. Subject to jurisdiction of our registered office.\n4. All disputes are subject to local arbitration.'
                  )}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-semibold text-[11px] rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
                >
                  📋 Tax Invoice Terms
                </button>

                <button
                  type="button"
                  onClick={() => setTerms(
                    businessProfile.quotationTermsAndConditions || 
                    '1. Price Validity: This quotation is valid for 30 days from the date of issue.\n2. Payment Terms: 50% advance along with confirmed Purchase Order, balance against proforma before dispatch.\n3. Taxes & Duties: GST applicable as per prevailing statutory rates.\n4. Delivery Schedule: Within 2-3 weeks from receipt of clear PO and technical approval.\n5. Freight & Handling: Extra at actuals unless explicitly included.\n6. Jurisdiction: Subject to jurisdiction of our registered office.'
                  )}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-[11px] rounded-lg border border-blue-200 transition-colors flex items-center gap-1"
                >
                  💼 Quotation Terms
                </button>

                <button
                  type="button"
                  onClick={() => setTerms(
                    businessProfile.purchaseTermsAndConditions || 
                    '1. Delivery & Inspection: Materials must strictly comply with PO specifications and site inspection.\n2. Test Certificates: Mill Test Certificates (MTC) and inspection reports must accompany the delivery.\n3. Rejection Policy: Defective or non-compliant materials will be rejected at supplier cost.\n4. Payment Terms: Payment within 30 days of receipt of verified material and original tax invoice.\n5. Delivery Timeline: Strict adherence to agreed delivery schedules is mandatory.'
                  )}
                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[11px] rounded-lg border border-amber-200 transition-colors flex items-center gap-1"
                >
                  📦 Purchase Order Terms
                </button>

                <button
                  type="button"
                  onClick={() => setTerms(
                    '1. Scope of Work: Fabrication, Supply & Erection as per certified engineering drawing and site engineer instructions.\n2. Running Bill Terms: Progress billing (RA-01) as per joint site measurements certified by client.\n3. Mill Test Certificate (MTC): Required with all raw steel & plates.\n4. Safety & Standards: Full compliance with industrial safety protocols and standard engineering practices.'
                  )}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] rounded-lg border border-emerald-200 transition-colors flex items-center gap-1"
                >
                  🏗️ Fabrication / RA Bill Terms
                </button>

                <button
                  type="button"
                  onClick={() => setTerms(
                    '1. All manpower required for execution of the work shall be provided by the Contractor as per the agreed scope and schedule.\n2. All necessary tools & tackles such as welding machines, cutting sets, chain blocks, wire ropes, D-shackles, levels, grinding machines and other required equipment shall be arranged by the Contractor.\n3. Electric power & water shall be provided by the Client free of cost at one central point within 50 meters of the work site.\n4. Accommodation & local transportation for labor/engineers shall be in the scope of Contractor.\n5. Payment Terms: 15 days running bill against work certification by Site In-charge.\n6. Taxes: GST @ 18% extra as applicable at the time of invoicing.\n7. Safety & PPE: All workers shall wear helmets, safety shoes, safety belts, and follow plant safety norms strictly.\n8. Work Schedule: Work shall commence within 7 days from issue of Work Order / Site Clearance.\n9. Scrap & Surplus: Scrap generated during dismantling/fabrication shall be shifted to client designated scrap yard.\n10. Price Validity: This commercial offer is valid for 30 days from the date of submission.'
                  )}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-[11px] rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
                >
                  ⭐ Techno-Commercial Terms (Horizontal 2-Col Layout)
                </button>
              </div>
            </div>

            {/* Terms & Conditions Textarea */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Terms & Conditions Text
                </label>
                <button
                  type="button"
                  onClick={() => setTerms('')}
                  className="text-[10px] text-rose-600 hover:underline"
                >
                  Clear Terms
                </button>
              </div>
              <textarea
                rows={4}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Enter terms and conditions (one per line)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Invoice Footer Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Footer Note / Customer Remark
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Thank you for your business! For inquiries contact us."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

        </div>

        {/* Right 1 Col: Bill Calculations & Actions */}
        <div className="space-y-6">
          
          {/* Invoice / Quotation / Service Order Meta Numbers */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>
                {docType === 'SERVICE_ORDER' 
                  ? 'SERVICE ORDER IDENTIFICATION (सर्विस ऑर्डर विवरण)' 
                  : docType === 'QUOTATION' 
                    ? 'Quotation Identification (कोटेशन विवरण)' 
                    : 'Invoice Identification'}
              </span>
              {duplicateInvoice ? (
                <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full animate-pulse">
                  ⚠️ Duplicate Number
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                  ✓ Unique No.
                </span>
              )}
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {docType === 'SERVICE_ORDER' 
                      ? 'SARVICE NO : (सर्विस ऑर्डर नं.) *' 
                      : docType === 'QUOTATION' 
                        ? 'Quotation Number (कोटेशन नं.) *' 
                        : 'Invoice Number *'}
                  </label>
                  {duplicateInvoice && (
                    <button
                      type="button"
                      onClick={handleAutoGenerateUniqueNumber}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-0.5"
                    >
                      ⚡ Auto-Fix Unique No.
                    </button>
                  )}
                </div>
                <input 
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    if (docType === 'SERVICE_ORDER') {
                      setServiceOrderNumber(e.target.value);
                      setServiceNumber(e.target.value);
                    }
                  }}
                  className={`w-full px-3.5 py-2 rounded-xl text-sm font-mono font-bold transition-all ${
                    duplicateInvoice 
                      ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 focus:ring-2 focus:ring-rose-400' 
                      : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500'
                  }`}
                />
                {duplicateInvoice && (
                  <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 font-medium">
                    ⚠️ <strong>Duplicate alert:</strong> This number is already assigned to <strong>{duplicateInvoice.partyName}</strong> ({duplicateInvoice.date}). Click <em>Auto-Fix Unique No.</em> to avoid GST duplication.
                  </div>
                )}
              </div>

              {docType === 'SERVICE_ORDER' ? (
                <>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        SARVICE DATE : (सर्विस दिनांक) *
                      </label>
                      <input 
                        type="date"
                        value={date}
                        onChange={(e) => {
                          setDate(e.target.value);
                          setServiceOrderDate(e.target.value);
                          setServiceDate(e.target.value);
                          setDueDate(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>
                </>
              ) : docType === 'QUOTATION' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Quotation Date</label>
                      <input 
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Valid Until (Expiry)</label>
                      <input 
                        type="date"
                        value={validUntil}
                        onChange={(e) => {
                          setValidUntil(e.target.value);
                          setDueDate(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Validity Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-600">Validity Presets</label>
                      <span className="text-[10px] text-slate-400 font-medium">{validityDays} Days validity</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[15, 30, 45, 60].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => {
                            setValidityDays(days);
                            const tDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
                            setValidUntil(tDate);
                            setDueDate(tDate);
                          }}
                          className={`py-1 text-[11px] rounded-lg font-bold transition-all border ${
                            validityDays === days 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {days} Days
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quotation Subject */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Quotation Subject / Scope of Work</span>
                      <span className="text-[10px] text-blue-600 font-bold">विषय</span>
                    </label>
                    <textarea
                      rows={2}
                      value={quotationSubject}
                      onChange={(e) => setQuotationSubject(e.target.value)}
                      placeholder="e.g. TECHNO - COMMERCIAL OFFER FOR, ESP FABRICATION & ERECTION WITH DISMANTLING WORK M/S MONO STEEL INDIA LIMITED..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
                    />
                  </div>

                  {/* Reference / RFQ Number & Delivery */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ref / Quotation No
                      </label>
                      <input
                        type="text"
                        value={rfqNumber}
                        onChange={(e) => setRfqNumber(e.target.value)}
                        placeholder="e.g. SRG/2026-27/Q-304"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Delivery Period
                      </label>
                      <input
                        type="text"
                        value={deliveryPeriod}
                        onChange={(e) => setDeliveryPeriod(e.target.value)}
                        placeholder="e.g. 2-3 Weeks"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
                      <input 
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                      <input 
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Service Number</span>
                        <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                      </label>
                      <input 
                        type="text"
                        value={serviceNumber}
                        onChange={(e) => setServiceNumber(e.target.value)}
                        placeholder="e.g. NSI/SE/N0015"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Service Date</span>
                        <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                      </label>
                      <input 
                        type="date"
                        value={serviceDate}
                        onChange={(e) => setServiceDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Running Bill (RA Bill)</span>
                      <span className="text-[10px] text-blue-700 font-bold">e.g. RA-01, RA-02</span>
                    </label>
                    <input 
                      type="text"
                      value={runningBill}
                      onChange={(e) => setRunningBill(e.target.value)}
                      placeholder="e.g. RA-01"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white placeholder:text-slate-400"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bill Sundry & Grand Total - Hidden for Quotations and Service Orders */}
          {docType !== 'QUOTATION' && docType !== 'SERVICE_ORDER' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>Bill Summary</span>
                <Calculator className="w-4 h-4 text-blue-600" />
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Sub Total (Items)</span>
                  <span className="font-mono font-medium">{formatIndianCurrency(totals.subTotal)}</span>
                </div>

                {totals.itemDiscountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Item Discounts</span>
                    <span className="font-mono">-{formatIndianCurrency(totals.itemDiscountTotal)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <span className="text-slate-600">Extra Discount (₹)</span>
                  <input 
                    type="number"
                    min="0"
                    placeholder="0"
                    value={extraDiscount || ''}
                    onChange={(e) => setExtraDiscount(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-right"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Shipping / Freight (₹)</span>
                  <input 
                    type="number"
                    min="0"
                    placeholder="0"
                    value={shippingCharges || ''}
                    onChange={(e) => setShippingCharges(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-right"
                  />
                </div>

                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                  <span>Taxable Amount</span>
                  <span className="font-mono font-medium">{formatIndianCurrency(totals.taxableTotal)}</span>
                </div>

                {!isInterState ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST Total</span>
                      <span className="font-mono">{formatIndianCurrency(totals.cgstTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST Total</span>
                      <span className="font-mono">{formatIndianCurrency(totals.sgstTotal)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST Total</span>
                    <span className="font-mono">{formatIndianCurrency(totals.igstTotal)}</span>
                  </div>
                )}

                {totals.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Round Off</span>
                    <span className="font-mono">{totals.roundOff > 0 ? `+${totals.roundOff}` : totals.roundOff}</span>
                  </div>
                )}

                {/* TDS (Tax Deducted at Source 1%) Deduction Section */}
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={isTdsApplicable}
                        onChange={(e) => setIsTdsApplicable(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-900">
                        Apply TDS Deduction (e.g. 1%)
                      </span>
                    </label>
                    {isTdsApplicable && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">
                        {tdsRate}% Active
                      </span>
                    )}
                  </div>

                  {isTdsApplicable && (
                    <div className="space-y-2 pt-1 border-t border-amber-200/60 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">TDS Rate (%)</label>
                          <select
                            value={tdsRate}
                            onChange={(e) => setTdsRate(parseFloat(e.target.value) || 1)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                          >
                            <option value="1">1% (Sec 194C / 194Q)</option>
                            <option value="0.1">0.1% (Sec 194Q Goods)</option>
                            <option value="2">2% (Sec 194C Co.)</option>
                            <option value="5">5% (Sec 194H Comm.)</option>
                            <option value="10">10% (Sec 194J Prof.)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">TDS Base</label>
                          <select
                            value={tdsBase}
                            onChange={(e) => setTdsBase(e.target.value as 'TAXABLE' | 'TOTAL')}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                          >
                            <option value="TAXABLE">Taxable Value</option>
                            <option value="TOTAL">Total Bill Value</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Section / Note</label>
                        <input 
                          type="text"
                          placeholder="e.g. Sec 194C Contractor"
                          value={tdsSection}
                          onChange={(e) => setTdsSection(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                        />
                      </div>

                      <div className="flex justify-between items-center text-amber-900 font-bold bg-amber-100/70 px-2.5 py-1.5 rounded-lg text-xs">
                        <span>Less: TDS ({tdsRate}%):</span>
                        <span className="font-mono">-{formatIndianCurrency(totals.tdsAmount)}</span>
                      </div>

                      <div className="p-2 bg-blue-50 border border-blue-200/80 rounded-lg text-[10px] text-blue-900 leading-tight">
                        ✓ <strong>Ledger Integrated:</strong> TDS will be added directly to this party's Khata &amp; Ledger statement (will not be printed on the invoice letter pad).
                      </div>
                    </div>
                  )}
                </div>

                {/* Grand Total Box */}
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 mt-2 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 text-sm">Grand Total:</span>
                    <span className="font-mono font-black text-xl text-blue-900">{formatIndianCurrency(totals.grandTotal)}</span>
                  </div>
                  {isTdsApplicable && totals.tdsAmount > 0 && (
                    <div className="flex justify-between items-baseline pt-1 border-t border-blue-200/70 text-emerald-800 font-bold">
                      <span className="text-xs">Net Receivable / Payable:</span>
                      <span className="font-mono text-base">{formatIndianCurrency(totals.netPayableAfterTds)}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 italic leading-snug">
                    {numberToIndianWords(isTdsApplicable ? totals.netPayableAfterTds : totals.grandTotal)}
                  </div>
                </div>

                {/* Payment Settlement */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700">Amount Received (₹):</span>
                    <input 
                      type="number"
                      min="0"
                      placeholder="0"
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-800 text-right focus:bg-white"
                    />
                  </div>

                  <div className="flex justify-between text-xs font-bold text-rose-700 pt-1">
                    <span>Balance Due:</span>
                    <span className="font-mono">{formatIndianCurrency(totals.balanceDue)}</span>
                  </div>

                  {paidAmount > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                        className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                      >
                        <option value="UPI">UPI (GPay/PhonePe)</option>
                        <option value="CASH">Cash</option>
                        <option value="NEFT_RTGS">NEFT / RTGS</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CARD">Debit / Credit Card</option>
                      </select>

                      <input 
                        type="text"
                        placeholder="Ref / UPI UTR"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => handleSaveInvoice(true)}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-98"
            >
              <Printer className="w-4 h-4" /> {docType === 'QUOTATION' ? 'Save & Preview / Print Quotation' : 'Save & Preview / Print Bill'}
            </button>

            <button
              type="button"
              onClick={() => handleSaveInvoice(false)}
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" /> {docType === 'QUOTATION' ? 'Save Quotation' : 'Save Only'}
            </button>
          </div>

        </div>

      </div>

      {/* HSN Directory Modal */}
      <HsnFinderModal 
        isOpen={isHsnModalOpen}
        onClose={() => setIsHsnModalOpen(false)}
        onSelectHsn={(hsn) => {
          if (activeItemIndexForHsn !== null) {
            handleItemChange(activeItemIndexForHsn, 'hsnCode', hsn.code);
            handleItemChange(activeItemIndexForHsn, 'taxRate', hsn.rate);
          }
        }}
      />

      {/* Quick Add / Edit Party Modal */}
      {isQuickPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-blue-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingPartyInBuilder 
                  ? `Edit ${editingPartyInBuilder.name} Details` 
                  : `+ Add New ${(docType === 'SERVICE_ORDER' || docType === 'PURCHASE_BILL' || docType === 'PURCHASE_ESTIMATE') ? 'Supplier' : 'Customer'}`}
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setIsQuickPartyModalOpen(false);
                  setEditingPartyInBuilder(null);
                }}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddPartySubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer / Business Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Reliance Retail / Manoj Enterprises"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input 
                    type="tel"
                    placeholder="+91 98..."
                    value={newPartyPhone}
                    onChange={(e) => setNewPartyPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input 
                    type="text"
                    placeholder="City"
                    value={newPartyCity}
                    onChange={(e) => setNewPartyCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input 
                    type="text"
                    maxLength={15}
                    placeholder="27AA..."
                    value={newPartyGstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setNewPartyGstin(val);
                      const detected = detectStateFromGSTIN(val);
                      if (detected) setNewPartyStateCode(detected.code);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <select
                    value={newPartyStateCode}
                    onChange={(e) => setNewPartyStateCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    {GST_STATES.map(s => (
                      <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input 
                  type="text"
                  placeholder="Street / Shop address"
                  value={newPartyAddress}
                  onChange={(e) => setNewPartyAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickPartyModalOpen(false);
                    setEditingPartyInBuilder(null);
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingPartyInBuilder ? 'Update Details' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared Unit Suggestions Datalist for fast manual typing & autocomplete */}
      <datalist id="unit-suggestions-datalist">
        <option value="MTR" />
        <option value="MTR SQUARE" />
        <option value="SQMTR" />
        <option value="INCH" />
        <option value="IDM" />
        <option value="MT" />
        <option value="TON" />
        <option value="PCS" />
        <option value="NOS" />
        <option value="KGS" />
        <option value="SQFT" />
        <option value="SFT" />
        <option value="SQM" />
        <option value="SET" />
        <option value="BOX" />
        <option value="BAG" />
        <option value="LTR" />
        <option value="FEET" />
        <option value="R.MTR" />
        <option value="CMS" />
        <option value="MM" />
        <option value="EACH" />
        <option value="LUMP SUM" />
        <option value="LUMP SUMP" />
        <option value="HOURS" />
        <option value="PAC" />
        <option value="DOZ" />
        <option value="GM" />
        <option value="CBM" />
        <option value="COIL" />
        <option value="DRUM" />
        <option value="JOB" />
        <option value="LOT" />
        <option value="TRUCK" />
        <option value="BUNDLE" />
        <option value="PKT" />
      </datalist>

    </div>
  );
};
