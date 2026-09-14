"use client";

import dynamic from "next/dynamic";
import { FormEditorProps } from "./form-editor";
import "./form-editor-styles.scss";
import "@/lib/survey-features/infrastructure/creator-property-grid.css";

const FormEditor = dynamic(() => import("./form-editor"), {
  ssr: false,
});

const FormEditorContainer = (props: FormEditorProps) => {
  return <FormEditor {...props} />;
};

export default FormEditorContainer;
