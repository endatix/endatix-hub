import { ITheme } from 'survey-core';

/**
 * Represents a stored theme with server-side properties
 * Extends the SurveyJS ITheme interface with database properties
 */
export interface StoredTheme extends ITheme {
  id: string;
  name: string;
} 