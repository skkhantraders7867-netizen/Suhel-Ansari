import React, { useState, useRef } from 'react';
import { 
  Printer, Download, Sparkles, FileText, Check, Copy, 
  RotateCcw, Sliders, Eye, Edit3, Plus, Trash2, ChevronDown, 
  Building2, Calendar, FileSignature, ArrowRight, ShieldCheck,
  Maximize2, Minimize2, ZoomIn, ZoomOut, Loader2
} from 'lucide-react';
import { BusinessLetter, BusinessProfile } from '../types';
import { downloadElementAsPdf, printElementSafely } from '../utils/pdfExport';
import { INITIAL_BUSINESS_LETTERS, SUHEL_ENGINEERING_LETTERHEAD_URL } from '../data/letterTemplates';

interface LetterheadDocumentViewProps {
  businessProfile: BusinessProfile;
}

export const LetterheadDocumentView: React.FC<LetterheadDocumentViewProps> = ({ businessProfile }) => {
  const [letters, setLetters] = useState<BusinessLetter[]>(() => {
    const saved = localStorage.getItem('suhel_business_letters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_BUSINESS_LETTERS;
  });

  const [activeLetterId, setActiveLetterId] = useState<string>(letters[0]?.id || 'let-1');
  const [activeTab, setActiveTab] = useState<'PREVIEW' | 'EDIT' | 'PRESETS'>('PREVIEW');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState<boolean>(true);
  const [watermarkVisual, setWatermarkVisual] = useState<'LIGHT' | 'CLEAR' | 'BOLD' | 'DARK'>('CLEAR');

  const printAreaRef = useRef<HTMLDivElement>(null);

  const currentLetter = letters.find((l) => l.id === activeLetterId) || letters[0];

  const updateCurrentLetter = (updates: Partial<BusinessLetter>) => {
    const updated = letters.map((l) => (l.id === currentLetter.id ? { ...l, ...updates } : l));
    setLetters(updated);
    localStorage.setItem('suhel_business_letters', JSON.stringify(updated));
  };

  const handlePrint = () => {
    if (printAreaRef.current) {
      printElementSafely(printAreaRef.current, `${currentLetter.companyName || 'Suhel Engineering'} Letter ${currentLetter.refNo}`);
    }
  };

  const handleExportPdf = async () => {
    if (!printAreaRef.current) return;
    setIsExportingPdf(true);
    try {
      const fileName = `${(currentLetter.companyName || 'Suhel_Engineering').replace(/\s+/g, '_')}_${currentLetter.refNo.replace(/[^a-zA-Z0-9]/g, '_')}_A4.pdf`;
      await downloadElementAsPdf(printAreaRef.current, fileName, {
        scale: 2.5,
      });
    } catch (err) {
      console.error('Failed to export letter PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const resetToDefault = () => {
    setLetters(INITIAL_BUSINESS_LETTERS);
    localStorage.removeItem('suhel_business_letters');
  };

  const letterheadImageUrl = currentLetter.letterheadUrl || businessProfile.billPadUrl || SUHEL_ENGINEERING_LETTERHEAD_URL;
  const headerOffset = currentLetter.headerOffset ?? 148;
  const footerOffset = currentLetter.footerOffset ?? 125;
  const fontSize = currentLetter.contentFontSize ?? 12;
  const scale = (currentLetter.scale ?? 100) / 100;
  const cardOpacity = currentLetter.cardOpacity ?? 'clear';

  return (
    <div className="space-y-4">
      {/* Top Header Banner */}
      <div className="bg-slate-900 text-white p-4 md:p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Official Suhel Engineering Letterhead
            </span>
            <span className="text-xs text-slate-400 font-mono">1-Page A4 Precision Layout</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Official Business Letter & Proposal Studio
          </h1>
          <p className="text-xs md:text-sm text-slate-300">
            Full-width and full-height document formatting on official letterhead with visible watermark and 1-page A4 print fit.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating A4 PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export 1-Page A4 PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs md:text-sm rounded-xl border border-slate-700 transition-all active:scale-95 shadow-xs"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Print Document</span>
          </button>
        </div>
      </div>

      {/* Preset Selector & Tool Strip */}
      <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-500 uppercase text-[11px] mr-1">Select Document:</span>
          {letters.map((l, index) => (
            <button
              key={l.id}
              onClick={() => setActiveLetterId(l.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeLetterId === l.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{l.subject.length > 28 ? `${l.subject.slice(0, 28)}...` : l.subject}</span>
            </button>
          ))}
        </div>

        {/* View / Edit Mode Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 font-semibold">
          <button
            onClick={() => setActiveTab('PREVIEW')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'PREVIEW' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Live A4 Preview
          </button>
          <button
            onClick={() => setActiveTab('EDIT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'EDIT' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Content
          </button>
          <button
            onClick={() => setActiveTab('PRESETS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'PRESETS' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Letterhead Settings
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      {activeTab === 'EDIT' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Edit Business Letter Details</h2>
              <p className="text-xs text-slate-500">Every change here updates the live 1-page A4 letterhead view in real-time.</p>
            </div>
            <button
              onClick={() => setActiveTab('PREVIEW')}
              className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 hover:bg-blue-700"
            >
              <Eye className="w-3.5 h-3.5" /> Back to Live Preview
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Reference Number</label>
              <input
                type="text"
                value={currentLetter.refNo}
                onChange={(e) => updateCurrentLetter({ refNo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Letter Date</label>
              <input
                type="date"
                value={currentLetter.date}
                onChange={(e) => updateCurrentLetter({ date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Recipient Name / Attention</label>
              <input
                type="text"
                value={currentLetter.recipientName}
                onChange={(e) => updateCurrentLetter({ recipientName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Recipient Designation</label>
              <input
                type="text"
                value={currentLetter.recipientDesignation || ''}
                onChange={(e) => updateCurrentLetter({ recipientDesignation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Recipient Company / Organisation</label>
              <input
                type="text"
                value={currentLetter.recipientCompany}
                onChange={(e) => updateCurrentLetter({ recipientCompany: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1">Recipient Full Address</label>
            <input
              type="text"
              value={currentLetter.recipientAddress}
              onChange={(e) => updateCurrentLetter({ recipientAddress: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1">Subject Line</label>
            <input
              type="text"
              value={currentLetter.subject}
              onChange={(e) => updateCurrentLetter({ subject: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Salutation</label>
              <input
                type="text"
                value={currentLetter.salutation}
                onChange={(e) => updateCurrentLetter({ salutation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Issuing Letter</label>
              <input
                type="text"
                value={currentLetter.companyName}
                onChange={(e) => updateCurrentLetter({ companyName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1">Opening Paragraph</label>
            <textarea
              rows={2}
              value={currentLetter.openingParagraph}
              onChange={(e) => updateCurrentLetter({ openingParagraph: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl leading-relaxed"
            />
          </div>

          {/* Body Paragraphs */}
          <div className="text-xs space-y-2">
            <label className="block font-bold text-slate-700">Body Paragraphs / Technical Notes</label>
            {currentLetter.bodyParagraphs.map((para, idx) => (
              <div key={idx} className="flex gap-2">
                <textarea
                  rows={2}
                  value={para}
                  onChange={(e) => {
                    const newParas = [...currentLetter.bodyParagraphs];
                    newParas[idx] = e.target.value;
                    updateCurrentLetter({ bodyParagraphs: newParas });
                  }}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl leading-relaxed"
                />
                <button
                  onClick={() => {
                    const newParas = currentLetter.bodyParagraphs.filter((_, i) => i !== idx);
                    updateCurrentLetter({ bodyParagraphs: newParas });
                  }}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl self-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                updateCurrentLetter({ bodyParagraphs: [...currentLetter.bodyParagraphs, ''] });
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Paragraph
            </button>
          </div>

          {/* Structured Table Editor */}
          {currentLetter.tableData && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">Item / Commercial Table</span>
                <button
                  onClick={() => {
                    const currentCols = currentLetter.tableData?.columns.length || 6;
                    const newRow = Array(currentCols).fill('');
                    newRow[0] = String((currentLetter.tableData?.rows.length || 0) + 1);
                    updateCurrentLetter({
                      tableData: {
                        columns: currentLetter.tableData!.columns,
                        rows: [...currentLetter.tableData!.rows, newRow],
                      },
                    });
                  }}
                  className="px-2.5 py-1 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Table Row
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      {currentLetter.tableData.columns.map((col, idx) => (
                        <th key={idx} className="p-2 text-left font-semibold">
                          {typeof col === 'string' ? col : col.title}
                        </th>
                      ))}
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentLetter.tableData.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="bg-white">
                        {row.map((cell, colIdx) => (
                          <td key={colIdx} className="p-1 border border-slate-200">
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => {
                                const newRows = currentLetter.tableData!.rows.map((r, rI) => {
                                  if (rI !== rowIdx) return r;
                                  const updatedCell = [...r];
                                  updatedCell[colIdx] = e.target.value;
                                  return updatedCell;
                                });
                                updateCurrentLetter({
                                  tableData: {
                                    columns: currentLetter.tableData!.columns,
                                    rows: newRows,
                                  },
                                });
                              }}
                              className="w-full px-2 py-1 bg-transparent text-xs"
                            />
                          </td>
                        ))}
                        <td className="p-1 text-center border border-slate-200">
                          <button
                            onClick={() => {
                              const newRows = currentLetter.tableData!.rows.filter((_, rI) => rI !== rowIdx);
                              updateCurrentLetter({
                                tableData: {
                                  columns: currentLetter.tableData!.columns,
                                  rows: newRows,
                                },
                              });
                            }}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1">Closing Paragraph / Commercial Terms</label>
            <textarea
              rows={2}
              value={currentLetter.closingParagraph || ''}
              onChange={(e) => updateCurrentLetter({ closingParagraph: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Authorized Signatory Name</label>
              <input
                type="text"
                value={currentLetter.signatoryName}
                onChange={(e) => updateCurrentLetter({ signatoryName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Signatory Title / Role</label>
              <input
                type="text"
                value={currentLetter.signatoryTitle}
                onChange={(e) => updateCurrentLetter({ signatoryTitle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Letterhead Geometry & Padding Settings */}
      {activeTab === 'PRESETS' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Letterhead Calibration & Margin Controls</h2>
              <p className="text-xs text-slate-500">Fine-tune top header gap and bottom footer gap so content matches any letterhead paper.</p>
            </div>
            <button
              onClick={resetToDefault}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default Suhel Letterhead
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Letterhead Image URL</label>
              <input
                type="text"
                value={currentLetter.letterheadUrl || ''}
                onChange={(e) => updateCurrentLetter({ letterheadUrl: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Table & Content Background Style</label>
              <div className="grid grid-cols-3 gap-2">
                {(['clear', 'tinted', 'solid'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => updateCurrentLetter({ cardOpacity: op })}
                    className={`py-2 rounded-xl font-bold uppercase text-[11px] border transition-colors ${
                      cardOpacity === op ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>Header Top Offset (Padding)</span>
                <span className="font-mono text-blue-600">{headerOffset}px</span>
              </div>
              <input
                type="range"
                min={40}
                max={300}
                step={5}
                value={headerOffset}
                onChange={(e) => updateCurrentLetter({ headerOffset: parseInt(e.target.value) || 160 })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Space for Suhel Engineering printed logo & header.</span>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>Footer Bottom Offset (Padding)</span>
                <span className="font-mono text-blue-600">{footerOffset}px</span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                step={5}
                value={footerOffset}
                onChange={(e) => updateCurrentLetter({ footerOffset: parseInt(e.target.value) || 90 })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Space for Suhel Engineering bottom footer and contact.</span>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>Font Size & Auto-Fit Scale</span>
                <span className="font-mono text-blue-600">{fontSize}px ({scale * 100}%)</span>
              </div>
              <input
                type="range"
                min={9}
                max={15}
                step={0.5}
                value={fontSize}
                onChange={(e) => updateCurrentLetter({ contentFontSize: parseFloat(e.target.value) || 12 })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Scale text proportionally to fit precisely on 1 A4 page.</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toolbar for Live Preview Adjustments */}
      <div className="bg-slate-900 text-slate-200 px-4 py-2.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs no-print">
        <div className="flex items-center gap-3">
          <span className="font-bold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> 1-Page A4 Mode Active
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">Letterhead: <strong>Suhel Engineering</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 text-[11px]">Header Gap:</span>
            <button
              onClick={() => updateCurrentLetter({ headerOffset: Math.max(40, headerOffset - 10) })}
              className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold"
            >
              -
            </button>
            <span className="font-mono text-amber-300 font-bold">{headerOffset}px</span>
            <button
              onClick={() => updateCurrentLetter({ headerOffset: Math.min(300, headerOffset + 10) })}
              className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 text-[11px]">Font Size:</span>
            <button
              onClick={() => updateCurrentLetter({ contentFontSize: Math.max(9, fontSize - 0.5) })}
              className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold"
            >
              -
            </button>
            <span className="font-mono text-amber-300 font-bold">{fontSize}px</span>
            <button
              onClick={() => updateCurrentLetter({ contentFontSize: Math.min(15, fontSize + 0.5) })}
              className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 text-[11px]">Style:</span>
            {(['clear', 'tinted', 'solid'] as const).map((op) => (
              <button
                key={op}
                onClick={() => updateCurrentLetter({ cardOpacity: op })}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                  cardOpacity === op ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {op}
              </button>
            ))}
          </div>

          {/* Bank Details Toggle (Strictly No UPI / QR) */}
          <button
            type="button"
            onClick={() => setShowBankDetails(!showBankDetails)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              showBankDetails
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
            title="Toggle Bank Details block on the letterhead"
          >
            <span>Bank Details:</span>
            <span className="uppercase">{showBankDetails ? 'ON' : 'OFF'}</span>
          </button>

          {/* Watermark Intensity and Visibility */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 text-[11px]">Watermark:</span>
            <span className="text-emerald-400 font-bold text-[10px] uppercase bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
              Original Pad Watermark
            </span>
            <button
              type="button"
              onClick={() => updateCurrentLetter({ showWatermark: !currentLetter.showWatermark })}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                currentLetter.showWatermark ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Toggle extra diagonal text overlay"
            >
              {currentLetter.showWatermark ? '+ Text Overlay ON' : '+ Add Text'}
            </button>
            {currentLetter.showWatermark && (
              <div className="flex items-center gap-1 ml-1 border-l border-slate-700 pl-1">
                {(['LIGHT', 'CLEAR', 'BOLD', 'DARK'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setWatermarkVisual(lvl)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                      watermarkVisual === lvl ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* A4 Canvas Container */}
      <div className="flex justify-center p-2 md:p-6 bg-slate-200/80 rounded-2xl overflow-x-auto">
        <div 
          ref={printAreaRef}
          id="suhel-letterhead-a4-document"
          className="bg-white shadow-2xl relative select-text transition-all"
          style={{
            width: '794px',
            minHeight: '1123px',
            maxHeight: '1123px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Background Letterhead Graphic - Prints crystal clear with its authentic watermark */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden print:opacity-100">
            <img
              src={letterheadImageUrl}
              alt="Official Letterhead Pad"
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

          {/* Optional Text Watermark Overlay (Only if explicitly enabled by user) */}
          {currentLetter.showWatermark === true && (
            <div className="absolute inset-0 pointer-events-none z-5 flex items-center justify-center overflow-hidden">
              <div 
                className="select-none text-center font-black tracking-widest uppercase pointer-events-none watermark-print-visible transition-all"
                style={{
                  transform: 'rotate(-30deg)',
                  fontSize: (currentLetter.companyName || 'SUHEL ENGINEERING').length > 18 ? '4.2rem' : '5.5rem',
                  lineHeight: 1.05,
                  maxWidth: '88%',
                  letterSpacing: '0.14em',
                  color: watermarkVisual === 'DARK'
                    ? 'rgba(15, 23, 42, 0.85)'
                    : watermarkVisual === 'BOLD'
                    ? 'rgba(15, 23, 42, 0.65)'
                    : watermarkVisual === 'LIGHT'
                    ? 'rgba(15, 23, 42, 0.22)'
                    : 'rgba(15, 23, 42, 0.45)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                {currentLetter.companyName || 'SUHEL ENGINEERING'}
              </div>
            </div>
          )}

          {/* Printable Letter Content - Stretches to FULL available width & height */}
          <div 
            className="relative z-10 font-sans text-slate-950 flex flex-col justify-between"
            style={{
              paddingTop: `${headerOffset}px`,
              paddingBottom: `${footerOffset}px`,
              paddingLeft: '38px',
              paddingRight: '38px',
              minHeight: '1123px',
              maxHeight: '1123px',
              boxSizing: 'border-box',
              fontSize: `${fontSize}px`,
              lineHeight: 1.45,
            }}
          >
            {/* Top Meta Section: Ref No & Date */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b-2 border-slate-900/80 pb-1.5">
                <div className="font-bold text-slate-800">
                  <span className="text-slate-500 uppercase text-[10px] mr-1.5 tracking-wider">Ref No:</span>
                  <span className="font-mono text-slate-950 font-black px-2 py-0.5 bg-white/90 border border-slate-300 rounded shadow-2xs">
                    {currentLetter.refNo}
                  </span>
                </div>
                <div className="font-bold text-slate-800 text-right">
                  <span className="text-slate-500 uppercase text-[10px] mr-1.5 tracking-wider">Date:</span>
                  <span className="text-slate-950 font-black">
                    {new Date(currentLetter.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Addressee / Recipient Details */}
              <div className={`p-2.5 rounded-lg border border-slate-300/80 transition-colors ${
                cardOpacity === 'clear' || cardOpacity === 'transparent' ? 'bg-transparent' : cardOpacity === 'tinted' ? 'bg-white/80 backdrop-blur-2xs' : 'bg-white'
              }`}>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">To,</div>
                <div className="font-black text-slate-950 text-sm tracking-tight">{currentLetter.recipientName}</div>
                {currentLetter.recipientDesignation && (
                  <div className="text-slate-700 font-semibold">{currentLetter.recipientDesignation}</div>
                )}
                <div className="font-bold text-slate-900">{currentLetter.recipientCompany}</div>
                <div className="text-slate-700 text-[11px] leading-tight">{currentLetter.recipientAddress}</div>
              </div>

              {/* Subject Line */}
              <div className="pt-0.5">
                <div className="bg-slate-900 text-white px-3 py-1.5 rounded-md font-black text-xs uppercase tracking-wide flex items-start gap-1.5 shadow-2xs">
                  <span className="text-amber-400 shrink-0">SUBJECT:</span>
                  <span className="tracking-tight">{currentLetter.subject}</span>
                </div>
              </div>

              {/* Salutation & Opening Paragraph */}
              <div className="space-y-1.5 pt-1">
                <div className="font-black text-slate-900 text-xs">{currentLetter.salutation}</div>
                <p className="text-slate-900 leading-relaxed text-justify font-medium">
                  {currentLetter.openingParagraph}
                </p>
              </div>

              {/* Body Paragraphs */}
              {currentLetter.bodyParagraphs.map((para, idx) => (
                <p key={idx} className="text-slate-900 leading-relaxed text-justify font-medium">
                  {para}
                </p>
              ))}

              {/* Structured Scope / Quotation Table */}
              {currentLetter.tableData && currentLetter.tableData.rows.length > 0 && (
                <div className={`border-2 border-slate-900 rounded-lg overflow-hidden my-2 shadow-2xs transition-colors ${
                  cardOpacity === 'clear' || cardOpacity === 'transparent' ? 'bg-transparent' : cardOpacity === 'tinted' ? 'bg-white/85 backdrop-blur-2xs' : 'bg-white'
                }`}>
                  <table className="w-full text-left border-collapse table-fixed" style={{ fontSize: `${fontSize - 1}px` }}>
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold">
                        {currentLetter.tableData.columns.map((col, idx) => {
                          const title = typeof col === 'string' ? col : col.title;
                          const align = typeof col === 'string' ? 'left' : (col.align || 'left');
                          const width = typeof col === 'string' ? undefined : col.width;
                          return (
                            <th 
                              key={idx} 
                              className={`py-1.5 px-2.5 font-bold ${
                                align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
                              }`}
                              style={{ width }}
                            >
                              {title}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 font-medium">
                      {currentLetter.tableData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className={cardOpacity === 'clear' || cardOpacity === 'transparent' ? 'hover:bg-slate-100/30' : 'hover:bg-slate-50/50'}>
                          {row.map((cell, cIdx) => {
                            const colConfig = currentLetter.tableData?.columns[cIdx];
                            const align = typeof colConfig === 'object' ? colConfig.align : undefined;
                            return (
                              <td 
                                key={cIdx} 
                                className={`py-1.5 px-2.5 border-r border-slate-200 last:border-r-0 overflow-hidden break-words ${
                                  align === 'center' ? 'text-center' : align === 'right' ? 'text-right font-mono' : 'text-left'
                                }`}
                              >
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Closing Commercial Terms */}
              {currentLetter.closingParagraph && (
                <p className={`text-slate-900 leading-relaxed text-justify font-medium text-[11px] p-2 rounded border border-slate-300 transition-colors ${
                  cardOpacity === 'clear' || cardOpacity === 'transparent' ? 'bg-transparent' : 'bg-slate-50/70'
                }`}>
                  <strong>Note: </strong> {currentLetter.closingParagraph}
                </p>
              )}

              {/* Official Bank Details Block (Strictly No UPI, No QR) */}
              {showBankDetails && (
                <div className={`p-2 rounded border border-slate-300 text-slate-900 my-1.5 transition-colors ${
                  cardOpacity === 'clear' || cardOpacity === 'transparent'
                    ? 'bg-transparent' 
                    : cardOpacity === 'tinted' 
                    ? 'bg-white/85 backdrop-blur-2xs' 
                    : 'bg-white'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                    <span className="font-extrabold uppercase text-[9.5px] text-slate-950 tracking-wider">
                      Official Bank Account Details
                    </span>
                    <span className="text-[8px] font-semibold text-slate-500 font-mono">
                      Direct Remittance: RTGS / NEFT / IMPS
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[9px] leading-tight">
                    <div>
                      <span className="text-[7.5px] font-bold text-slate-500 uppercase block">Bank Name</span>
                      <span className="font-black text-slate-950 truncate block">{businessProfile.bankName || 'HDFC Bank Ltd.'}</span>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-bold text-slate-500 uppercase block">Account Number</span>
                      <span className="font-mono font-black text-slate-950 tracking-wider truncate block">{businessProfile.accountNumber || '50200084729103'}</span>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-bold text-slate-500 uppercase block">IFSC Code</span>
                      <span className="font-mono font-black text-slate-950 truncate block">{businessProfile.ifscCode || 'HDFC0001042'}</span>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-bold text-slate-500 uppercase block">Branch &amp; Beneficiary</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {businessProfile.branchName ? `${businessProfile.branchName} (${businessProfile.accountHolderName || businessProfile.tradeName || businessProfile.name})` : (businessProfile.accountHolderName || businessProfile.tradeName || businessProfile.name)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Signature & Signatory Block */}
            <div className="pt-3 flex items-end justify-between border-t border-slate-300/80">
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <div className="font-bold text-slate-800">Thanking you,</div>
                <div className="font-semibold text-slate-700">Yours faithfully,</div>
              </div>

              <div className="text-right space-y-1">
                <div className="text-xs font-black text-slate-950 uppercase">
                  For <strong>{currentLetter.companyName || 'Suhel Engineering'}</strong>
                </div>
                <div className="h-10 flex items-center justify-end">
                  <div className="text-[10px] text-slate-400 italic pr-2 font-serif">[ Authorized Stamp & Sign ]</div>
                </div>
                <div className="border-t-2 border-slate-900 pt-1 w-52 text-center ml-auto">
                  <div className="font-black text-slate-950 text-xs">{currentLetter.signatoryName}</div>
                  <div className="text-[10px] font-bold text-slate-600">{currentLetter.signatoryTitle}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
