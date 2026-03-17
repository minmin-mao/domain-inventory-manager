"use client";

import CreatableSelect from "react-select/creatable";
import type {
  InputActionMeta,
  SelectInstance,
  StylesConfig,
} from "react-select";
import { forwardRef, useId, useState } from "react";

type Option = {
  label: string;
  value: string;
};

type Props = {
  value: string;
  setValue?: (value: string) => void;
  options: string[];
  setOptions?: React.Dispatch<React.SetStateAction<string[]>>;
  placeholder?: string;
  isClearable?: boolean;
  onChange?: (value: string | null) => void;
};

const customStyles: StylesConfig<Option, false> = {
  control: (base) => ({
    ...base,
    backgroundColor: "#18181b",
    borderColor: "#3f3f46",
    color: "#e4e4e7",
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#18181b",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#27272a" : "#18181b",
    color: "#e4e4e7",
    cursor: "pointer",
  }),
  singleValue: (base) => ({
    ...base,
    color: "#e4e4e7",
  }),
  input: (base) => ({
    ...base,
    color: "#e4e4e7",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "#9ca3af",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
};

const SmartDropdown = forwardRef<SelectInstance<Option, false>, Props>(
  (
    { value, setValue, options, setOptions, placeholder, isClearable, onChange },
    ref
  ) => {
    const [inputValue, setInputValue] = useState("");
    const instanceId = useId();

    const handleChange = (option: Option | null) => {
      if (!option) {
        setValue?.("");
        onChange?.(null);
        return;
      }

      setValue?.(option.value);
      onChange?.(option.value);

      setOptions?.((prev) =>
        prev.includes(option.value) ? prev : [...prev, option.value]
      );
    };

    const handleInputChange = (nextValue: string, meta: InputActionMeta) => {
      if (meta.action === "input-change") {
        setInputValue(nextValue);
      }
    };

    return (
      <CreatableSelect
        ref={ref}
        instanceId={instanceId}
        styles={customStyles}
        options={options.map((option) => ({ label: option, value: option }))}
        onChange={handleChange}
        isClearable={isClearable}
        onInputChange={handleInputChange}
        onBlur={() => {
          const trimmed = inputValue.trim();
          if (!trimmed) return;
          handleChange({ label: trimmed, value: trimmed });
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
