import React, { useMemo, useRef, useState } from 'react';
import { Download, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { TAG_COLORS } from '../types';
import {
  createEmptyTemplateField,
  parseTemplateFieldsJson,
  serializeTemplateFields,
  TagTemplateField,
} from '../utils/tagTemplates';

interface TemplateSettingsProps {
  templates: TagTemplateField[];
  onChange: (templates: TagTemplateField[]) => void;
}

const TemplateSettings: React.FC<TemplateSettingsProps> = ({ templates, onChange }) => {
  const [selectedId, setSelectedId] = useState(templates[0]?.id || '');
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const selectedTemplate = useMemo(
    () => templates.find(template => template.id === selectedId) || templates[0],
    [selectedId, templates]
  );

  const updateTemplate = (patch: Partial<TagTemplateField>) => {
    if (!selectedTemplate) return;
    onChange(templates.map(template =>
      template.id === selectedTemplate.id ? { ...template, ...patch } : template
    ));
  };

  const addTemplate = () => {
    const next = createEmptyTemplateField();
    onChange([...templates, next]);
    setSelectedId(next.id);
  };

  const deleteTemplate = () => {
    if (!selectedTemplate) return;
    const next = templates.filter(template => template.id !== selectedTemplate.id);
    onChange(next);
    setSelectedId(next[0]?.id || '');
  };

  const clearTemplates = () => {
    onChange([]);
    setSelectedId('');
    setImportError(null);
  };

  const exportTemplates = () => {
    const blob = new Blob([serializeTemplateFields(templates)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'smart-pdf-tagger-templates.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTemplates = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const nextTemplates = parseTemplateFieldsJson(await file.text());
      onChange(nextTemplates);
      setSelectedId(nextTemplates[0]?.id || '');
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not import template file.');
    }
  };

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-high p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-on-surface text-sm">Template Fields</h4>
          <p className="text-xs text-on-surface-variant mt-1">Fields appear in the tag editor template dropdown.</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={exportTemplates} className="p-2 rounded-full hover:bg-surface-container-highest text-on-surface-variant" title="Export templates">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => importInputRef.current?.click()} className="p-2 rounded-full hover:bg-surface-container-highest text-on-surface-variant" title="Import templates">
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            aria-label="Import templates JSON"
            className="hidden"
            onChange={importTemplates}
          />
          <button onClick={addTemplate} className="p-2 rounded-full hover:bg-surface-container-highest text-on-surface-variant" title="Add field">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={clearTemplates} className="p-2 rounded-full hover:bg-surface-container-highest text-on-surface-variant" title="Clear templates">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {importError && (
        <div className="rounded-lg border border-error/40 bg-error-container/20 px-3 py-2 text-xs text-error">
          {importError}
        </div>
      )}

      <select
        aria-label="Template field"
        value={selectedTemplate?.id || ''}
        onChange={e => setSelectedId(e.target.value)}
        className="w-full bg-surface-container-highest border border-outline-variant text-on-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        disabled={templates.length === 0}
      >
        {templates.length === 0 && <option value="">No template fields</option>}
        {templates.map(template => (
          <option key={template.id} value={template.id}>
            {template.templateName} / {template.label}
          </option>
        ))}
      </select>

      {templates.length === 0 && (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface/40 px-4 py-5 text-sm text-on-surface-variant">
          No template fields are included by default. Add fields here or import a template JSON file when a workflow needs them.
        </div>
      )}

      {selectedTemplate && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              aria-label="Template schema"
              value={selectedTemplate.templateName}
              onChange={e => updateTemplate({ templateName: e.target.value })}
              placeholder="Schema"
              className="bg-surface-container-highest border border-outline-variant text-on-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              aria-label="Template label"
              value={selectedTemplate.label}
              onChange={e => updateTemplate({ label: e.target.value })}
              placeholder="Label"
              className="bg-surface-container-highest border border-outline-variant text-on-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <textarea
            aria-label="Template description"
            value={selectedTemplate.description}
            onChange={e => updateTemplate({ description: e.target.value })}
            placeholder="Description"
            className="w-full bg-surface-container-highest border border-outline-variant text-on-surface p-3 rounded-xl text-sm min-h-[70px] resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <input
            aria-label="Template tags"
            value={selectedTemplate.tags.join(', ')}
            onChange={e => updateTemplate({ tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })}
            placeholder="Tags, comma separated"
            className="w-full bg-surface-container-highest border border-outline-variant text-on-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => updateTemplate({ color })}
                  className={`w-6 h-6 rounded-full border ${selectedTemplate.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-on-surface-variant whitespace-nowrap">
              <input
                aria-label="Template repeatable"
                type="checkbox"
                checked={!!selectedTemplate.repeatable}
                onChange={e => updateTemplate({ repeatable: e.target.checked })}
              />
              Repeatable
            </label>

            <button onClick={deleteTemplate} className="p-2 rounded-full hover:bg-error/10 text-error" title="Delete field">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSettings;
