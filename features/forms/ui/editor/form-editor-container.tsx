"use client";

import dynamic from "next/dynamic";
import { FormEditorProps } from "./form-editor";
import "@/lib/questions/all-questions";
import "./form-editor-styles.scss";

const FormEditor = dynamic(() => import("./form-editor"), {
  ssr: false,
});

const FormEditorContainer = (props: FormEditorProps) => {
  return <FormEditor {...props} />;
};

export default FormEditorContainer;
