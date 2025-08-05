"use client";

import dynamic from "next/dynamic";
import { FormEditorProps } from "./form-editor";
import "./form-editor-styles.scss";
import "@/customizations/questions/custom-questions";

const FormEditor = dynamic(() => import("./form-editor"), {
  ssr: false,
});

const FormEditorContainer = (props: FormEditorProps) => {
  return <FormEditor {...props} />;
};

export default FormEditorContainer;
