import { ITheme } from "survey-core";
import { v4 as uuidv4 } from "uuid";
import { rentalThemeLight, rentalThemeDark } from "./rental-theme";
import { conferenceThemeLight, conferenceThemeDark } from "./conference-theme";

// Type for stored themes with ID
export interface StoredTheme extends ITheme {
  id: string;
}

class ThemeRepository {
  private themes: Map<string, StoredTheme> = new Map();

  constructor() {
    this.initializeThemes();
  }

  private getRandomDelay(): number {
    return Math.floor(Math.random() * 1000) + 100;
  }

  private initializeThemes(): void {
    const initialThemes: ITheme[] = [
      rentalThemeLight,
      rentalThemeDark,
      conferenceThemeLight,
      conferenceThemeDark,
    ];

    // Add each theme with a generated ID
    initialThemes.forEach((theme) => {
      const id = uuidv4();
      this.themes.set(id, { ...theme, id });
    });
  }

  // Get all themes
  async getAllThemes(): Promise<StoredTheme[]> {
    // Simulate async DB operation
    await new Promise((resolve) => setTimeout(resolve, this.getRandomDelay()));
    return Array.from(this.themes.values());
  }

  async getThemeByFormId(formId: string): Promise<StoredTheme | null> {
    // Simulate async DB operation
    await new Promise((resolve) => setTimeout(resolve, this.getRandomDelay()));

    const RENTAL_FORM_ID = "1356638596852875264";
    if (formId === RENTAL_FORM_ID) {
      return { ...rentalThemeLight, id: RENTAL_FORM_ID };
    }

    return null;
  }

  // Get a theme by ID
  async getThemeById(id: string): Promise<StoredTheme | null> {
    // Simulate async DB operation
    await new Promise((resolve) => setTimeout(resolve, this.getRandomDelay()));
    const theme = this.themes.get(id);
    return theme || null;
  }

  // Create a new theme
  async createTheme(theme: ITheme): Promise<StoredTheme> {
    // Simulate async DB operation
    await new Promise((resolve) => setTimeout(resolve, this.getRandomDelay()));

    const id = uuidv4();
    const newTheme = { ...theme, id };

    this.themes.set(id, newTheme);
    return newTheme;
  }

  // Update an existing theme
  async updateTheme(id: string, theme: ITheme): Promise<StoredTheme | null> {
    // Simulate async DB operation
    await new Promise((resolve) => setTimeout(resolve, this.getRandomDelay()));

    if (!this.themes.has(id)) {
      return null;
    }

    const updatedTheme = { ...theme, id };
    this.themes.set(id, updatedTheme);

    return updatedTheme;
  }

  // Delete a theme
  async deleteTheme(id: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, this.getRandomDelay()));

    if (!this.themes.has(id)) {
      return false;
    }

    return this.themes.delete(id);
  }
}

// Export singleton instance
export const themeRepository = new ThemeRepository();
