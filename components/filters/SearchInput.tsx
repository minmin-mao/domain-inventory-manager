import React, { useState, useEffect } from 'react';
import { useDebounced } from './useDebounced';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export function SearchInput({ value, onChange, placeholder = 'Search domains...' }: Props) {
  const [local, setLocal] = useState(value);
  const debounced = useDebounced(local, 300);

  useEffect(() => {
    onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => setLocal(value), [value]);

  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded border px-3 py-2 text-sm placeholder:text-xs placeholder:text-zinc-500 focus:outline-none focus:ring md:w-72"
      aria-label="Search domains"
    />
  );
}
