"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { SurveyModel } from "survey-core";
import { useLanguageSelection } from "../application/use-language-selection.hook";

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
  
  const { currentLocale, currentOption, languageOptions, changeLocale } = useLanguageSelection({
    availableLocales,
    surveyModel,
    preselectedLocale: initialLocale,
  });

  const handleLocaleChange = useCallback((newLocale: string) => {
    changeLocale(newLocale);
    setIsOpen(false);
  }, [changeLocale]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Close dropdown on ESC key
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

  // Don't show selector if only one locale available
  if (!languageOptions.length || languageOptions.length <= 1) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      style={{
        display: "flex",
        justifyContent: "flex-end",
        margin: "8px",
        width: "140px",
        marginLeft: "auto",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        <div
          className="sd-input sd-dropdown"
          style={{
            border: "1px solid var(--sjs-border-default, #d6d6d6)",
            borderRadius: "4px",
            backgroundColor: "var(--sjs-general-backcolor, #ffffff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px",
            cursor: "pointer",
            height: "32px",
            fontSize: "14px",
          }}
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
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <input
              autoComplete="off"
              className="sd-dropdown__filter-string-input"
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
              style={{
                cursor: "pointer",
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "14px",
                fontFamily: "inherit",
                fontWeight: "inherit",
                textTransform: "capitalize",
                color: "inherit",
                lineHeight: "inherit",
                padding: "0 12px",
                margin: "0",
                verticalAlign: "middle",
              }}
            />
          </div>
          <div
            style={{ marginLeft: "8px", display: "flex", alignItems: "center" }}
          >
            <svg
              style={{
                width: "12px",
                height: "12px",
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
                fill: "currentColor",
                flexShrink: 0,
              }}
              viewBox="0 0 24 24"
            >
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
            </svg>
          </div>
        </div>

        {isOpen && (
          <div
            role="listbox"
            aria-label="Language options"
            style={{
              position: "absolute",
              top: "100%",
              left: "0",
              right: "0",
              zIndex: 10000,
              backgroundColor: "var(--sjs-general-backcolor, #ffffff)",
              border: "1px solid var(--sjs-border-default, #d6d6d6)",
              borderRadius: "4px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              maxHeight: "200px",
              overflowY: "auto",
              marginTop: "2px",
            }}
          >
            {languageOptions.map((option) => (
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
                aria-selected={option.value === currentLocale}
                tabIndex={0}
                style={{
                  cursor: "pointer",
                  padding: "6px 8px",
                  textTransform: "capitalize",
                  borderBottom: "1px solid var(--sjs-border-default, #d6d6d6)",
                  backgroundColor:
                    option.value === currentLocale
                      ? "var(--sjs-primary-backcolor, #e6f3ff)"
                      : "transparent",
                  color: "inherit",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  fontWeight: "inherit",
                  lineHeight: "inherit",
                  display: "flex",
                  alignItems: "center",
                  height: "32px",
                }}
                onMouseEnter={(e) => {
                  if (option.value !== currentLocale) {
                    e.currentTarget.style.backgroundColor =
                      "var(--sjs-primary-backcolor-dim, #f0f8ff)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (option.value !== currentLocale) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
