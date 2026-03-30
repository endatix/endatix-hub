import { ILocalizableOwner, LocalizableString } from "survey-core";

const EMPTY_STRING = "";

/**
 * Wrapper around the LocalizableString class to handle localization of strings.
 * @param value - The value to localize.
 * @param preferredLocale - The preferred locale to use.
 */
export class LocalizationWrapper {
  private readonly localizableString: LocalizableString;

  /**
   * Constructor for the LocalizationWrapper class.
   * @param value - The value to localize.
   */
  constructor(value: unknown) {
    this.localizableString = new LocalizableString(
      undefined as unknown as ILocalizableOwner,
      false,
    );

    if (value === null || value === undefined) {
      this.localizableString.text = EMPTY_STRING;
      return;
    }

    if (typeof value === "string" && value.length > 0) {
      this.localizableString.text = value;
      this.localizableString.defaultValue = value;
      return;
    }

    if (typeof value === "object") {
      this.localizableString.setJson(value);
      return;
    }

    this.localizableString.text = EMPTY_STRING;
  }

  /**
   * Get the localized text of the string.
   * @param preferredLocale - The preferred locale to use.
   * @returns The localized text of the string, or the default value if locale not found.
   */
  public getLocalizedText(preferredLocale: string): string {
    const localeText = this.localizableString.getLocaleText(preferredLocale);
    
    if (localeText && localeText.length > 0) {
      return localeText;
    }
    
    return this.localizableString.text;
  }

  /**
   * Get the text of the string.
   * @returns The text of the string.
   */
  public get text(): string {
    return this.localizableString.text;
  }
}
