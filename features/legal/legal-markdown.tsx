import MarkdownIt from "markdown-it";

// Published copy can contain links but cannot execute HTML or load tracking images.
const markdown = new MarkdownIt({ html: false }).disable("image");

export function LegalMarkdown({ text }: Readonly<{ text: string }>) {
  return (
    <article
      className="space-y-3 text-sm leading-relaxed break-words [&_:is(h1,h2,h3,h4)]:font-semibold [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: markdown.render(text) }}
    />
  );
}
