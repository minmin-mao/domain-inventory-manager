import React from 'react';
import SmartDropdown from '../SmartDropdown'; // adjust path

type Props = {
  value: string | null
  onChange: (v: string | null) => void
  options: string[]
  placeholder?: string
  isClearable?: boolean
  allowAll?: boolean
}

export function DropdownFilter({
  value,
  onChange,
  options,
  placeholder = "Choose",
  isClearable = true,
  allowAll = true,
}: Props) {

  const opts = allowAll ? ["All", ...options] : options

  return (
    <div className="min-w-[160px]">
      <SmartDropdown
        value={value ?? "All"}
        options={opts}
        placeholder={placeholder}
        isClearable={isClearable}
        onChange={(v) => {
          if (!v || v === "All") {
            onChange(null)
          } else {
            onChange(v)
          }
        }}
      />
    </div>
  )
}