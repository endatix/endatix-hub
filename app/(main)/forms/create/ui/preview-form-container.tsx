"use client";

import dynamic from "next/dynamic";

const PreviewForm = dynamic(() => import("./preview-form"), {
  ssr: false,
});

interface PreviewFormContainerProps {
  model: string;
}

const PreviewFormContainer = ({ model }: PreviewFormContainerProps) => {
  return <PreviewForm model={model} slkVal={process.env.NEXT_PUBLIC_SLK} />;
};

export default PreviewFormContainer;
