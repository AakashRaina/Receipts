import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const ACCEPTED = ['image/png', 'image/jpeg'];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export function UploadDropzone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick() {
    if (!disabled) inputRef.current?.click();
  }

  function validateAndSubmit(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError('Only PNG or JPG images are supported.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 8 MB or smaller.');
      return;
    }
    onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndSubmit(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSubmit(file);
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={pick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && pick()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          'flex flex-col items-center justify-center gap-2 min-h-[200px]',
          dragging ? 'border-primary bg-accent' : 'border-border hover:bg-accent/50',
          disabled && 'opacity-50 pointer-events-none',
        )}
      >
        <p className="text-sm font-medium">Drop a receipt here, or click to choose</p>
        <p className="text-xs text-muted-foreground">PNG or JPG, up to 8 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          capture="environment"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
