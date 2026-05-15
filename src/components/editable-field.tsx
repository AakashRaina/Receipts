import { useState } from 'react';
import { AlertTriangle, Check, Pencil, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type EditableFieldType = 'text' | 'number' | 'date';

const LOW_CONFIDENCE = 0.7;

export function EditableField({
  label,
  value,
  type = 'text',
  confidence,
  placeholder,
  onSave,
}: {
  label: string;
  value: string | number | null;
  type?: EditableFieldType;
  confidence?: number | null;
  placeholder?: string;
  onSave: (next: string | number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLow = confidence != null && confidence < LOW_CONFIDENCE;

  function start() {
    setError(null);
    setDraft(value == null ? '' : String(value));
    setEditing(true);
    // The Input below has `autoFocus`, which fires on this mount.
  }

  function cancel() {
    setError(null);
    setEditing(false);
    setDraft(value == null ? '' : String(value));
  }

  async function commit() {
    setError(null);
    let parsed: string | number | null;
    const trimmed = draft.trim();
    if (trimmed === '') {
      parsed = null;
    } else if (type === 'number') {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) {
        setError('Must be a number');
        return;
      }
      parsed = n;
    } else if (type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        setError('Use YYYY-MM-DD');
        return;
      }
      parsed = trimmed;
    } else {
      parsed = trimmed;
    }

    setSaving(true);
    try {
      await onSave(parsed);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{label}</span>
        {isLow && !editing && <AlertTriangle className="h-3 w-3 text-amber-500" />}
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
            inputMode={type === 'number' ? 'decimal' : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={saving}
            className="h-8"
          />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={commit} disabled={saving}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancel} disabled={saving}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          className={cn(
            'group flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm',
            'hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring',
            isLow && 'border-amber-400/70 bg-amber-50/50 dark:bg-amber-950/20',
          )}
        >
          <span className={cn(value == null || value === '' ? 'text-muted-foreground' : '')}>
            {value == null || value === '' ? '—' : String(value)}
          </span>
          <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </button>
      )}

      {isLow && !editing && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          AI wasn’t sure — please verify
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
