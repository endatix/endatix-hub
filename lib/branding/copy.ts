/** "an Endatix", "a Example Forms": the article by the name's first letter, for running text. */
export function withIndefiniteArticle(name: string): string {
  return `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name}`;
}
