"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { SurveyModel } from "survey-core";
import { useLanguageSelection } from "../application/use-language-selection.hook";
import styles from "./language-selector.module.css";

interface LanguageSelectorProps {
  availableLocales: string[];
  surveyModel: SurveyModel | null;
  initialLocale?: string;
}

export function LanguageSelector({
  availableLocales,
  surveyModel,
  initialLocale,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    currentLocale,
    currentOption,
    languageOptions,
    changeLocale,
    hasMultipleLocales,
  } = useLanguageSelection({
    availableLocales,
    surveyModel,
    preselectedLocale: initialLocale,
  });

  const handleLocaleChange = useCallback(
    (newLocale: string) => {
      changeLocale(newLocale);
      setIsOpen(false);
    },
    [changeLocale],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!hasMultipleLocales) {
    return null;
  }

  return (
    <div ref={dropdownRef} className={styles.root}>
      <div className={styles.controlWrap}>
        <div
          className={`sd-input sd-dropdown ${styles.trigger}`}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          tabIndex={0}
          role="combobox"
          aria-controls={isOpen ? "language-options" : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <div className={styles.value}>
            <input
              autoComplete="off"
              className={`sd-dropdown__filter-string-input ${styles.input}`}
              role="combobox"
              aria-controls={isOpen ? "language-options" : undefined}
              aria-required="false"
              aria-invalid="false"
              aria-expanded={isOpen}
              placeholder="Select language"
              readOnly
              inputMode="text"
              type="text"
              value={currentOption?.label || currentLocale}
            />
          </div>
          <div className={styles.chevronWrap}>
            <svg
              className={`${styles.chevron}${isOpen ? ` ${styles.chevronOpen}` : ""}`}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
            </svg>
          </div>
        </div>

        {isOpen && (
          <div
            id="language-options"
            role="listbox"
            aria-label="Language options"
            className={styles.menu}
          >
            {languageOptions.map((option) => {
              const selected = option.value === currentLocale;
              return (
                <div
                  key={option.value}
                  onClick={() => handleLocaleChange(option.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleLocaleChange(option.value);
                    }
                  }}
                  role="option"
                  aria-selected={selected}
                  tabIndex={0}
                  className={`${styles.option}${selected ? ` ${styles.optionSelected}` : ""}`}
                >
                  {option.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
