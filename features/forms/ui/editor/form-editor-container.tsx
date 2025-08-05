"use client";

import dynamic from "next/dynamic";
import { FormEditorProps } from "./form-editor";
import "@/customizations/questions/custom-questions";
import "./form-editor-styles.scss";

const FormEditor = dynamic(() => import("./form-editor"), {
  ssr: false,
});

const FormEditorContainer = (props: FormEditorProps) => {
  return <FormEditor {...props} />;
};

export default FormEditorContainer;
