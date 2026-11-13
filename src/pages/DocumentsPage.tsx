import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Info,
  Loader2,
  Sparkles
} from 'lucide-react';
import { api } from '../lib/api';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import type { HealthDocument, MedicalValue } from '../types';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ value: number; unit: string; name: string }>({ value: 0, unit: '', name: '' });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showOnlyOutOfRange, setShowOnlyOutOfRange] = useState(true);

  const loadDocuments = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !expandedDocId) {
        setExpandedDocId(docs[0].id);
      }
    } catch (e: any) {
      console.error('Failed to load documents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds 10MB maximum size limit.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const newDoc = await api.uploadDocument(file);
      setDocuments(prev => [newDoc, ...prev]);
      setExpandedDocId(newDoc.id);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload and parse document.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSampleUpload = async () => {
    setUploading(true);
    setUploadError(null);
    try {
      const sampleText = `METROPOLITAN DIAGNOSTIC LABS
Patient Report - Fasting Lipid & Metabolic Profile
Date of Collection: ${new Date().toLocaleDateString()}

RESULTS:
Fasting Blood Glucose: 114 mg/dL (Reference: 70 - 99 mg/dL) [ABNORMAL HIGH]
HbA1c (Glycated Hemoglobin): 6.2 % (Reference: 4.0 - 5.6 %) [ELEVATED]
Total Cholesterol: 224 mg/dL (Reference: 125 - 200 mg/dL) [HIGH]
LDL Cholesterol: 142 mg/dL (Reference: < 100 mg/dL) [ABNORMAL HIGH]
HDL Cholesterol: 48 mg/dL (Reference: 40 - 60 mg/dL) [NORMAL]
Triglycerides: 170 mg/dL (Reference: < 150 mg/dL) [BORDERLINE]
Serum Creatinine: 0.95 mg/dL (Reference: 0.6 - 1.2 mg/dL) [NORMAL]
Blood Urea Nitrogen (Urea): 15 mg/dL (Reference: 7 - 20 mg/dL) [NORMAL]
Thyroid Stimulating Hormone (TSH): 2.1 mIU/L (Reference: 0.4 - 4.0 mIU/L) [NORMAL]
Vitamin D (25-OH): 22 ng/mL (Reference: 30 - 100 ng/mL) [DEFICIENT]`;

      const blob = new Blob([sampleText], { type: 'text/plain' });
      const file = new File([blob], 'Comprehensive_Metabolic_Report.pdf', { type: 'application/pdf' });
      const newDoc = await api.uploadDocument(file);
      setDocuments(prev => [newDoc, ...prev]);
      setExpandedDocId(newDoc.id);
    } catch (e: any) {
      setUploadError(e.message || 'Sample upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document and its RAG vector chunks?')) return;
    try {
      await api.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (expandedDocId === docId) setExpandedDocId(null);
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
  };

  const handleVerifyDocument = async (docId: string) => {
    try {
      const updated = await api.verifyDocument(docId);
      setDocuments(prev => prev.map(d => d.id === docId ? updated : d));
    } catch (e: any) {
      alert('Verification failed: ' + e.message);
    }
  };

  const startEditingValue = (val: MedicalValue) => {
    setEditingValueId(val.id);
    setEditForm({ value: val.value, unit: val.unit, name: val.name });
  };

  const saveEditingValue = async (docId: string, valId: string) => {
    try {
      const updatedVal = await api.updateExtractedValue(docId, valId, {
        value: editForm.value,
        unit: editForm.unit,
        name: editForm.name,
        verified: true
      });

      setDocuments(prev => prev.map(doc => {
        if (doc.id === docId) {
          return {
            ...doc,
            extractedValues: doc.extractedValues.map(v => v.id === valId ? updatedVal : v)
          };
        }
        return doc;
      }));
      setEditingValueId(null);
    } catch (e: any) {
      alert('Update failed: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <DisclaimerBanner />

      {/* Upload Header Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#0FAEAE]" />
            <span>Upload Medical Lab Reports</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Upload blood work, metabolic panels, or pathology PDFs. HealthMate extracts clinical biomarkers, checks standard reference ranges, and indexes semantic chunks for grounded RAG inquiry.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSampleUpload}
            disabled={uploading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0FAEAE]" />
            <span>Load Sample Report</span>
          </button>

          <label className="px-4 py-2 rounded-xl bg-[#0FAEAE] hover:bg-[#21C4B8] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Report...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload PDF / Image</span>
              </>
            )}
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Stored Health Documents ({documents.length})
          </h4>
          <span className="text-xs text-slate-400">
            {documents.filter(d => d.verified).length} Human-Verified
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">No Documents Uploaded</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload a blood test report or click "Load Sample Report" above to test the biomarker extraction and RAG indexing.
              </p>
            </div>
            <button
              onClick={handleSampleUpload}
              className="px-4 py-2 bg-teal-50 border border-teal-200 text-[#07566A] rounded-xl text-xs font-bold hover:bg-teal-100 transition-colors cursor-pointer"
            >
              Load Clinical Sample
            </button>
          </div>
        ) : (
          documents.map(doc => {
            const isExpanded = expandedDocId === doc.id;
            const abnormalCount = doc.extractedValues.filter(v => v.status !== 'normal').length;

            return (
              <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-all">
                {/* Header row */}
                <div
                  onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-teal-50 text-[#0FAEAE] rounded-xl">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{doc.title}</h4>
                        {doc.verified ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>User Verified</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            <span>Unverified</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                        <span>Uploaded {new Date(doc.uploadDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{doc.chunksCount} RAG Chunks Indexed</span>
                        <span>•</span>
                        <span className={abnormalCount > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
                          {doc.extractedValues.length} Biomarkers ({abnormalCount} Outside Range)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {!doc.verified && (
                      <button
                        onClick={() => handleVerifyDocument(doc.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Mark entire report and extracted values as human-verified"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Verify All</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete document and chunks"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Extracted Values Review and Correction */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/30">
                    {/* Summary */}
                    {doc.summary && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed">
                        <span className="font-semibold text-slate-900">Extracted Summary: </span>
                        {doc.summary}
                      </div>
                    )}

                    {/* Biomarkers Table */}
                    <div>
                      {(() => {
                        const outOfRangeValues = doc.extractedValues.filter(
                          v => v.status === 'abnormal_low' || v.status === 'abnormal_high'
                        );
                        const displayedValues = showOnlyOutOfRange ? outOfRangeValues : doc.extractedValues;

                        return (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                              <div>
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                  <span>{showOnlyOutOfRange ? 'Out-of-Range Biomarkers (Low & High Only)' : 'All Extracted Biomarkers'}</span>
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {outOfRangeValues.length} abnormal reading(s) detected • Click edit to correct values
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => setShowOnlyOutOfRange(true)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                    showOnlyOutOfRange
                                      ? 'bg-amber-100/70 border-amber-300 text-amber-900 shadow-xs'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  Low & High Only ({outOfRangeValues.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowOnlyOutOfRange(false)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                                    !showOnlyOutOfRange
                                      ? 'bg-teal-50 border-teal-300 text-teal-800 shadow-xs font-bold'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  Include Normal ({doc.extractedValues.length})
                                </button>
                              </div>
                            </div>

                            {displayedValues.length === 0 ? (
                              <div className="p-6 bg-white rounded-xl border border-slate-200 text-center space-y-1">
                                <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" />
                                <p className="text-xs font-bold text-slate-800">All Biomarkers Within Normal Range</p>
                                <p className="text-[11px] text-slate-500">No abnormal low or high values detected in this document.</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                                    <tr>
                                      <th className="py-2.5 px-4">Biomarker</th>
                                      <th className="py-2.5 px-4">Value</th>
                                      <th className="py-2.5 px-4">Reference Range</th>
                                      <th className="py-2.5 px-4">Status</th>
                                      <th className="py-2.5 px-4">Verified</th>
                                      <th className="py-2.5 px-4 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {displayedValues.map(val => {
                                      const isEditing = editingValueId === val.id;
                                      return (
                                        <tr key={val.id} className="hover:bg-slate-50/50">
                                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                                            {isEditing ? (
                                              <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                                className="border border-slate-200 rounded px-2 py-0.5 text-xs w-full"
                                              />
                                            ) : (
                                              val.name
                                            )}
                                          </td>
                                          <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                                            {isEditing ? (
                                              <div className="flex items-center gap-1">
                                                <input
                                                  type="number"
                                                  step="0.1"
                                                  value={editForm.value}
                                                  onChange={e => setEditForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
                                                  className="border border-slate-200 rounded px-2 py-0.5 text-xs w-20"
                                                />
                                                <input
                                                  type="text"
                                                  value={editForm.unit}
                                                  onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}
                                                  className="border border-slate-200 rounded px-1 py-0.5 text-xs w-16"
                                                />
                                              </div>
                                            ) : (
                                              `${val.value} ${val.unit}`
                                            )}
                                          </td>
                                          <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                                            {val.referenceRange || '--'}
                                          </td>
                                          <td className="py-2.5 px-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                              val.status === 'abnormal_high'
                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                : val.status === 'abnormal_low'
                                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            }`}>
                                              {val.status === 'abnormal_high' ? 'HIGH / ELEVATED' : val.status === 'abnormal_low' ? 'LOW' : 'NORMAL'}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-4">
                                            {val.verified ? (
                                              <span className="text-emerald-600 font-medium flex items-center gap-1">
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Verified</span>
                                              </span>
                                            ) : (
                                              <span className="text-slate-400">Unverified</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-4 text-right">
                                            {isEditing ? (
                                              <button
                                                onClick={() => saveEditingValue(doc.id, val.id)}
                                                className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                                              >
                                                Save
                                              </button>
                                            ) : (
                                              <button
                                                onClick={() => startEditingValue(val)}
                                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                                title="Correct value"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
