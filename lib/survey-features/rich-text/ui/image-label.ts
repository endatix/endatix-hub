const opaqueKey = /[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}|[a-f\d]{24,}/i;
const genericName = /^(?:image|img|dsc|dcim|photo|picture|pasted?|clipboard|screen\s?shot|screen capture|untitled|blob)(?:\s*(?:image|copy|at|am|pm|\d+))*$/i;

export function fileLabel(name: string) {
  if (/[?:#=&%]/.test(name.replace(/^[a-z]:[/\\]/i, ""))) return "";
  const leaf = name.split(/[/\\]/).pop() ?? "";
  if (opaqueKey.test(leaf)) return "";
  const label = leaf.replace(/\.[^.]+$/, "").replace(/[_.-]+/g, " ").replace(/\s+/g, " ").trim();
  return genericName.test(label) || !/\p{L}/u.test(label) ? "" : label;
}

function sourceLabel(source: string) {
  try {
    const url = new URL(source, document.baseURI);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    const leaf = decodeURIComponent(url.pathname.split("/").pop() ?? "");
    return /\.(?:avif|bmp|gif|jpe?g|png|svg|tiff?|webp)$/i.test(leaf) ? fileLabel(leaf) : "";
  } catch {
    return "";
  }
}

export function imageOption(image: HTMLImageElement, index: number) {
  const label = image.alt.trim() || sourceLabel(image.getAttribute("src") ?? "") || "Unlabeled image";
  return `${index + 1}. ${label}`;
}
