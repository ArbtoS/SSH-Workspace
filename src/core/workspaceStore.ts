import { Uri } from "vscode";
import * as path from "path";
import {
  deleteFile,
  ensureDirectory,
  ensureFile,
  exists,
  readJsonFile,
  writeJsonFile,
  writeTextFile
} from "./fileSystem";
import { getSshWorkspacePaths, SshWorkspacePaths } from "./paths";
import { notesTemplate, systemStatusTemplate } from "./templates";
import {
  createDefaultWorkspaceData,
  createEmptySystemInfo,
  TrackedFile,
  TrackedFileExtraCommand,
  WorkspaceCommand,
  WorkspaceCommandRun,
  WorkspaceData,
  WorkspaceNote
} from "./types";

function normalizeExtraCommand(raw: TrackedFileExtraCommand): TrackedFileExtraCommand | undefined {
  const label = raw.label?.trim();
  const command = raw.command?.trim();
  if (!label || !command) {
    return undefined;
  }

  return {
    id: raw.id?.trim() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    command
  };
}

function normalizeTrackedFile(raw: TrackedFile): TrackedFile {
  return {
    ...raw,
    controlCommands: raw.controlCommands
      ? {
          serviceName: raw.controlCommands.serviceName?.trim() || undefined,
          start: raw.controlCommands.start?.trim() || undefined,
          stop: raw.controlCommands.stop?.trim() || undefined,
          restart: raw.controlCommands.restart?.trim() || undefined,
          status: raw.controlCommands.status?.trim() || undefined
        }
      : undefined,
    extraCommands: Array.isArray(raw.extraCommands)
      ? raw.extraCommands
          .map((command) => normalizeExtraCommand(command as TrackedFileExtraCommand))
          .filter((command): command is TrackedFileExtraCommand => Boolean(command))
      : []
  };
}

function compareNotePath(left: WorkspaceNote, right: WorkspaceNote): number {
  if (typeof left.sortOrder === "number" && typeof right.sortOrder === "number") {
    return left.sortOrder - right.sortOrder;
  }
  if (typeof left.sortOrder === "number") {
    return -1;
  }
  if (typeof right.sortOrder === "number") {
    return 1;
  }
  return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
}

