const opaqueKey = /[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}|[a-f\d]{24,}/i;
const genericPrefix = /^(?:image|img|dsc|dcim|photo|picture|pasted?|clipboard|screen ?shot|screen capture|untitled|blob)/i;

function isGenericLabel(label: string) {
  const prefix = genericPrefix.exec(label);
  if (!prefix) return false;
  const suffix = label.slice(prefix[0].length).trim();
  return !suffix || suffix.split(" ").every(word => /^(?:image|copy|at|am|pm|\d+)$/.test(word.toLowerCase()));
}

export function fileLabel(name: string) {
  if (/[?:#=&%]/.test(name.replace(/^[a-z]:[/\\]/i, ""))) return "";
  const leaf = name.split(/[/\\]/).pop() ?? "";
  if (opaqueKey.test(leaf) || leaf.length > 120 || /[a-z\d]{32,}/i.test(leaf)) return "";
  const label = leaf.replace(/\.[^.]+$/, "").replace(/[_.-]+/g, " ").replace(/\s+/g, " ").trim();
  return isGenericLabel(label) || !/\p{L}/u.test(label) ? "" : label;
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
  const label = image.alt.trim() || fileLabel(image.dataset.imageLabel ?? "") ||
    sourceLabel(image.getAttribute("src") ?? "") || "Unlabeled image";
  return `${index + 1}. ${label}`;
}
