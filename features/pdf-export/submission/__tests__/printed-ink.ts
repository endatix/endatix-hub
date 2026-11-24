type PrintedNode = {
  lines?: { string: string }[];
  style?: { color?: string };
  children?: PrintedNode[];
};

export function printedInk(node: PrintedNode): [string, string | undefined][] {
  return node.lines?.map(line => [line.string, node.style?.color]) ??
    node.children?.flatMap(child => printedInk(child)) ?? [];
}
