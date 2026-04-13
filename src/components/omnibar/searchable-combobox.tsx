"use client";

import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { normalizeAlias } from "@/lib/data/loaders";

interface SearchableComboboxProps {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
}

function rankOptions(options: string[], query: string) {
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

export function SearchableCombobox({
  label,
  value,
  options,
  placeholder,
  onChange,
}: SearchableComboboxProps) {
  const listboxId = useId();
  const optionIdBase = useId();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const deferredQuery = useDeferredValue(query);
  const handlePointerDown = useEffectEvent((event: MouseEvent) => {
    if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
      setOpen(false);
    }
  });

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const filteredOptions = useMemo(
    () => rankOptions(options, deferredQuery),
    [deferredQuery, options],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setHighlightedIndex((current) => {
      if (filteredOptions.length === 0) {
        return 0;
      }

      const exactMatchIndex = filteredOptions.findIndex(
        (option) => normalizeAlias(option) === normalizeAlias(query),
      );

      if (exactMatchIndex >= 0) {
        return exactMatchIndex;
      }

      return Math.min(current, filteredOptions.length - 1);
    });
  }, [filteredOptions, open, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    optionRefs.current[highlightedIndex]?.scrollIntoView?.({
      block: "nearest",
    });
  }, [highlightedIndex, open]);

  const activeOptionId =
    open && filteredOptions[highlightedIndex]
      ? `${optionIdBase}-${highlightedIndex}`
      : undefined;

  const selectOption = (option: string) => {
    setQuery(option);
    onChange(option);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="space-y-1 text-sm">
      <span className="theme-text-dim">{label}</span>
      <div className="relative">
        <input
          value={query}
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-label={label}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            setQuery(nextValue);
            onChange(nextValue);
            setOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                setHighlightedIndex(0);
                return;
              }
              if (filteredOptions.length > 0) {
                setHighlightedIndex(
                  (current) => (current + 1) % filteredOptions.length,
                );
              }
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                setHighlightedIndex(
                  filteredOptions.length > 0 ? filteredOptions.length - 1 : 0,
                );
                return;
              }
              if (filteredOptions.length > 0) {
                setHighlightedIndex((current) =>
                  current === 0 ? filteredOptions.length - 1 : current - 1,
                );
              }
              return;
            }

            if (
              event.key === "Enter" &&
              open &&
              filteredOptions[highlightedIndex]
            ) {
              event.preventDefault();
              selectOption(filteredOptions[highlightedIndex]);
              return;
            }

            if (event.key === "Escape" && open) {
              event.preventDefault();
              setOpen(false);
            }
          }}
          className="theme-control theme-input w-full rounded-xl px-3 py-2"
          placeholder={placeholder}
        />
        {open && filteredOptions.length > 0 ? (
          <div
            id={listboxId}
            role="listbox"
            className="theme-menu absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 max-h-64 overflow-y-auto rounded-2xl py-1"
            style={{ scrollbarGutter: "stable" }}
          >
            {filteredOptions.map((option, index) => (
              <button
                key={option}
                id={`${optionIdBase}-${index}`}
                type="button"
                role="option"
                aria-selected={index === highlightedIndex}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`theme-menu-item w-full px-3 py-2.5 text-left text-sm ${
                  index === highlightedIndex ? "theme-menu-item-active" : ""
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