function compareSavedCommand(left: WorkspaceCommand, right: WorkspaceCommand): number {
  if (typeof left.sortOrder === "number" && typeof right.sortOrder === "number") {
    return left.sortOrder - right.sortOrder;
  }
  if (typeof left.sortOrder === "number") {
    return -1;
  }
  if (typeof right.sortOrder === "number") {
    return 1;
  }
  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

function compareSavedCommandRun(left: WorkspaceCommandRun, right: WorkspaceCommandRun): number {
  return Date.parse(right.finishedAt) - Date.parse(left.finishedAt);
}

function slugifyNoteTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export class WorkspaceStore {
  public readonly paths: SshWorkspacePaths = getSshWorkspacePaths();

  private createGeneralNote(): WorkspaceNote {
    return {
      path: this.paths.notes,
      title: "NOTIZEN.md",
      sortOrder: 0
    };
  }

  private normalizeNotes(rawNotes: unknown): WorkspaceNote[] {
    const notes: WorkspaceNote[] = [];

    if (Array.isArray(rawNotes)) {
      for (const raw of rawNotes) {
        if (!raw || typeof raw !== "object") {
          continue;
        }

        const candidate = raw as Partial<WorkspaceNote>;
        const notePath = candidate.path?.trim();
        const title = candidate.title?.trim();
        if (!notePath || !title) {
          continue;
        }

        notes.push({
          path: notePath,
          title,
          sortOrder: typeof candidate.sortOrder === "number" ? candidate.sortOrder : undefined
        });
      }
    }

    const deduplicated = new Map<string, WorkspaceNote>();
    deduplicated.set(path.resolve(this.paths.notes), this.createGeneralNote());

    for (const note of notes) {
      deduplicated.set(path.resolve(note.path), note);
    }

    return [...deduplicated.values()]
      .sort(compareNotePath)
      .map((note, index) => ({ ...note, sortOrder: index }));
  }

  private normalizeSavedCommands(rawCommands: unknown): WorkspaceCommand[] {
    const commands: WorkspaceCommand[] = [];

    if (Array.isArray(rawCommands)) {
      for (const raw of rawCommands) {
        if (!raw || typeof raw !== "object") {
          continue;
        }

        const candidate = raw as Partial<WorkspaceCommand>;
        const name = candidate.name?.trim();
        const command = candidate.command?.trim();
        if (!name || !command) {
          continue;
        }

        commands.push({
          id: candidate.id?.trim() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name,
          command,
          note: candidate.note?.trim() || "",
          sortOrder: typeof candidate.sortOrder === "number" ? candidate.sortOrder : undefined
        });
      }
    }

    return commands
      .sort(compareSavedCommand)
      .map((entry, index) => ({ ...entry, sortOrder: index }));
  }

  private normalizeSavedCommandRuns(rawRuns: unknown): WorkspaceCommandRun[] {
    const runs: WorkspaceCommandRun[] = [];

    if (Array.isArray(rawRuns)) {
      for (const raw of rawRuns) {
        if (!raw || typeof raw !== "object") {
          continue;
        }

        const candidate = raw as Partial<WorkspaceCommandRun>;
        const savedCommandId = candidate.savedCommandId?.trim();
        const name = candidate.name?.trim();
        const command = candidate.command?.trim();
        const startedAt = candidate.startedAt?.trim();
        const finishedAt = candidate.finishedAt?.trim();
        if (!savedCommandId || !name || !command || !startedAt || !finishedAt) {
          continue;
        }

        runs.push({
          id: candidate.id?.trim() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          savedCommandId,
          name,
          command,
          startedAt,
          finishedAt,
          exitCode: typeof candidate.exitCode === "number" ? candidate.exitCode : null,
          success: Boolean(candidate.success),
          output: candidate.output?.trim() || ""
        });
      }
    }

    return runs.sort(compareSavedCommandRun).slice(0, 10);
  }

  private normalizeWorkspaceData(raw: Partial<WorkspaceData> | undefined): WorkspaceData {
    const fallback = createDefaultWorkspaceData();
    const server = raw?.server ?? createEmptySystemInfo();

    return {
      version: "0.1",
      server: {
        ...fallback.server,
        ...server
      },
      trackedFiles: Array.isArray(raw?.trackedFiles)
        ? raw.trackedFiles.map((file) => normalizeTrackedFile(file as TrackedFile))
        : [],
      changeLog: Array.isArray(raw?.changeLog) ? raw.changeLog : [],
      notes: this.normalizeNotes(raw?.notes),
      savedCommands: this.normalizeSavedCommands(raw?.savedCommands),
      savedCommandRuns: this.normalizeSavedCommandRuns(raw?.savedCommandRuns)
    };
  }

  private sanitize(data: WorkspaceData): WorkspaceData {
    const normalized = this.normalizeWorkspaceData(data);

    return {
      ...normalized,
      trackedFiles: normalized.trackedFiles.filter((file) => !this.isInternalPath(file.path)),
      changeLog: normalized.changeLog.filter((entry) => !this.isInternalPath(entry.path))
    };
  }

  public isInternalPath(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    if (
      resolvedPath === path.resolve(this.paths.systemStatus) ||
      resolvedPath === path.resolve(this.paths.notes) ||
      resolvedPath === path.resolve(this.paths.data)
    ) {
      return true;
    }

    const notesDirectory = `${path.resolve(this.paths.notesDirectory)}${path.sep}`;
    return resolvedPath.startsWith(notesDirectory);
  }

  public async isInitialized(): Promise<boolean> {
    return (
      (await exists(this.paths.directory)) &&
      (await exists(this.paths.systemStatus)) &&
      (await exists(this.paths.notes)) &&
      (await exists(this.paths.data))
    );
  }

  public async initialize(): Promise<void> {
    await ensureDirectory(this.paths.directory);
    await ensureFile(this.paths.systemStatus, systemStatusTemplate);
    await ensureFile(this.paths.notes, notesTemplate);
    await ensureFile(this.paths.data, `${JSON.stringify(this.sanitize(createDefaultWorkspaceData()), null, 2)}\n`);
  }

  public async recreateData(data: WorkspaceData = createDefaultWorkspaceData()): Promise<void> {
    await ensureDirectory(this.paths.directory);
    await this.save(data);
  }

  public async load(): Promise<WorkspaceData | undefined> {
    if (!(await exists(this.paths.data))) {
      return undefined;
    }

    const raw = await readJsonFile<Partial<WorkspaceData>>(this.paths.data);
    return this.sanitize(this.normalizeWorkspaceData(raw));
  }

  public async save(data: WorkspaceData): Promise<void> {
    await writeJsonFile(this.paths.data, this.sanitize(data));
  }

  public listNotes(data: WorkspaceData): WorkspaceNote[] {
    return this.normalizeNotes(data.notes);
  }

  public async createNote(data: WorkspaceData, title: string): Promise<WorkspaceNote> {
    const cleanTitle = title.trim();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const slug = slugifyNoteTitle(cleanTitle) || "notiz";
    const filePath = path.join(this.paths.notesDirectory, `${stamp}-${slug}.md`);

    await ensureDirectory(this.paths.notesDirectory);
    await writeTextFile(filePath, `# ${cleanTitle}\n\n`);

    const notes = this.normalizeNotes(data.notes);
    const note: WorkspaceNote = {
      path: filePath,
      title: cleanTitle,
      sortOrder: notes.length
    };

    data.notes = this.normalizeNotes([...notes, note]);
    return note;
  }

  public async deleteNote(data: WorkspaceData, notePath: string): Promise<boolean> {
    const resolvedPath = path.resolve(notePath);
    if (resolvedPath === path.resolve(this.paths.notes)) {
      return false;
    }

    if (await exists(notePath)) {
      await deleteFile(notePath);
    }

    data.notes = this.normalizeNotes(data.notes.filter((note) => path.resolve(note.path) !== resolvedPath));
    return true;
  }

  public reorderNotes(data: WorkspaceData, draggedPaths: string[], targetPath?: string): void {
    const draggedSet = new Set(draggedPaths.map((notePath) => path.resolve(notePath)));
    const current = this.listNotes(data);
    const moving = current.filter((note) => draggedSet.has(path.resolve(note.path)));
    const remaining = current.filter((note) => !draggedSet.has(path.resolve(note.path)));
    const targetIndex = targetPath
      ? remaining.findIndex((note) => path.resolve(note.path) === path.resolve(targetPath))
      : remaining.length;
    const insertIndex = targetIndex >= 0 ? targetIndex : remaining.length;

    data.notes = [
      ...remaining.slice(0, insertIndex),
      ...moving,
      ...remaining.slice(insertIndex)
    ].map((note, index) => ({
      ...note,
      sortOrder: index
    }));
  }

  public listSavedCommands(data: WorkspaceData): WorkspaceCommand[] {
    return this.normalizeSavedCommands(data.savedCommands);
  }

  public addSavedCommand(data: WorkspaceData, input: { name: string; command: string; note?: string }): WorkspaceCommand {
    const commands = this.listSavedCommands(data);
    const savedCommand: WorkspaceCommand = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: input.name.trim(),
      command: input.command.trim(),
      note: input.note?.trim() || "",
      sortOrder: commands.length
    };

    data.savedCommands = this.normalizeSavedCommands([...commands, savedCommand]);
    return savedCommand;
  }

  public updateSavedCommand(
    data: WorkspaceData,
    commandId: string,
    input: { name: string; command: string; note?: string }
  ): WorkspaceCommand | undefined {
    const commands = this.listSavedCommands(data);
    const index = commands.findIndex((entry) => entry.id === commandId);
    if (index < 0) {
      return undefined;
    }

    const next: WorkspaceCommand = {
      ...commands[index],
      name: input.name.trim(),
      command: input.command.trim(),
      note: input.note?.trim() || ""
    };

    commands[index] = next;
    data.savedCommands = this.normalizeSavedCommands(commands);
    return next;
  }

  public duplicateSavedCommand(data: WorkspaceData, commandId: string): WorkspaceCommand | undefined {
    const commands = this.listSavedCommands(data);
    const original = commands.find((entry) => entry.id === commandId);
    if (!original) {
      return undefined;
    }

    const duplicate: WorkspaceCommand = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: `${original.name} Kopie`,
      command: original.command,
      note: original.note,
      sortOrder: commands.length
    };

    data.savedCommands = this.normalizeSavedCommands([...commands, duplicate]);
    return duplicate;
  }

  public listSavedCommandRuns(data: WorkspaceData): WorkspaceCommandRun[] {
    return this.normalizeSavedCommandRuns(data.savedCommandRuns);
  }

  public addSavedCommandRun(data: WorkspaceData, run: Omit<WorkspaceCommandRun, "id">): WorkspaceCommandRun {
    const next: WorkspaceCommandRun = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...run,
      output: run.output.trim()
    };

    const current = this.listSavedCommandRuns(data);
    data.savedCommandRuns = [next, ...current].slice(0, 10);
    return next;
  }

  public removeSavedCommand(data: WorkspaceData, commandId: string): boolean {
    const commands = this.listSavedCommands(data);
    const next = commands.filter((entry) => entry.id !== commandId);
    if (next.length === commands.length) {
      return false;
    }

    data.savedCommands = this.normalizeSavedCommands(next);
    data.savedCommandRuns = this.normalizeSavedCommandRuns(
      data.savedCommandRuns.filter((run) => run.savedCommandId !== commandId)
    );
    return true;
  }

  public reorderSavedCommands(data: WorkspaceData, draggedIds: string[], targetId?: string): void {
    const draggedSet = new Set(draggedIds);
    const current = this.listSavedCommands(data);
    const moving = current.filter((entry) => draggedSet.has(entry.id));
    const remaining = current.filter((entry) => !draggedSet.has(entry.id));
    const targetIndex = targetId ? remaining.findIndex((entry) => entry.id === targetId) : remaining.length;
    const insertIndex = targetIndex >= 0 ? targetIndex : remaining.length;

    data.savedCommands = [
      ...remaining.slice(0, insertIndex),
      ...moving,
      ...remaining.slice(insertIndex)
    ].map((entry, index) => ({
      ...entry,
      sortOrder: index
    }));
  }

  public notesUri(filePath?: string): Uri {
    return Uri.file(filePath || this.paths.notes);
  }

  public systemStatusUri(): Uri {
    return Uri.file(this.paths.systemStatus);
  }
}
