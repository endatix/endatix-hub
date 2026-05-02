"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { Editor } from "ace-builds";
import type { CSSProperties } from "react";
import { JsonErrorAnnotation } from "../types";

const DEFAULT_STYLE: CSSProperties = {
  height: "250px",
  minHeight: "250px",
};

const ACE_DARK_THEME = "ace/theme/clouds_midnight";
const ACE_LIGHT_THEME = "ace/theme/chrome";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  style?: CSSProperties;
  errors?: JsonErrorAnnotation[];
  activeError?: { row: number; column: number } | null;
}

export function JsonEditor({
  value,
  onChange,
  style,
  errors,
  activeError,
}: Readonly<JsonEditorProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const { theme, resolvedTheme } = useTheme();
  const activeAceTheme =
    (resolvedTheme ?? theme) === "dark" ? ACE_DARK_THEME : ACE_LIGHT_THEME;

  const onChangeRef = useRef(onChange);
  const lastSyncedValueRef = useRef(value ?? "");
  const isSilentRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    const currentEditor = editorRef.current;

    if (!container || currentEditor) return;

    const initEditor = async () => {
      const ace = (await import("ace-builds/src-noconflict/ace")).default;

      await Promise.all([
        import("ace-builds/src-noconflict/mode-json"),
        import("ace-builds/src-noconflict/theme-clouds_midnight"),
        import("ace-builds/src-noconflict/theme-chrome"),
        import("ace-builds/src-noconflict/ext-searchbox"),
      ]);

      if (cancelled || !containerRef.current || editorRef.current) return;

      const editor = ace.edit(container);
      editorRef.current = editor;

      editor.session.setMode("ace/mode/json");
      editor.session.setUseWorker(false);

      editor.setOptions({
        minLines: 10,
        maxLines: 20,
        showGutter: true,
        showPrintMargin: false,
        showLineNumbers: false,
        tabSize: 2,
        highlightActiveLine: true,
        highlightGutterLine: true,
      });

      editor.renderer.setOptions({
        fontSize: "12px",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      });

      container.style.height = "250px";
      container.style.width = "100%";

      editor.setTheme(activeAceTheme);

      const initialValue = value ?? "";
      isSilentRef.current = true;
      try {
        editor.setValue(initialValue, -1);
        editor.clearSelection();
      } finally {
        isSilentRef.current = false;
      }

      lastSyncedValueRef.current = initialValue;

      const handleChange = () => {
        if (isSilentRef.current) return;

        const nextValue = editor.getValue();
        lastSyncedValueRef.current = nextValue;
        onChangeRef.current(nextValue);
      };

      editor.on("change", handleChange);

      setIsReady(true);

      return () => {
        editor.off("change", handleChange);
      };
    };

    let cleanupListener: (() => void) | undefined;

    initEditor().then((cleanup) => {
      cleanupListener = cleanup;
    });

    return () => {
      cancelled = true;

      cleanupListener?.();

      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }

      container?.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.setTheme(activeAceTheme);
  }, [activeAceTheme]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !isReady) return;

    const annotations = errors ?? [];
    editor.getSession().setAnnotations(annotations);
  }, [errors, isReady]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !isReady || !activeError) return;

    editor.focus();
    editor.renderer.scrollCursorIntoView(
      { row: activeError.row, column: activeError.column },
      0.5,
    );
    editor.gotoLine(activeError.row, activeError.column + 1);
  }, [activeError, isReady]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !isReady) return;

    const incomingValue = value ?? "";
    const currentValue = editor.getValue();

    if (
      incomingValue !== currentValue &&
      incomingValue !== lastSyncedValueRef.current
    ) {
      isSilentRef.current = true;

      try {
        const selection = editor.session.selection.toJSON();
        editor.setValue(incomingValue, -1);
        editor.session.selection.fromJSON(selection);
      } finally {
        isSilentRef.current = false;
      }

      lastSyncedValueRef.current = incomingValue;
    }
  }, [value, isReady]);

  return (
    <div
      ref={containerRef}
      style={{ ...DEFAULT_STYLE, ...style }}
      className="overflow-hidden rounded-md border"
    />
  );
}
