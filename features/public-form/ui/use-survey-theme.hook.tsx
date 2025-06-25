import { useEffect, useState } from "react";
import { ITheme, SurveyModel } from "survey-core";
import { DefaultLight } from "survey-core/themes";

export function useSurveyTheme(
  themeString: string | undefined,
  model: SurveyModel | null,
) {
  const [parsedTheme, setParsedTheme] = useState<ITheme | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!themeString) {
      setParsedTheme(undefined);
      return;
    }

    try {
      const themeObject = JSON.parse(themeString) as ITheme;
      setParsedTheme(themeObject);
      setError(null);
    } catch (err) {
      console.error("Failed to parse theme", err);
      setParsedTheme(undefined);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [themeString]);

  // Apply theme to the model
  useEffect(() => {
    if (!model) {
      return;
    }

    if (parsedTheme) {
      model.applyTheme(parsedTheme);
    } else {
      model.applyTheme(DefaultLight);
    }
  }, [model, parsedTheme]);

  return { theme: parsedTheme, error };
}
