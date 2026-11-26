"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { PrivateReadUrlBatchQueue } from "../application/read-url-queue";
import { fetchStorageReadUrls } from "../infrastructure/fetch-storage-read-urls";
import { canonicalContentImage } from "../use-cases/view-protected-files/canonical-content-image";
import { useAssetStorage } from "./asset-storage.context";
import { useStorageReadRuntime } from "./use-storage-read-runtime";

const richText = ".sv-string-viewer, .sv-string-editor--html, .sd-html";

/** The editor reads innerHTML on focus. Restore the author source before its event handler runs. */
function restoreSources(root: Element, originals: WeakMap<HTMLImageElement, string>) {
  for (const image of root.querySelectorAll("img")) {
    const original = originals.get(image);
    if (original) image.setAttribute("src", original);
    originals.delete(image);
  }
}

export function RichTextImageDisplay({ children }: Readonly<{ children: ReactNode }>) {
  const root = useRef<HTMLDivElement>(null);
  const { config } = useAssetStorage();
  const runtime = useStorageReadRuntime();

  useEffect(() => {
    const container = root.current;
    if (!container || !config?.isPrivate || !config.isEnabled) return;
    const queue = new PrivateReadUrlBatchQueue({
      getCache: () => ({}),
      onBatchResolved() {},
      fetchBatch: (urls, scope) => fetchStorageReadUrls(urls, scope, "rich-text"),
    });
    const originals = new WeakMap<HTMLImageElement, string>();
    let active = true;

    async function project(image: HTMLImageElement) {
      if (!image.closest(richText) || image.closest(".ql-editor, [contenteditable=true]:focus")) return;
      const src = image.getAttribute("src");
      if (!config || !src || originals.get(image) === src || !canonicalContentImage(src, config)) return;
      originals.set(image, src);
      const result = await queue.enqueue([src], runtime());
      const signed = result.get(src);
      if (active && signed && originals.get(image) === src && image.getAttribute("src") === src) {
        image.src = signed;
      }
    }

    function scan(node: Node) {
      if (node instanceof HTMLImageElement) void project(node);
      else if (node instanceof Element) node.querySelectorAll("img").forEach((image) => void project(image));
    }
    const observer = new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === "attributes") scan(change.target);
        else change.addedNodes.forEach(scan);
      }
    });
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.matches("[contenteditable=true]")) {
        restoreSources(event.target, originals);
      }
    };
    container.addEventListener("focus", onFocus, true);
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    scan(container);
    return () => {
      active = false;
      observer.disconnect();
      container.removeEventListener("focus", onFocus, true);
      restoreSources(container, originals);
    };
  }, [config, runtime]);

  return <div ref={root} style={{ display: "contents" }}>{children}</div>;
}
