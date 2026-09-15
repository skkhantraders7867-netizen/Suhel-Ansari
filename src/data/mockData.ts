import { 
  BusinessProfile, Party, Item, Invoice, GSTState, PaymentRecord,
  Expense, BankAccount, CashTransaction, EWayBillRecord 
} from '../types';

export const GST_STATES: GSTState[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export interface HsnItem {
  code: string;
  description: string;
  rate: number;
  category: 'Goods' | 'Services';
}

export const COMMON_HSN_CODES: HsnItem[] = [
  { code: '8471', description: 'Computers, Laptops, Processing units & Accessories', rate: 18, category: 'Goods' },
  { code: '8517', description: 'Smartphones, Mobile Handsets, Routers & Telecom Gear', rate: 18, category: 'Goods' },
  { code: '8528', description: 'Monitors, LED TVs, Projectors', rate: 18, category: 'Goods' },
  { code: '8504', description: 'Power Adapters, Inverters, UPS & SMPS', rate: 18, category: 'Goods' },
  { code: '6203', description: "Men's Garments, Suits, Trousers & Shirts", rate: 5, category: 'Goods' },
  { code: '6204', description: "Women's Garments, Kurtis, Sarees & Dresses", rate: 5, category: 'Goods' },
  { code: '6402', description: 'Footwear & Shoes (Value > ₹1000)', rate: 12, category: 'Goods' },
  { code: '1006', description: 'Rice, Basmati & Non-Basmati (Packed & Branded)', rate: 5, category: 'Goods' },
  { code: '0402', description: 'Dairy Products, Milk, Butter & Paneer', rate: 5, category: 'Goods' },
  { code: '0902', description: 'Tea, Green Tea & Flavoured Tea Leaves', rate: 5, category: 'Goods' },
  { code: '7308', description: 'Structural Iron, Steel Structures & Fasteners', rate: 18, category: 'Goods' },
  { code: '3004', description: 'Medicines, Pharmaceuticals & Tablets', rate: 12, category: 'Goods' },
  { code: '3924', description: 'Plastic Household Items, Bottles & Containers', rate: 18, category: 'Goods' },
  { code: '9403', description: 'Office & Home Furniture (Wooden/Metal)', rate: 18, category: 'Goods' },
  { code: '8708', description: 'Automobile Spare Parts & Components', rate: 28, category: 'Goods' },
  { code: '9983', description: 'Software Development, IT Consulting & Design Services', rate: 18, category: 'Services' },
  { code: '9987', description: 'Maintenance, Repair & Installation Services', rate: 18, category: 'Services' },
  { code: '9965', description: 'Goods Transport Agency (GTA) / Freight Services', rate: 5, category: 'Services' },
  { code: '9972', description: 'Commercial Real Estate & Rental Services', rate: 18, category: 'Services' },
  { code: '9963', description: 'Restaurant & Catering Food Services', rate: 5, category: 'Services' },
];

export const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  name: 'SR Group',
  tradeName: 'SR Group',
  logoUrl: 'https://lh3.googleusercontent.com/d/16BUJ9mO_ZLvGvhuxxLRwnvlWxeiemQX8',
  gstin: '',
  pan: '',
  email: 'skkhantraders7867@gmail.com',
  phone: '',
  address: '',
  city: '',
  state: 'Maharashtra',
  stateCode: '27',
  pincode: '',
  accountHolderName: 'SR Group',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  branchName: '',
  upiId: '',
  upiName: 'SR Group',
  termsAndConditions: '1. Goods once sold will not be taken back or exchanged.\n2. Interest @ 18% p.a. will be charged if bill is not paid within due date.\n3. Subject to jurisdiction of our registered office.\n4. All disputes are subject to local arbitration.',
  quotationTermsAndConditions: '1. Price Validity: This quotation is valid for 30 days from the date of issue.\n2. Payment Terms: 50% advance along with confirmed Purchase Order, balance against proforma before dispatch.\n3. Taxes & Duties: GST applicable as per prevailing statutory rates.\n4. Delivery Schedule: Within 2-3 weeks from receipt of clear PO and technical approval.\n5. Freight & Handling: Extra at actuals unless explicitly included.\n6. Jurisdiction: Subject to jurisdiction of our registered office.',
  purchaseTermsAndConditions: '1. Delivery & Inspection: Materials must strictly comply with PO specifications and site inspection.\n2. Test Certificates: Mill Test Certificates (MTC) and inspection reports must accompany the delivery.\n3. Rejection Policy: Defective or non-compliant materials will be rejected at supplier cost.\n4. Payment Terms: Payment within 30 days of receipt of verified material and original tax invoice.\n5. Delivery Timeline: Strict adherence to agreed delivery schedules is mandatory.',
  invoiceNotes: 'Thank you for your business!',
  invoicePrefix: 'INV-2026-',
  nextInvoiceNumber: 1,
  billPadUrl: 'https://lh3.googleusercontent.com/d/1XMbVyXZXJ4DsVd_wfJViJ1sooBv3brJ2',
  billPadHeaderOffset: 148,
  billPadFooterOffset: 125,
  useCustomBillPad: true,
};

// Pure blank slate for new user entries
export const INITIAL_PARTIES: Party[] = [];
export const INITIAL_ITEMS: Item[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [];
export const INITIAL_CASH_TRANSACTIONS: CashTransaction[] = [];
export const INITIAL_EWAY_BILLS: EWayBillRecord[] = [];
