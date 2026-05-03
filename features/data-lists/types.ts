import { DataListChoiceItem } from "@/lib/endatix-api";

export interface JsonErrorAnnotation {
    row: number;
    column: number;
    text: string;
    type: string;
  }
  
export interface ParsedValidation {
    validItems: DataListChoiceItem[];
    errors: string[];
    annotations: JsonErrorAnnotation[];
  }
  
  export interface JsonFileHandlerState {
    jsonInput: string;
    validationError: string | null;
    selectedFileName: string | null;
  }