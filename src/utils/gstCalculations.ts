import { GST_STATES } from '../data/mockData';
import { InvoiceItem, PaymentStatus, DocumentType } from '../types';

/**
 * Formats a number to Indian numbering currency format (e.g., ₹ 1,23,456.00)
 */
export function formatIndianCurrency(amount: number, includeSymbol: boolean = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return includeSymbol ? '₹0.00' : '0.00';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixed = absAmount.toFixed(2);
  const [integerPart, decimalPart] = fixed.split('.');

  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const result = `${formattedInteger}.${decimalPart}`;
  
  return (isNegative ? '-' : '') + (includeSymbol ? `₹${result}` : result);
}

/**
 * Converts a number to Indian words format (Crores, Lakhs, Thousands, Hundreds)
 */
export function numberToIndianWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return '';
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
      if (n > 0) str += 'and ';
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  }

  const rounded = Math.abs(Math.round(num * 100) / 100);
  const wholePart = Math.floor(rounded);
  const decimalPart = Math.round((rounded - wholePart) * 100);

  let output = '';

  const crore = Math.floor(wholePart / 10000000);
  const remainder1 = wholePart % 10000000;
  const lakh = Math.floor(remainder1 / 100000);
  const remainder2 = remainder1 % 100000;
  const thousand = Math.floor(remainder2 / 1000);
  const remainder3 = remainder2 % 1000;

  if (crore > 0) output += inWords(crore) + 'Crore ';
  if (lakh > 0) output += inWords(lakh) + 'Lakh ';
  if (thousand > 0) output += inWords(thousand) + 'Thousand ';
  if (remainder3 > 0) output += inWords(remainder3);

  output = output.trim();
  if (!output) output = 'Zero';

  let finalWords = `Rupees ${output}`;
  if (decimalPart > 0) {
    finalWords += ` and ${inWords(decimalPart).trim()} Paise`;
  }
  return `${finalWords} Only`;
}

/**
 * Union Territory state codes without legislature in GST
 * 04: Chandigarh, 26: Dadra and Nagar Haveli and Daman and Diu, 31: Lakshadweep, 
 * 35: Andaman and Nicobar Islands, 38: Ladakh, 97: Other Territory
 */
export const UT_STATE_CODES = ['04', '26', '31', '35', '38', '97'];

export function isUnionTerritory(stateCodeOrName?: string): boolean {
  if (!stateCodeOrName) return false;
  const clean = stateCodeOrName.trim();
  const code = clean.substring(0, 2);
  if (UT_STATE_CODES.includes(code)) return true;
  const lower = clean.toLowerCase();
  return (
    lower.includes('chandigarh') ||
    lower.includes('daman') ||
    lower.includes('diu') ||
    lower.includes('dadra') ||
    lower.includes('nagar haveli') ||
    lower.includes('ladakh') ||
    lower.includes('lakshadweep') ||
    lower.includes('andaman') ||
    lower.includes('nicobar') ||
    lower.includes('other territory')
  );
}

/**
 * Detect State Name and Code from 15-digit GSTIN (First 2 digits are state code)
 */
export function detectStateFromGSTIN(gstin?: string): { code: string; name: string } | null {
  if (!gstin || gstin.trim().length < 2) return null;
  const stateCode = gstin.trim().substring(0, 2);
  const foundState = GST_STATES.find(s => s.code === stateCode);
  if (foundState) {
    return foundState;
  }
  return { code: stateCode, name: `State (Code ${stateCode})` };
}

/**
 * Calculates a single line item with GST (CGST, SGST, UGST, IGST), Discount, and Cess
 */
