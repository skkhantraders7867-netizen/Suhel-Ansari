import React, { useState } from 'react';
import { 
  Search, Plus, Package, AlertTriangle, 
  ArrowUpDown, Filter, Edit2, Trash2, Tag, Layers, Check, Sparkles
} from 'lucide-react';
import { Item, UnitType } from '../types';
import { formatIndianCurrency } from '../utils/gstCalculations';
import { HsnFinderModal } from './HsnFinderModal';

interface InventoryViewProps {
  items: Item[];
  onAddNewItem: (item: Omit<Item, 'id' | 'createdAt'>) => Item;
  onUpdateItem: (item: Item) => void;
  onAdjustStock: (itemId: string, newStock: number) => void;
  onDeleteItem: (id: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  onAddNewItem,
  onUpdateItem,
  onAdjustStock,
  onDeleteItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<Item | null>(null);
  const [stockAdjustmentQty, setStockAdjustmentQty] = useState<number>(0);
  const [isHsnModalOpen, setIsHsnModalOpen] = useState(false);

  // Form State for Add Item
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formHsn, setFormHsn] = useState('');
  const [formUnit, setFormUnit] = useState<UnitType>('PCS');
  const [formPurchasePrice, setFormPurchasePrice] = useState<number>(0);
  const [formSellingPrice, setFormSellingPrice] = useState<number>(0);
  const [formTaxRate, setFormTaxRate] = useState<number>(18);
  const [formMinStock, setFormMinStock] = useState<number>(10);
  const [formCurrentStock, setFormCurrentStock] = useState<number>(50);
  const [formCategory, setFormCategory] = useState('General');

  // Categories
  const categories = ['ALL', ...Array.from(new Set(items.map(i => i.category)))];

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hsnCode.includes(searchTerm) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.barcode && item.barcode.includes(searchTerm));

    const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesLowStock = !showLowStockOnly || item.currentStock <= item.minStockLevel;

    return matchesSearch && matchesCat && matchesLowStock;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    onAddNewItem({
      name: formName.trim(),
      sku: formSku.trim() || undefined,
      barcode: formBarcode.trim() || undefined,
      hsnCode: formHsn.trim() || '8471',
      unit: formUnit,
      purchasePrice: Number(formPurchasePrice) || 0,
      sellingPrice: Number(formSellingPrice) || 0,
      isTaxInclusive: false,
      taxRate: Number(formTaxRate) || 18,
      minStockLevel: Number(formMinStock) || 5,
      currentStock: Number(formCurrentStock) || 0,
      category: formCategory.trim() || 'General',
    });

    setIsAddModalOpen(false);
    setFormName('');
    setFormSku('');
    setFormBarcode('');
    setFormPurchasePrice(0);
    setFormSellingPrice(0);
  };

  const handleStockAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdjust) return;
    onAdjustStock(selectedItemForAdjust.id, stockAdjustmentQty);
    setIsAdjustStockOpen(false);
    setSelectedItemForAdjust(null);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventory & Products Catalog</h1>
          <p className="text-xs text-slate-500">Track stock levels, HSN codes, GST tax rates, and low stock reorder alerts</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> + Add New Product / Service
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by Product Name, SKU, HSN, Barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Category */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'ALL' ? 'All Product Categories' : c}</option>
              ))}
            </select>
          </div>

          {/* Low Stock Toggle */}
          <div className="flex items-center">
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                showLowStockOnly 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{showLowStockOnly ? 'Showing Low Stock Only' : 'Filter Low Stock Alert'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                <th className="py-3 px-4">Item Name & SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-center font-mono">HSN</th>
                <th className="py-3 px-3 text-right">Purchase (₹)</th>
                <th className="py-3 px-3 text-right">Selling (₹)</th>
                <th className="py-3 px-3 text-center">GST Rate</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
                    <p className="font-semibold text-slate-600">No items found</p>
                    <p className="text-xs text-slate-400">Add new products to start tracking inventory</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLowStock = item.currentStock <= item.minStockLevel;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>{item.name}</div>
                        {item.sku && <div className="font-mono text-[10px] text-slate-400">SKU: {item.sku}</div>}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono font-medium text-blue-900">
                        {item.hsnCode}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                        {formatIndianCurrency(item.purchasePrice, false)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatIndianCurrency(item.sellingPrice, false)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                          {item.taxRate}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`font-mono font-black text-xs ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                            {item.currentStock} {item.unit}
                          </span>
                          {isLowStock && (
                            <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-sm">
                              Low
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedItemForAdjust(item);
                              setStockAdjustmentQty(item.currentStock);
                              setIsAdjustStockOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-semibold text-[11px] rounded-lg transition-colors"
                          >
                            Adjust Stock
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-blue-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New Inventory Product / Service</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product / Item Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Wireless Mouse / Basmati Rice 5kg"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">HSN Code *</label>
                    <button 
                      type="button" 
                      onClick={() => setIsHsnModalOpen(true)}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      Find HSN
                    </button>
                  </div>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 8471"
                    value={formHsn}
                    onChange={(e) => setFormHsn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate</label>
                  <select
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formPurchasePrice || ''}
                    onChange={(e) => setFormPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input 
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={formSellingPrice || ''}
                    onChange={(e) => setFormSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit (टाइप करें)</label>
                  <input
                    type="text"
                    list="inventory-unit-datalist"
                    placeholder="e.g. MTR, TON, PCS"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as UnitType)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 uppercase focus:bg-white focus:ring-2 focus:ring-blue-600"
                    title="Type or choose unit"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stock</label>
                  <input 
                    type="number"
                    value={formCurrentStock || ''}
                    onChange={(e) => setFormCurrentStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Alert Qty</label>
                  <input 
                    type="number"
                    value={formMinStock || ''}
                    onChange={(e) => setFormMinStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input 
                    type="text"
                    placeholder="e.g. Electronics"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU / Item Code</label>
                  <input 
                    type="text"
                    placeholder="SKU"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustStockOpen && selectedItemForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Update Stock Quantity</h3>
              <button onClick={() => setIsAdjustStockOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleStockAdjustSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <span className="font-bold text-slate-900 block text-sm">{selectedItemForAdjust.name}</span>
                <span className="text-slate-500 font-mono">Current Stock: {selectedItemForAdjust.currentStock} {selectedItemForAdjust.unit}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Total Stock in Hand</label>
                <input 
                  type="number"
                  min="0"
                  required
                  value={stockAdjustmentQty}
                  onChange={(e) => setStockAdjustmentQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:bg-white"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustStockOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HSN Modal */}
      <HsnFinderModal 
        isOpen={isHsnModalOpen}
        onClose={() => setIsHsnModalOpen(false)}
        onSelectHsn={(hsn) => {
          setFormHsn(hsn.code);
          setFormTaxRate(hsn.rate);
        }}
      />

      {/* Unit Suggestions Datalist */}
      <datalist id="inventory-unit-datalist">
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
