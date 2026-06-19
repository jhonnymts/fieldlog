import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * TagInput
 * Props:
 *   tags       — string[] current tags
 *   onChange   — (newTags: string[]) => void
 *   placeholder — input placeholder text
 *   readOnly   — hide input, show chips only
 *   size       — 'sm' | 'xs'  (default 'sm')
 */
export default function TagInput({
  tags = [],
  onChange,
  placeholder = 'Add tag…',
  readOnly = false,
  size = 'sm',
}) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setInputValue('');
  };

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const chipBase =
    size === 'xs'
      ? 'flex items-center gap-0.5 px-1.5 py-0 text-[10px] rounded-full border font-medium'
      : 'flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border font-medium';

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`${chipBase} bg-primary/10 text-primary border-primary/30`}
        >
          #{tag}
          {!readOnly && (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-primary/60 hover:text-primary ml-0.5 leading-none"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </span>
      ))}

      {!readOnly && (
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
          placeholder={tags.length === 0 ? placeholder : '+tag'}
          className="bg-transparent border-0 border-b border-dashed border-border rounded-none h-6 px-1 text-xs w-24 min-w-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/50"
        />
      )}
    </div>
  );
}