export function calculateLineItem(
  quantity: number,
  rate: number,
  discountPercent: number = 0,
  taxRate: number = 18,
  isInterState: boolean = false,
  cessRate: number = 0,
  isUtgst: boolean = false
): Omit<InvoiceItem, 'id' | 'name' | 'unit' | 'hsnCode'> {
  const qty = Number(quantity) || 0;
  const unitRate = Number(rate) || 0;
  const discPct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const taxPct = Number(taxRate) || 0;
  const cessPct = Number(cessRate) || 0;

  const baseAmount = qty * unitRate;
  const discountAmount = (baseAmount * discPct) / 100;
  const taxableAmount = Math.max(0, baseAmount - discountAmount);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let ugstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = (taxableAmount * taxPct) / 100;
  } else {
    cgstAmount = (taxableAmount * (taxPct / 2)) / 100;
    if (isUtgst) {
      ugstAmount = (taxableAmount * (taxPct / 2)) / 100;
      sgstAmount = 0;
    } else {
      sgstAmount = (taxableAmount * (taxPct / 2)) / 100;
      ugstAmount = 0;
    }
  }

  const cessAmount = (taxableAmount * cessPct) / 100;
  const totalAmount = taxableAmount + cgstAmount + sgstAmount + ugstAmount + igstAmount + cessAmount;

  return {
    quantity: qty,
    rate: unitRate,
    discountPercent: discPct,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    taxRate: taxPct,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    ugstAmount: Math.round(ugstAmount * 100) / 100,
    igstAmount: Math.round(igstAmount * 100) / 100,
    cessAmount: Math.round(cessAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Calculates complete Invoice totals including CGST, SGST, UGST, IGST, cess, TDS deduction, and round off
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[],
  extraDiscount: number = 0,
  shippingCharges: number = 0,
  paidAmount: number = 0,
  isUtgst: boolean = false,
  isTdsApplicable: boolean = false,
  tdsRate: number = 1,
  tdsBase: 'TAXABLE' | 'TOTAL' = 'TAXABLE'
) {
  let subTotal = 0;
  let itemDiscountTotal = 0;
  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let ugstTotal = 0;
  let igstTotal = 0;
  let cessTotal = 0;

  items.forEach(item => {
    const base = item.quantity * item.rate;
    const disc = (base * item.discountPercent) / 100;
    subTotal += base;
    itemDiscountTotal += disc;
    taxableTotal += item.taxableAmount;
    cgstTotal += item.cgstAmount || 0;
    sgstTotal += item.sgstAmount || 0;
    ugstTotal += item.ugstAmount || 0;
    igstTotal += item.igstAmount || 0;
    cessTotal += item.cessAmount || 0;
  });

  // If isUtgst is set and ugstTotal is empty but sgstTotal exists, map sgstTotal to ugstTotal
  if (isUtgst && ugstTotal === 0 && sgstTotal > 0) {
    ugstTotal = sgstTotal;
    sgstTotal = 0;
  }

  const grossTotal = taxableTotal + cgstTotal + sgstTotal + ugstTotal + igstTotal + cessTotal + Number(shippingCharges || 0) - Number(extraDiscount || 0);
  const roundedGrandTotal = Math.round(grossTotal);
  const roundOff = Math.round((roundedGrandTotal - grossTotal) * 100) / 100;

  // TDS deduction calculation
  let tdsAmount = 0;
  if (isTdsApplicable && Number(tdsRate) > 0) {
    const baseForTds = tdsBase === 'TOTAL' ? roundedGrandTotal : taxableTotal;
    tdsAmount = Math.round((baseForTds * (Number(tdsRate) / 100)) * 100) / 100;
  }
  const netPayableAfterTds = Math.max(0, Math.round((roundedGrandTotal - tdsAmount) * 100) / 100);

  const finalPaid = Math.max(0, Number(paidAmount || 0));
  const effectiveTotalForDue = isTdsApplicable ? netPayableAfterTds : roundedGrandTotal;
  const balanceDue = Math.max(0, Math.round((effectiveTotalForDue - finalPaid) * 100) / 100);

  let paymentStatus: PaymentStatus = 'UNPAID';
  if (finalPaid >= effectiveTotalForDue && effectiveTotalForDue > 0) {
    paymentStatus = 'PAID';
  } else if (finalPaid > 0 && finalPaid < effectiveTotalForDue) {
    paymentStatus = 'PARTIAL';
  }

  return {
    subTotal: Math.round(subTotal * 100) / 100,
    itemDiscountTotal: Math.round(itemDiscountTotal * 100) / 100,
    taxableTotal: Math.round(taxableTotal * 100) / 100,
    cgstTotal: Math.round(cgstTotal * 100) / 100,
    sgstTotal: Math.round(sgstTotal * 100) / 100,
    ugstTotal: Math.round(ugstTotal * 100) / 100,
    igstTotal: Math.round(igstTotal * 100) / 100,
    cessTotal: Math.round(cessTotal * 100) / 100,
    roundOff,
    grandTotal: roundedGrandTotal,
    tdsAmount,
    netPayableAfterTds,
    paidAmount: finalPaid,
    balanceDue,
    paymentStatus,
  };
}

/**
 * Helper to get tax breakdown info for an invoice
 */
export function getInvoiceTaxBreakdown(invoice: {
  isInterState?: boolean;
  isUtgst?: boolean;
  partyStateCode?: string;
  placeOfSupply?: string;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  ugstTotal?: number;
  igstTotal: number;
  items?: InvoiceItem[];
}) {
  const isUT = Boolean(
    invoice.isUtgst || 
    (!invoice.isInterState && isUnionTerritory(invoice.partyStateCode || invoice.placeOfSupply))
  );

  const effectiveUgstTotal = (invoice.ugstTotal && invoice.ugstTotal > 0)
    ? invoice.ugstTotal
    : (isUT && invoice.sgstTotal > 0 ? invoice.sgstTotal : 0);

  const effectiveSgstTotal = isUT ? 0 : (invoice.sgstTotal || 0);
  const effectiveCgstTotal = invoice.cgstTotal || 0;
  const effectiveIgstTotal = invoice.igstTotal || 0;

  const totalTax = effectiveIgstTotal + effectiveCgstTotal + effectiveSgstTotal + effectiveUgstTotal;
  
  const sampleTaxRate = invoice.items && invoice.items[0]?.taxRate ? invoice.items[0].taxRate : 18;
  const halfTaxRate = sampleTaxRate / 2;

  return {
    isUT,
    taxMode: invoice.isInterState ? 'IGST' : (isUT ? 'CGST_UGST' : 'CGST_SGST'),
    cgstTotal: effectiveCgstTotal,
    sgstTotal: effectiveSgstTotal,
    ugstTotal: effectiveUgstTotal,
    igstTotal: effectiveIgstTotal,
    totalTax,
    sampleTaxRate,
    halfTaxRate,
  };
}

/**
 * Generates official NPCI compliant UPI payment string for QR Code
 */
export function generateUpiUrl(upiId: string, payeeName: string, amount: number, invoiceNo: string): string {
  const cleanUpi = encodeURIComponent(upiId.trim());
  const cleanName = encodeURIComponent(payeeName.trim());
  const formattedAmt = amount > 0 ? amount.toFixed(2) : '';
  const note = encodeURIComponent(`Bill ${invoiceNo}`);
  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${formattedAmt}&cu=INR&tn=${note}`;
}

/**
 * Returns user-friendly document name
 */
export function getDocumentTypeName(type: DocumentType): string {
  switch (type) {
    case 'TAX_INVOICE': return 'Tax Invoice';
    case 'SERVICE_ORDER': return 'Service Order / Work Order';
    case 'PROFORMA_INVOICE': return 'Proforma Invoice';
    case 'QUOTATION': return 'Quotation / Estimate';
    case 'PURCHASE_ESTIMATE': return 'Purchase Estimate / PO';
    case 'DELIVERY_CHALLAN': return 'Delivery Challan';
    case 'PURCHASE_BILL': return 'Purchase Bill';
    case 'CREDIT_NOTE': return 'Credit Note';
    case 'DEBIT_NOTE': return 'Debit Note';
    case 'PAYMENT_RECEIPT': return 'Payment Receipt';
    default: return 'Tax Invoice';
  }
}

/**
 * Helper to download CSV file
 */
export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
