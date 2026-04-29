"use client";

import {
  type HTMLAttributes,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { normalizeAlias } from "@/lib/data/normalization";
import { getCssDurationMs } from "@/lib/ui/transition-duration";

interface SearchableComboboxProps {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  name?: string;
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  onChange: (value: string) => void;
  onInputChange?: (value: string) => void;
  onSelectOption?: (value: string) => void;
  onBlur?: (value: string) => void;
  renderOption?: (option: string) => React.ReactNode;
  endAdornment?: React.ReactNode;
  hideLabel?: boolean;
  compact?: boolean;
  showAllOptions?: boolean;
}

function rankOptions(
  options: string[],
  query: string,
  showAllOptions: boolean,
) {
  if (showAllOptions) {
    return options;
  }

  const normalizedQuery = normalizeAlias(query);

  if (!normalizedQuery) {
    return options.slice(0, 10);
  }

  return [...options]
    .sort((left, right) => {
      const normalizedLeft = normalizeAlias(left);
      const normalizedRight = normalizeAlias(right);
      const leftStarts = normalizedLeft.startsWith(normalizedQuery) ? 0 : 1;
      const rightStarts = normalizedRight.startsWith(normalizedQuery) ? 0 : 1;

      if (leftStarts !== rightStarts) {
        return leftStarts - rightStarts;
      }

      const leftIncludes = normalizedLeft.includes(normalizedQuery) ? 0 : 1;
      const rightIncludes = normalizedRight.includes(normalizedQuery) ? 0 : 1;

      if (leftIncludes !== rightIncludes) {
        return leftIncludes - rightIncludes;
      }

      return left.localeCompare(right);
    })
    .filter((option) => normalizeAlias(option).includes(normalizedQuery))
    .slice(0, 10);
}

function clampHighlightedIndex(options: string[], highlightedIndex: number) {
  if (options.length === 0) {
    return 0;
  }

  return Math.min(highlightedIndex, options.length - 1);
}

function findExactMatchIndex(options: string[], query: string) {
  return options.findIndex(
    (option) => normalizeAlias(option) === normalizeAlias(query),
  );
}

export function SearchableCombobox({
  label,
  value,
  options,
  placeholder,
  name,
  autoComplete = "off",
  inputMode,
  onChange,
  onInputChange,
  onSelectOption,
  onBlur,
  renderOption,
  endAdornment,
  hideLabel = false,
  compact = false,
  showAllOptions = false,
}: SearchableComboboxProps) {
  const { dictionary } = useI18n();
  const listboxId = useId();
  const optionIdBase = useId();
  const [open, setOpen] = useState(false);
  const [dropdownClosing, setDropdownClosing] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const inputValueRef = useRef(value);
  const committedSelectionRef = useRef<string | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const deferredQuery = useDeferredValue(inputValue);

  const openDropdown = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setDropdownClosing(false);
    setOpen(true);
  }, []);

  const closeDropdown = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    setOpen(false);
    setDropdownClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      setDropdownClosing(false);
      closeTimeoutRef.current = null;
    }, getCssDurationMs("--dropdown-close-dur", 150));
  }, []);

  const handlePointerDown = useCallback(
    (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    },
    [closeDropdown],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [handlePointerDown, open]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const filteredOptions = useMemo(
    () => rankOptions(options, deferredQuery, showAllOptions),
    [deferredQuery, options, showAllOptions],
  );
  const displayValue = isFocused ? inputValue : value;
  const resolvedHighlightedIndex = open
    ? clampHighlightedIndex(filteredOptions, highlightedIndex)
    : highlightedIndex;

  useEffect(() => {
    if (!open) {
      return;
    }

    optionRefs.current[resolvedHighlightedIndex]?.scrollIntoView?.({
      block: "nearest",
    });
  }, [open, resolvedHighlightedIndex]);

  const activeOptionId =
    open && filteredOptions[resolvedHighlightedIndex]
      ? `${optionIdBase}-${resolvedHighlightedIndex}`
      : undefined;

  const selectOption = (option: string) => {
    inputValueRef.current = option;
    setInputValue(option);
    committedSelectionRef.current = option;
    onInputChange?.(option);
    onSelectOption?.(option);
    if (!onInputChange && !onSelectOption) {
      onChange(option);
    }
    closeDropdown();
    inputRef.current?.blur();
  };

  const listboxVisible =
    (open || dropdownClosing) && filteredOptions.length > 0;

  return (
    <div ref={rootRef} className={hideLabel ? "text-sm" : "space-y-1 text-sm"}>
      {!hideLabel ? <span className="theme-text-dim">{label}</span> : null}
      <div className="relative">
        <input
          ref={inputRef}
          name={name}
          value={displayValue}
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-label={
            label || placeholder || dictionary.combobox.selectValue
          }
          autoComplete={autoComplete}
          inputMode={inputMode}
          onFocus={() => {
            setIsFocused(true);
            if (inputValueRef.current !== value) {
              inputValueRef.current = value;
              setInputValue(value);
            }
            const rankedOptions = rankOptions(
              options,
              inputValueRef.current,
              showAllOptions,
            );
            const exactMatchIndex = findExactMatchIndex(
              rankedOptions,
              inputValueRef.current,
            );
            setHighlightedIndex(exactMatchIndex >= 0 ? exactMatchIndex : 0);
            openDropdown();
          }}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            inputValueRef.current = nextValue;
            committedSelectionRef.current = null;
            setInputValue(nextValue);
            if (onInputChange) {
              onInputChange(nextValue);
            } else {
              onChange(nextValue);
            }
            openDropdown();
            setHighlightedIndex(0);
          }}
          onBlur={() => {
            setIsFocused(false);
            closeDropdown();
            const blurValue = inputValueRef.current;
            const selectedValue = committedSelectionRef.current;
            committedSelectionRef.current = null;

            if (
              selectedValue !== null &&
              normalizeAlias(selectedValue) === normalizeAlias(blurValue)
            ) {
              return;
            }

            onBlur?.(blurValue);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!open) {
                openDropdown();
                setHighlightedIndex(0);
                return;
              }
              if (filteredOptions.length > 0) {
                setHighlightedIndex(
                  () => (resolvedHighlightedIndex + 1) % filteredOptions.length,
                );
              }
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              if (!open) {
                openDropdown();
                setHighlightedIndex(
                  filteredOptions.length > 0 ? filteredOptions.length - 1 : 0,
                );
                return;
              }
              if (filteredOptions.length > 0) {
                setHighlightedIndex(() =>
                  resolvedHighlightedIndex === 0
                    ? filteredOptions.length - 1
                    : resolvedHighlightedIndex - 1,
                );
              }
              return;
            }

            if (
              event.key === "Enter" &&
              open &&
              filteredOptions[resolvedHighlightedIndex]
            ) {
              event.preventDefault();
              selectOption(filteredOptions[resolvedHighlightedIndex]);
              return;
            }

            if (
              event.key === "Tab" &&
              open &&
              filteredOptions[resolvedHighlightedIndex]
            ) {
              selectOption(filteredOptions[resolvedHighlightedIndex]);
              return;
            }

            if (event.key === "Escape" && open) {
              event.preventDefault();
              closeDropdown();
            }
          }}
          className={`theme-control theme-input w-full rounded-md px-3 py-2 ${
            compact ? "theme-field-sm text-sm" : ""
          } ${endAdornment ? "pr-10" : ""}`}
          placeholder={placeholder}
        />
        {endAdornment ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            {endAdornment}
          </div>
        ) : null}
        {listboxVisible ? (
          <div
            id={listboxId}
            role="listbox"
            aria-hidden={!open}
            data-origin="top-left"
            className={`theme-menu t-dropdown absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 max-h-64 overflow-y-auto rounded-lg py-1 ${
              open ? "is-open" : "is-closing"
            }`}
            style={{ scrollbarGutter: "stable" }}
          >
            {filteredOptions.map((option, index) => (
              <button
                key={option}
                id={`${optionIdBase}-${index}`}
                type="button"
                role="option"
                aria-selected={index === resolvedHighlightedIndex}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`theme-menu-item w-full text-left ${
                  compact ? "px-3 py-2 text-[13px]" : "px-3 py-2.5 text-sm"
                } ${
                  index === resolvedHighlightedIndex ? "theme-menu-item-active" : ""
                }`}
              >
                {renderOption ? renderOption(option) : option}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
