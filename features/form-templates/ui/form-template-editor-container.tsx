"use client";

import dynamic from "next/dynamic";
import { FormTemplateEditorProps } from "./form-template-editor";
import "./creator-styles.scss";
import { questionLoaderModule } from '@/lib/questions/question-loader-module';
import { customQuestions } from '@/customizations/questions/question-registry';

const FormTemplateEditor = dynamic(() => import("./form-template-editor"), {
  ssr: false,
});

// Load all custom questions registered in the question registry
for (const questionName of customQuestions) {
  try {
    await questionLoaderModule.loadQuestion(questionName);
    console.debug(`✅ Loaded custom question: ${questionName}`);
  } catch (error) {
    console.warn(`⚠️ Failed to load custom question: ${questionName}`, error);
  }
}

const FormTemplateEditorContainer = (props: FormTemplateEditorProps) => {
  return <FormTemplateEditor {...props} />;
};

export default FormTemplateEditorContainer;
