import React from 'react';
import { ExpiryFilterOption } from '../../lib/domain/domainTypes';

type Props = {
  value: ExpiryFilterOption;
  onChange: (v: ExpiryFilterOption) => void;
};

export function ExpiryFilter({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ExpiryFilterOption)}
      className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200
                focus:outline-none focus:ring-2 focus:ring-zinc-600
                hover:border-zinc-500 transition"
    >
      <option value="all">All</option>
      <option value="le30">Expiring ≤ 30 days</option>
      <option value="le60">Expiring ≤ 60 days</option>
      <option value="expired">Expired</option>
    </select>
  );
}
