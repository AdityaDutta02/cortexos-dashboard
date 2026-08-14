/** Search and the note CRUD surface. */

import type { DataSource, Note, NoteRef, Page, SearchQuery, SearchResult } from "cortexos-types";

import { SEARCH_HITS } from "../fixtures/search";
import { NOTES, NOTE_REFS } from "../fixtures/vault";
import { err, settle } from "./options";

export const searchMock: Pick<DataSource, "search"> = {
  async search(query: SearchQuery): Promise<SearchResult> {
    return settle("search", () => {
      const q = query.query.trim().toLowerCase();
      const hits = SEARCH_HITS.filter(
        (h) =>
          (!q || h.title.toLowerCase().includes(q) || h.snippet.toLowerCase().includes(q)) &&
          (query.tier === undefined || h.tier === query.tier) &&
          (!query.pathPrefix || h.path.startsWith(query.pathPrefix)),
      ).slice(0, query.limit ?? 20);
      return { hits, tookMs: 11 + Math.round(Math.random() * 20), degraded: false };
    });
  },
};

export const notesMock: Pick<
  DataSource,
  "listNotes" | "readNote" | "writeNote" | "createNote" | "renameNote" | "deleteNote"
> = {
  async listNotes(prefix?: string, cursor?: string): Promise<Page<NoteRef>> {
    void cursor;
    return settle("notes", () => ({
      items: NOTE_REFS.filter((n) => !prefix || n.path.startsWith(prefix)),
      total: NOTE_REFS.length,
    }));
  },

  async readNote(path: string): Promise<Note> {
    return settle("notes", () => {
      const note = NOTES.find((n) => n.path === path);
      if (!note) throw err("not_found", `No note at ${path}`);
      return note;
    });
  },

  async writeNote(path: string, content: string): Promise<{ sha: string }> {
    void path;
    void content;
    return settle("notes", { sha: `w${Date.now().toString(36)}` });
  },

  async createNote(path: string, content: string): Promise<{ sha: string; path: string }> {
    void content;
    return settle("notes", { sha: `c${Date.now().toString(36)}`, path });
  },

  async renameNote(from: string, to: string): Promise<{ sha: string; path: string }> {
    void from;
    return settle("notes", { sha: `r${Date.now().toString(36)}`, path: to });
  },

  async deleteNote(path: string): Promise<{ sha: string }> {
    void path;
    return settle("notes", { sha: `d${Date.now().toString(36)}` });
  },
};
