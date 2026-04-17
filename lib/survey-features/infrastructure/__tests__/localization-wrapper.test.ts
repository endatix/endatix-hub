import { describe, expect, it } from "vitest";
import { LocalizationWrapper } from "../localization-wrapper";

describe("LocalizationWrapper", () => {
  describe("Null and Undefined Values", () => {
    it("should return empty string when value is null", () => {
      const wrapper = new LocalizationWrapper(null);
      expect(wrapper.text).toBe("");
    });

    it("should return empty string when value is undefined", () => {
      const wrapper = new LocalizationWrapper(undefined);
      expect(wrapper.text).toBe("");
    });
  });

  describe("Empty String Values", () => {
    it("should return empty string when value is empty string", () => {
      const wrapper = new LocalizationWrapper("");
      expect(wrapper.text).toBe("");
    });
  });

  describe("String Values", () => {
    it("should return the string value when value is a non-empty string", () => {
      const wrapper = new LocalizationWrapper("Hello World");
      expect(wrapper.text).toBe("Hello World");
    });

    it("should return string value as default when locale not found", () => {
      const wrapper = new LocalizationWrapper("Hello World");
      expect(wrapper.getLocalizedText("es")).toBe("Hello World");
    });
  });

  describe("Object Values with Localization", () => {
    const localizedValue = {
      es: "Hola amigo",
      default: "Hello friend",
    };

    it("should return default text when no preferredLocale specified", () => {
      const wrapper = new LocalizationWrapper(localizedValue);
      expect(wrapper.text).toBe("Hello friend");
    });

    it("should return default text when preferredLocale does not exist", () => {
      const wrapper = new LocalizationWrapper(localizedValue);
      expect(wrapper.getLocalizedText("fr")).toBe("Hello friend");
    });

    it("should return default text for non-existent locale when only default exists", () => {
      const valueWithDefaultOnly = {
        default: "Default Text",
      };
      const wrapper = new LocalizationWrapper(valueWithDefaultOnly);
      expect(wrapper.getLocalizedText("es")).toBe("Default Text");
    });

    it("should return default text for non-existent locale in object with multiple locales", () => {
      const multiLocaleValue = {
        en: "Hello",
        es: "Hola",
        fr: "Bonjour",
        default: "Default Hello",
      };

      const wrapper = new LocalizationWrapper(multiLocaleValue);
      expect(wrapper.getLocalizedText("de")).toBe("Default Hello");
    });
  });

  describe("Empty Object Values", () => {
    it("should handle empty object", () => {
      const wrapper = new LocalizationWrapper({});
      expect(wrapper.text).toBe("");
    });

    it("should return empty string for getLocalizedText with empty object", () => {
      const wrapper = new LocalizationWrapper({});
      expect(wrapper.getLocalizedText("es")).toBe("");
    });
  });

  describe("Other Types", () => {
    it("should return empty string for number value", () => {
      const wrapper = new LocalizationWrapper(123 as unknown as unknown);
      expect(wrapper.text).toBe("");
    });

    it("should return empty string for boolean value", () => {
      const wrapper = new LocalizationWrapper(true as unknown as unknown);
      expect(wrapper.text).toBe("");
    });

    it("should return empty string for array value", () => {
      const wrapper = new LocalizationWrapper(["a", "b"] as unknown as unknown);
      expect(wrapper.text).toBe("");
    });
  });

  describe("getLocalizedText Method", () => {
    it("should return locale-specific text when it exists", () => {
      const localizedValue = {
        en: "Hello",
        es: "Hola",
        fr: "Bonjour",
        default: "Default",
      };

      const wrapper = new LocalizationWrapper(localizedValue);
      expect(wrapper.getLocalizedText("es")).toBe("Hola");
      expect(wrapper.getLocalizedText("fr")).toBe("Bonjour");
      expect(wrapper.getLocalizedText("en")).toBe("Hello");
    });

    it("should return default text when locale not found", () => {
      const localizedValue = {
        es: "Hola",
        default: "Default",
      };

      const wrapper = new LocalizationWrapper(localizedValue);
      expect(wrapper.getLocalizedText("fr")).toBe("Default");
      expect(wrapper.getLocalizedText("it")).toBe("Default");
      expect(wrapper.getLocalizedText("")).toBe("Default");
      expect(wrapper.getLocalizedText("null" as unknown as string)).toBe(
        "Default",
      );
      expect(wrapper.getLocalizedText("undefined" as unknown as string)).toBe(
        "Default",
      );
    });

    it("should return string value as default for non-existent locale on plain string", () => {
      const wrapper = new LocalizationWrapper("Plain text");
      expect(wrapper.getLocalizedText("es")).toBe("Plain text");
    });

    it("should return empty string for null value since no default exists", () => {
      const wrapper = new LocalizationWrapper(null);
      expect(wrapper.getLocalizedText("es")).toBe("");
    });
  });
});
