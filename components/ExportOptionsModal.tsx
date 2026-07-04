import React, { useState } from 'react';
import { FileDown, Table, X } from 'lucide-react';
import {
  CSV_FIELD_LABELS,
  CsvField,
  DEFAULT_CSV_FIELDS,
  DEFAULT_PDF_EXPORT_OPTIONS,
  PdfExportOptions,
} from '../utils/exportOptions';

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPdf: (options: PdfExportOptions) => void;
  onExportCsv: (fields: CsvField[]) => void;
}

const csvFields = Object.keys(CSV_FIELD_LABELS) as CsvField[];

const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({
  isOpen,
  onClose,
  onExportPdf,
  onExportCsv,
}) => {
  const [pdfOptions, setPdfOptions] = useState<PdfExportOptions>(DEFAULT_PDF_EXPORT_OPTIONS);
  const [selectedCsvFields, setSelectedCsvFields] = useState<CsvField[]>(DEFAULT_CSV_FIELDS);

  if (!isOpen) return null;

  const toggleCsvField = (field: CsvField) => {
    setSelectedCsvFields(prev =>
      prev.includes(field) ? prev.filter(item => item !== field) : [...prev, field]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface-container border border-outline-variant rounded-2xl shadow-xl w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-xl text-on-surface">Export Options</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-highest text-on-surface-variant" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="rounded-xl border border-outline-variant bg-surface-container-high p-4 space-y-4">
            <div className="flex items-center gap-2 font-bold text-on-surface">
              <FileDown className="w-4 h-4 text-primary" />
              PDF
            </div>

            {([
              ['includeLabels', 'Include labels'],
              ['includeComments', 'Include comments'],
              ['includeColors', 'Include colors'],
            ] as Array<[keyof PdfExportOptions, string]>).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 text-sm text-on-surface-variant">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={pdfOptions[key]}
                  onChange={e => setPdfOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                />
              </label>
            ))}

            <button
              onClick={() => onExportPdf(pdfOptions)}
              className="w-full mt-2 bg-primary text-on-primary rounded-full py-2.5 text-sm font-bold hover:bg-primary/90"
            >
              Export PDF
            </button>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-high p-4 space-y-4">
            <div className="flex items-center gap-2 font-bold text-on-surface">
              <Table className="w-4 h-4 text-primary" />
              CSV Fields
            </div>

            <div className="grid grid-cols-2 gap-2">
              {csvFields.map(field => (
                <label key={field} className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={selectedCsvFields.includes(field)}
                    onChange={() => toggleCsvField(field)}
                  />
                  <span>{CSV_FIELD_LABELS[field]}</span>
                </label>
              ))}
            </div>

            <button
              onClick={() => onExportCsv(selectedCsvFields)}
              className="w-full mt-2 bg-primary text-on-primary rounded-full py-2.5 text-sm font-bold hover:bg-primary/90"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportOptionsModal;
