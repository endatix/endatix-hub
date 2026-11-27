"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { ClientStorageConfig } from "@endatix/storage-core";
import { PrivateReadUrlBatchQueue } from "../application/read-url-queue";
import {
  fetchStorageReadUrls,
  type StorageReadRuntime,
} from "../infrastructure/fetch-storage-read-urls";
import { canonicalContentImage } from "../use-cases/view-protected-files/canonical-content-image";
import { useAssetStorage } from "./asset-storage.context";
import { useStorageReadRuntime } from "./use-storage-read-runtime";
import { showQuillImage } from "./quill-image-preview";

const richText = ".sv-string-viewer, .sv-string-editor--html, .sd-html";
type ReadImage = (src: string) => Promise<string | null>;

function isDisplayImage(image: HTMLImageElement) {
  return image.matches("[data-image-thumbnail]") ||
    (image.closest(richText) && !image.closest(".ql-editor, [contenteditable=true]:focus"));
}

function displayTarget(image: HTMLImageElement) {
  const editor = image.closest(".ql-editor")?.closest<HTMLElement>(".rich-text-editor[id]");
  if (editor) return { editable: true, show: (src: string, signed: string) => showQuillImage(editor, src, signed) };
  if (isDisplayImage(image)) return { editable: false, show: (_src: string, signed: string) => { image.src = signed; } };
}

function readImages(runtime: () => StorageReadRuntime | null): ReadImage {
  // Deduplicate a render batch, but a later page needs a new grant.
  const queue = new PrivateReadUrlBatchQueue({
    getCache: () => ({}),
    onBatchResolved() {},
    fetchBatch: (urls, scope) => fetchStorageReadUrls(urls, scope, "rich-text"),
  });
  return async (src) =>
    (await queue.enqueue([src], runtime())).get(src) ?? null;
}

class DisplaySources {
  private readonly projections = new WeakMap<HTMLImageElement, { source: string; display?: string }>();
  private active = true;

  constructor(
    private readonly config: ClientStorageConfig,
    private readonly read: ReadImage,
  ) {}

  async project(image: HTMLImageElement) {
    const target = displayTarget(image);
    if (!target) return;
    const src = canonicalContentImage(
      image.getAttribute("src") ?? "",
      this.config,
    );
    if (!src) return;
    const previous = this.projections.get(image);
    if (previous?.source === src && (target.editable || !previous.display)) return;
    const projection: { source: string; display?: string } = { source: src };
    this.projections.set(image, projection);
    const signed = await this.read(src);
    if (!this.isCurrent(image, projection)) return;
    if (!signed) { this.projections.delete(image); return; }
    projection.display = signed;
    target.show(src, signed);
  }

  private isCurrent(image: HTMLImageElement, projection: { source: string }) {
    return this.active && this.projections.get(image) === projection &&
      image.getAttribute("src") === projection.source;
  }

  /** Creator reads innerHTML on focus. Restore its canonical markup first. */
  restore(root: Element) {
    for (const image of root.querySelectorAll("img")) {
      const projected = this.projections.get(image);
      if (projected && projected.display === image.getAttribute("src")) image.src = projected.source;
      this.projections.delete(image);
    }
  }

  stop(container: Element) {
    this.active = false;
    this.restore(container);
    container.querySelectorAll(".rich-text-editor > style[data-image-preview]").forEach(style => style.remove());
  }
}

function scan(node: Node, display: DisplaySources) {
  if (node instanceof HTMLImageElement) void display.project(node);
  else if (node instanceof Element) {
    node
      .querySelectorAll("img")
      .forEach((image) => void display.project(image));
  }
}

function observeImages(container: Element, display: DisplaySources) {
  const observer = new MutationObserver((changes) =>
    changes.forEach((change) => {
      if (change.type === "attributes") scan(change.target, display);
      else change.addedNodes.forEach((node) => scan(node, display));
    }),
  );
  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });
  scan(container, display);
  return observer;
}

function bindRichTextImages(container: Element, display: DisplaySources) {
  const observer = observeImages(container, display);
  const onFocus = (event: Event) => {
    if (event.target instanceof Element && event.target.matches("[contenteditable=true]:not(.ql-editor)")) {
      display.restore(event.target);
    }
  };
  container.addEventListener("focus", onFocus, true);
  return () => {
    observer.disconnect();
    container.removeEventListener("focus", onFocus, true);
    display.stop(container);
  };
}

export function RichTextImageDisplay({
  children,
}: Readonly<{ children: ReactNode }>) {
  const root = useRef<HTMLDivElement>(null);
  const { config } = useAssetStorage();
  const runtime = useStorageReadRuntime();
  useEffect(() => {
    if (!root.current || !config?.isPrivate || !config.isEnabled) return;
    return bindRichTextImages(
      root.current,
      new DisplaySources(config, readImages(runtime)),
    );
  }, [config, runtime]);
  return (
    <div ref={root} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
