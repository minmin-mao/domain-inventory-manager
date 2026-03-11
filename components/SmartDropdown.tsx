"use client";

import CreatableSelect from "react-select/creatable";
import dynamic from "next/dynamic";
import type { CreatableProps } from "react-select/creatable";
import type { GroupBase, SelectInstance } from "react-select";
import { StylesConfig } from "react-select";
import { useState, forwardRef, useImperativeHandle, useRef } from "react";

type Option = {
  label: string;
  value: string;
};

type Props = {
  value: string;
  setValue?: (value: string) => void;
  options: string[];
  setOptions?: (options: string[]) => void;
  placeholder?: string;
  isClearable?: boolean;
  onChange?: (v: string | null) => void
};

const SmartDropdown = forwardRef<SelectInstance<Option, false>, Props>(
  ({ value, setValue, options, setOptions, placeholder, isClearable, onChange }, ref) => {

    const [inputValue, setInputValue] = useState("");

    const selectRef = useRef<SelectInstance<Option, false> | null>(null);

    const selectOptions: Option[] = options.map((o) => ({
      label: o,
      value: o
    }));

    const customStyles: StylesConfig<Option, false> = {
      control: (base) => ({
        ...base,
        backgroundColor: "#18181b",
        borderColor: "#3f3f46",
        color: "#e4e4e7"
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: "#18181b"
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isFocused ? "#27272a" : "#18181b",
        color: "#e4e4e7",
        cursor: "pointer"
      }),
      singleValue: (base) => ({
        ...base,
        color: "#e4e4e7"
      }),
      input: (base) => ({
        ...base,
        color: "#e4e4e7"
      }),
      dropdownIndicator: (base) => ({
        ...base,
        color: "#9ca3af"
      }),
      indicatorSeparator: () => ({
        display: "none"
      })
    };

    const handleChange = (option: Option | null) => {

    if (!option) {
      onChange?.(null);
      return;
    }

    setValue?.(option.value);
    onChange?.(option.value);

    if (setOptions && !options.includes(option.value)) {
      setOptions([...options, option.value]);
    }
  };

    return (
      <CreatableSelect
        ref={ref}
        styles={customStyles}
        options={options.map(o => ({ label: o, value: o }))}
        onChange={handleChange}
        isClearable={isClearable}
        onInputChange={(v) => setInputValue(v)}
        onBlur={() => {
         if (!inputValue) return;
         handleChange({ label: inputValue, value: inputValue});
         setInputValue("");
        }}
        placeholder={placeholder}
        value={value ? { label: value, value } : null}
      />
    );
  }
);

SmartDropdown.displayName = "SmartDropdown";

export default SmartDropdown;