"use client";

import dynamic from "next/dynamic";
import { FormTemplateEditorProps } from "./form-template-editor";
import "./creator-styles.scss";

const FormTemplateEditor = dynamic(() => import("./form-template-editor"), {
  ssr: false,
});

const FormTemplateEditorContainer = (props: FormTemplateEditorProps) => {
  return <FormTemplateEditor {...props} />;
};

export default FormTemplateEditorContainer;
