import { Uri } from "vscode";
import * as path from "path";
import { appendTextFile, exists, ensureDirectory, ensureFile, readJsonFile, readTextFile, writeJsonFile } from "./fileSystem";
import { getSshWorkspacePaths, SshWorkspacePaths } from "./paths";
import { notesTemplate, systemStatusTemplate } from "./templates";
import {
  createDefaultWorkspaceData,
  createEmptySystemInfo,
  TrackedFileExtraCommand,
  TrackedFile,
  WorkspaceData
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

function normalizeWorkspaceData(raw: Partial<WorkspaceData> | undefined): WorkspaceData {
  const fallback = createDefaultWorkspaceData();
  const server = raw?.server ?? createEmptySystemInfo();

  return {
    version: "0.1",
    server: {
      ...fallback.server,
      ...server
    },
    trackedFiles: Array.isArray(raw?.trackedFiles) ? raw.trackedFiles.map((file) => normalizeTrackedFile(file as TrackedFile)) : [],
    changeLog: Array.isArray(raw?.changeLog) ? raw.changeLog : []
  };
}

export class WorkspaceStore {
  public readonly paths: SshWorkspacePaths = getSshWorkspacePaths();

  public isInternalPath(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    return [this.paths.systemStatus, this.paths.notes, this.paths.data].some(
      (internalPath) => path.resolve(internalPath) === resolvedPath
    );
  }

  private sanitize(data: WorkspaceData): WorkspaceData {
    return {
      ...data,
      trackedFiles: data.trackedFiles.filter((file) => !this.isInternalPath(file.path)),
      changeLog: data.changeLog.filter((entry) => !this.isInternalPath(entry.path))
    };
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
    await ensureFile(this.paths.data, `${JSON.stringify(createDefaultWorkspaceData(), null, 2)}\n`);
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
    return this.sanitize(normalizeWorkspaceData(raw));
  }

  public async save(data: WorkspaceData): Promise<void> {
    await writeJsonFile(this.paths.data, this.sanitize(normalizeWorkspaceData(data)));
  }

  public async addNote(note: string): Promise<void> {
    await ensureFile(this.paths.notes, notesTemplate);
    await appendTextFile(this.paths.notes, `\n- ${note}\n`);
  }

  public async readNotes(): Promise<string[]> {
    if (!(await exists(this.paths.notes))) {
      return [];
    }

    const content = await readTextFile(this.paths.notes);
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && line !== "# Notizen")
      .slice(-8)
      .reverse();
  }

  public notesUri(): Uri {
    return Uri.file(this.paths.notes);
  }

  public systemStatusUri(): Uri {
    return Uri.file(this.paths.systemStatus);
  }
}
