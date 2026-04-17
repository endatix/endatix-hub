interface FormattingFunc {
  readonly name: string;
  readonly func: (params: unknown[]) => string;
}

export type { FormattingFunc };
