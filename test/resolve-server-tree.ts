import { Fragment, isValidElement, Suspense, type ReactElement } from "react";

/** A rendered leaf: a component the test mocked, with its props resolved. */
export type ServerTreeNode =
  | { type: string; props: Record<string, unknown> }
  | string
  | number
  | null
  | ServerTreeNode[];

/**
 * Runs a server component tree down to the components named in `leaves`,
 * calling (and awaiting) every other function component on the way. Use it
 * to assert which slice a server page renders without a React server renderer.
 */
export async function resolveServerTree(
  node: unknown,
  leaves: ReadonlySet<string>,
): Promise<ServerTreeNode> {
  if (Array.isArray(node)) {
    return Promise.all(node.map((child) => resolveServerTree(child, leaves)));
  }
  if (!isValidElement(node)) {
    return (node ?? null) as ServerTreeNode;
  }

  const element = node as ReactElement<Record<string, unknown>>;
  if (element.type === Fragment || element.type === Suspense) {
    return resolveServerTree(element.props.children, leaves);
  }
  if (typeof element.type === "function" && !leaves.has(element.type.name)) {
    const render = element.type as (props: unknown) => unknown;
    return resolveServerTree(await render(element.props), leaves);
  }

  return {
    type: typeName(element),
    props: await resolveProps(element.props, leaves),
  };
}

/** Every leaf in the tree, depth first, including leaves passed as props. */
export function leafNames(tree: ServerTreeNode): string[] {
  if (Array.isArray(tree)) return tree.flatMap(leafNames);
  if (tree === null || typeof tree !== "object") return [];
  const nested = Object.values(tree.props).flatMap((value) =>
    isTreeNode(value) ? leafNames(value) : [],
  );
  return [tree.type, ...nested];
}

async function resolveProps(
  props: Record<string, unknown>,
  leaves: ReadonlySet<string>,
): Promise<Record<string, unknown>> {
  const entries = await Promise.all(
    Object.entries(props).map(async ([key, value]) => {
      const resolved =
        isValidElement(value) || Array.isArray(value)
          ? await resolveServerTree(value, leaves)
          : value;
      return [key, resolved] as const;
    }),
  );
  return Object.fromEntries(entries);
}

function typeName(element: ReactElement): string {
  return typeof element.type === "function"
    ? element.type.name
    : String(element.type);
}

function isTreeNode(value: unknown): value is ServerTreeNode {
  return (
    Array.isArray(value) ||
    (typeof value === "object" &&
      value !== null &&
      "type" in value &&
      "props" in value)
  );
}
