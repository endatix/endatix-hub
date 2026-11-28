import { canonicalSurvey } from "@endatix/survey-journal/hash";
import type {
  DraftJournalBatch,
  FormDraft,
} from "@/lib/endatix-api/forms/types";
import { journalBatch, type LocalEdit } from "./journal-batch";

export type DraftWrite = {
  version: string;
  jsonData: string;
  batch?: DraftJournalBatch;
};
export type WriteResult =
  | { kind: "saved"; head: FormDraft }
  | { kind: "stale"; head: FormDraft; acknowledged?: boolean }
  | { kind: "auth" | "offline" | "error"; message: string };
export interface DraftQueue {
  base: FormDraft;
  edits: LocalEdit[];
  next: number;
  sealed: number;
  request?: DraftWrite;
  recovery?: boolean;
}
export type DraftStatus =
  | "saved"
  | "saving"
  | "offline"
  | "auth"
  | "conflict"
  | "recovery"
  | "error";
export interface DraftView {
  status: DraftStatus;
  head: FormDraft;
  count: number;
  message?: string;
}
interface DraftPorts {
  sessionId: string;
  persist(queue: DraftQueue): Promise<void>;
  send(request: DraftWrite): Promise<WriteResult>;
  change(view: DraftView): void;
  load(jsonData: string): void;
  online(): boolean;
}

export class DraftAutosave {
  private timer?: ReturnType<typeof setTimeout>;
  private stored: Promise<void> = Promise.resolve();
  private sending?: Promise<void>;
  private status: DraftStatus = "saved";
  private remote?: FormDraft;
  private closed = false;

  constructor(
    private queue: DraftQueue,
    private readonly ports: DraftPorts,
  ) {}

  static empty(base: FormDraft): DraftQueue {
    return { base, edits: [], next: 1, sealed: 0 };
  }

  open(server: FormDraft) {
    if (!this.queue.edits.length) this.queue = DraftAutosave.empty(server);
    else if (
      this.queue.recovery ||
      this.queue.request ||
      !this.sameLocal(server) ||
      this.queue.base.version !== server.version
    ) {
      this.remote = server;
      this.show("recovery");
      return;
    } else {
      this.show("saving");
      void this.flush();
      return;
    }
    this.show(this.ports.online() ? "saved" : "offline");
  }

  private sameLocal(server: FormDraft) {
    return (
      canonicalSurvey(this.localDocument) === canonicalSurvey(server.jsonData)
    );
  }

  get localDocument() {
    return this.queue.edits.at(-1)?.jsonData ?? this.queue.base.jsonData;
  }

  get isSaved() {
    return this.status === "saved" && !this.queue.edits.length;
  }
  get serverMoved() {
    return (
      !!this.remote && this.remote.contentHash !== this.queue.base.contentHash
    );
  }

  private show(status: DraftStatus, message?: string) {
    this.status = status;
    if (!this.closed)
      this.ports.change({
        status,
        message,
        head: this.remote ?? this.queue.base,
        count: this.queue.edits.length,
      });
  }

  private persist() {
    const snapshot = this.queue;
    this.stored = this.stored
      .catch(() => {})
      .then(() => this.ports.persist(snapshot));
    void this.stored.catch(() =>
      this.show("error", "Could not keep changes on this device."),
    );
    return this.stored;
  }

  edit(jsonData: string, records: LocalEdit["records"] = []) {
    if (this.closed || this.remote) return;
    if (!records.length && jsonData === this.localDocument) return;
    const edits = [...this.queue.edits];
    const last = edits.at(-1);
    const merge =
      last &&
      last.saveNo > this.queue.sealed &&
      !!last.records.length === !!records.length;
    const saveNo = merge ? last.saveNo : this.queue.next;
    if (merge) edits.pop();
    edits.push({
      saveNo,
      jsonData,
      records: merge ? [...last.records, ...records] : records,
    });
    this.queue = { ...this.queue, edits, next: saveNo + 1 };
    const persisted = this.persist();
    if (this.status !== "auth") this.show("saving");
    void persisted.then(
      () => {
        if (!this.ports.online() && !this.remote) this.show("offline");
      },
      () => {},
    );
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 1500);
  }

  flush(): Promise<void> {
    clearTimeout(this.timer);
    this.queue = { ...this.queue, sealed: this.queue.next - 1 };
    if (this.sending) return this.sending;
    this.sending = this.drain()
      .catch(() =>
        this.show(
          "error",
          "Draft could not be saved. Retry to keep your changes.",
        ),
      )
      .finally(() => {
        this.sending = undefined;
      });
    return this.sending;
  }

  private async drain() {
    while (!this.closed && !this.remote && this.queue.edits.length) {
      const edit = this.queue.edits[0];
      if (edit.saveNo > this.queue.sealed) return;
      await this.persist();
      if (!this.ports.online()) return this.show("offline");
      if (this.status === "auth") return;
      if (!(await this.sendFirst(edit))) return;
    }
    if (!this.remote && !this.queue.edits.length)
      this.show(this.ports.online() ? "saved" : "offline");
  }

  private async prepare(edit: LocalEdit) {
    const { base } = this.queue;
    const batch = edit.records.length
      ? await journalBatch(this.ports.sessionId, edit, base)
      : undefined;
    return { version: base.version, jsonData: edit.jsonData, batch };
  }

  private async sendFirst(edit: LocalEdit) {
    const retry = !!this.queue.request;
    let request: DraftWrite;
    try {
      request = this.queue.request ?? (await this.prepare(edit));
    } catch {
      this.queue = { ...this.queue, recovery: true };
      await this.persist();
      this.remote = this.queue.base;
      this.show(
        "recovery",
        "The changes could not be replayed. Your local copy is available.",
      );
      return false;
    }
    this.queue = { ...this.queue, request };
    await this.persist();
    const result = await this.ports
      .send(request)
      .catch(
        () =>
          ({
            kind: "offline",
            message: "Could not reach the server.",
          }) as const,
      );
    return this.applyResult(result, retry);
  }

  private async applyResult(result: WriteResult, retry: boolean) {
    if (result.kind === "saved") {
      this.queue = {
        ...this.queue,
        request: undefined,
        base: result.head,
        edits: this.queue.edits.slice(1),
      };
      await this.persist();
      return true;
    }
    if (result.kind === "stale") {
      if (
        !retry &&
        !result.acknowledged &&
        result.head.contentHash === this.queue.base.contentHash
      ) {
        this.queue = { ...this.queue, base: result.head, request: undefined };
        await this.persist();
        return true;
      }
      this.remote = result.head;
      this.show("conflict");
    } else if ("message" in result) {
      if (result.kind === "auth") {
        this.queue = { ...this.queue, request: undefined };
        await this.persist();
      }
      this.show(result.kind, result.message);
    }
    return false;
  }

  async resolve(keepLocal: boolean) {
    const remote = this.remote;
    if (!remote) return;
    const json = this.localDocument;
    const resume =
      keepLocal &&
      !this.queue.recovery &&
      !this.queue.request &&
      this.queue.base.contentHash === remote.contentHash;
    if (resume) this.queue = { ...this.queue, base: remote };
    else this.queue = DraftAutosave.empty(remote);
    this.remote = undefined;
    this.show("saving");
    if (keepLocal && !resume) this.edit(json);
    await this.persist();
    this.ports.load(keepLocal ? json : remote.jsonData);
    await this.flush();
  }

  async resume() {
    if (this.status === "auth" || this.status === "error") this.show("saving");
    await this.flush();
  }

  async close() {
    this.closed = true;
    clearTimeout(this.timer);
    await this.sending;
    await this.stored;
  }
}
