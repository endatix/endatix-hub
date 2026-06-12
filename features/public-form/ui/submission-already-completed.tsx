import { CircleCheck } from "lucide-react";
import styles from "./already-responded.module.css";

interface SubmissionAlreadyCompletedProps {
  isEmbed: boolean;
}

const DEFAULT_TITLE = "Thank you";
const DEFAULT_MESSAGE = "This form has already been completed.";

const embedStyles = {
  container: "already-responded-container",
  content: "already-responded-content",
  title: "already-responded-title",
  message: "already-responded-message",
  iconWrapper: "already-responded-icon-wrapper",
  icon: "already-responded-icon",
} as const;

export default function SubmissionAlreadyCompleted({
  isEmbed,
}: Readonly<SubmissionAlreadyCompletedProps>) {
  const classNames = isEmbed ? embedStyles : styles;

  return (
    <div className={classNames.container}>
      <div className={classNames.content}>
        <h1 className={classNames.title}>{DEFAULT_TITLE}</h1>
        <p className={classNames.message}>{DEFAULT_MESSAGE}</p>
        <div className={classNames.iconWrapper}>
          <CircleCheck
            className={classNames.icon}
            size={48}
            strokeWidth={1.8}
          />
        </div>
      </div>
    </div>
  );
}
