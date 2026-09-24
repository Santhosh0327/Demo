import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';
import { useRouletteStore } from '../../store/useRouletteStore';
import { SpinChip } from '../common/SpinChip';
import { Upload, FileText, CheckCircle, Loader2, Plus, Trash2 } from 'lucide-react';

export const OcrUploadEntry: React.FC = () => {
  const { importSpinsBatch, showToast } = useRouletteStore();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [detectedNumbers, setDetectedNumbers] = useState<string[]>([]);
  const [newNumberInput, setNewNumberInput] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      processImage(file);
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setProgressText('Initializing OCR Engine...');
    try {
      const worker = await createWorker('eng');
      setProgressText('Analyzing screenshot text...');
      const ret = await worker.recognize(file);
      await worker.terminate();

      const text = ret.data.text;
      // Extract numbers matching 00, 0, or 1-36
      const tokens = text.match(/\b(00|0|[1-9]|[12][0-9]|3[0-6])\b/g) || [];
      
      setDetectedNumbers(tokens);
      setIsProcessing(false);
      showToast(`Detected ${tokens.length} roulette numbers`, 'success');
    } catch (err) {
      console.error('OCR processing error:', err);
      setIsProcessing(false);
      showToast('OCR failed to extract text from image', 'error');
    }
  };

  const handleEditNumber = (index: number, val: string) => {
    const copy = [...detectedNumbers];
    copy[index] = val;
    setDetectedNumbers(copy);
  };

  const handleRemoveNumber = (index: number) => {
    setDetectedNumbers(detectedNumbers.filter((_, i) => i !== index));
  };

  const handleAddNumber = () => {
    if (!newNumberInput.trim()) return;
    setDetectedNumbers([...detectedNumbers, newNumberInput.trim()]);
    setNewNumberInput('');
  };

  const handleConfirmImport = () => {
    if (detectedNumbers.length === 0) return;
    importSpinsBatch(detectedNumbers, 'ocr_upload');
    setDetectedNumbers([]);
    setImagePreview(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#D4AF37]" /> Screenshot Upload with OCR
        </h3>
        <p className="text-xs text-slate-400">
          Upload a screenshot of live roulette history. Tesseract OCR will automatically extract and parse the numbers.
        </p>

        {/* Upload Box */}
        <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#232D3F] bg-[#080B12]/50 p-8 hover:border-[#D4AF37]/50 transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Upload className="h-10 w-10 text-[#D4AF37] mb-2" />
          <span className="text-sm font-semibold text-slate-200">
            Click or drag & drop screenshot here
          </span>
          <span className="text-xs text-slate-400 mt-1">Supports PNG, JPG, WEBP screenshots</span>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs font-semibold text-amber-300">
            <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" />
            <span>{progressText}</span>
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && !isProcessing && (
          <div className="rounded-xl border border-[#232D3F] overflow-hidden bg-[#080B12] p-2 max-h-48 flex justify-center">
            <img src={imagePreview} alt="Screenshot Preview" className="max-h-44 object-contain rounded-lg" />
          </div>
        )}
      </div>

      {/* Confirmation & Editable Grid */}
      {detectedNumbers.length > 0 && (
        <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
            <h4 className="text-sm font-bold text-slate-100">
              Extracted Numbers Review ({detectedNumbers.length})
            </h4>
            <span className="text-xs text-slate-400">Verify & edit before importing</span>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {detectedNumbers.map((num, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-[#080B12] p-1.5 rounded-xl border border-[#232D3F]">
                <SpinChip number={num} size="sm" />
                <input
                  type="text"
                  value={num}
                  onChange={(e) => handleEditNumber(idx, e.target.value)}
                  className="w-10 rounded bg-[#161D29] border border-slate-700 px-1 py-0.5 text-xs text-slate-100 text-center font-bold"
                />
                <button
                  onClick={() => handleRemoveNumber(idx)}
                  className="text-slate-500 hover:text-rose-400 p-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* Add missing number manual input */}
            <div className="flex items-center gap-1.5 bg-[#080B12] p-1.5 rounded-xl border border-[#232D3F]">
              <input
                type="text"
                placeholder="Add #"
                value={newNumberInput}
                onChange={(e) => setNewNumberInput(e.target.value)}
                className="w-14 rounded bg-[#161D29] border border-slate-700 px-1.5 py-0.5 text-xs text-slate-100 text-center font-bold"
              />
              <button
                onClick={handleAddNumber}
                className="p-1 rounded bg-[#D4AF37] text-slate-950 font-bold hover:bg-amber-400"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleConfirmImport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg transition-all"
            >
              <CheckCircle className="h-4 w-4" /> Confirm & Import {detectedNumbers.length} Spins
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
