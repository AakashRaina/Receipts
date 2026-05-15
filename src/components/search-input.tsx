import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const MIN_SEARCH_CHARS = 4;

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search vendor, items, anything on the receipt…',
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value ?? '');
  const debounceRef = useRef<number | null>(null);

  // External -> local sync (e.g., browser back button).
  useEffect(() => {
    setLocal((current) => (current === (value ?? '') ? current : value ?? ''));
  }, [value]);

  function handleChange(next: string) {
    setLocal(next);
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const trimmed = next.trim();
      if (trimmed === '') onChange(undefined);
      else if (trimmed.length >= MIN_SEARCH_CHARS) onChange(trimmed);
    }, 250);
  }

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-8"
        />
      </div>
      {local.trim().length > 0 && local.trim().length < MIN_SEARCH_CHARS && (
        <p className="mt-1 text-xs text-muted-foreground">
          Type at least {MIN_SEARCH_CHARS} characters to search.
        </p>
      )}
    </div>
  );
}
