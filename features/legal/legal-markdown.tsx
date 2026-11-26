import MarkdownIt from "markdown-it";

// Published copy can contain links but cannot execute HTML or load tracking images.
const markdown = new MarkdownIt({ html: false }).disable("image");

export function LegalMarkdown({ text }: Readonly<{ text: string }>) {
  return (
    <article
      className="prose prose-sm dark:prose-invert max-w-none break-words"
      dangerouslySetInnerHTML={{ __html: markdown.render(text) }}
    />
  );
}
