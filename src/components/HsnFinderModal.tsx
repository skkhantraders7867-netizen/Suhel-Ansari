import React, { useState } from 'react';
import { Search, X, Check, ShieldCheck, Tag, Sparkles } from 'lucide-react';
import { COMMON_HSN_CODES, HsnItem } from '../data/mockData';

interface HsnFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHsn?: (hsn: HsnItem) => void;
}

export const HsnFinderModal: React.FC<HsnFinderModalProps> = ({ isOpen, onClose, onSelectHsn }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Goods' | 'Services'>('All');

  if (!isOpen) return null;

  const filteredHsn = COMMON_HSN_CODES.filter(item => {
    const matchesSearch = 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${item.rate}%`.includes(searchTerm);
    const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <ShieldCheck className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">GST HSN & SAC Code Directory</h2>
              <p className="text-xs text-blue-200">Find official Harmonized System Nomenclature codes & GST tax rates</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by commodity, product name, service or HSN code (e.g. Computers, Rice, 8471)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-xs"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Type:
            </span>
            {(['All', 'Goods', 'Services'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  categoryFilter === cat 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* HSN Codes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100">
          {filteredHsn.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Sparkles className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
              <p className="text-sm font-medium">No HSN / SAC codes found matching "{searchTerm}"</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for generic terms like "garments", "electronics", or "services"</p>
            </div>
          ) : (
            filteredHsn.map((item) => (
              <div 
                key={item.code}
                className="pt-2.5 first:pt-0 flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-blue-50/60 transition-colors border border-transparent hover:border-blue-100 group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                      HSN {item.code}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.category === 'Goods' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {item.category}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                      GST {item.rate}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium leading-snug">{item.description}</p>
                </div>

                {onSelectHsn && (
                  <button
                    onClick={() => {
                      onSelectHsn(item);
                      onClose();
                    }}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Select
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Standard CBIC Indian GST Rates (0%, 5%, 12%, 18%, 28%)</span>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
