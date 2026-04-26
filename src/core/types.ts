export interface ServerSystemInfo {
  hostname: string;
  osName: string;
  osVersion: string;
  kernel: string;
  architecture: string;
  mainIp: string;
  lastRefreshAt: string;
}

export interface TrackedFileControlCommands {
  serviceName?: string;
  start?: string;
  stop?: string;
  restart?: string;
  status?: string;
}

export interface TrackedFileExtraCommand {
  id: string;
  label: string;
  command: string;
}

export interface WorkspaceNote {
  path: string;
  title: string;
  sortOrder?: number;
}

export interface WorkspaceCommand {
  id: string;
  name: string;
  command: string;
  note: string;
  sortOrder?: number;
}

export interface WorkspaceCommandRun {
  id: string;
  savedCommandId: string;
  name: string;
  command: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  success: boolean;
  output: string;
}

export interface TrackedFile {
  path: string;
  name: string;
  displayName?: string;
  sortOrder?: number;
  owner: string;
  group: string;
  mode: string;
  lastModifiedAt: string;
  firstSeenAt: string;
  changeCount: number;
  comment: string;
  controlCommands?: TrackedFileControlCommands;
  extraCommands?: TrackedFileExtraCommand[];
  exists: boolean;
}

export interface ChangeLogEntry {
  path: string;
  timestamp: string;
}

export interface WorkspaceData {
  version: "0.1";
  server: ServerSystemInfo;
  trackedFiles: TrackedFile[];
  changeLog: ChangeLogEntry[];
  notes: WorkspaceNote[];
  savedCommands: WorkspaceCommand[];
  savedCommandRuns: WorkspaceCommandRun[];
}

export function createEmptySystemInfo(): ServerSystemInfo {
  return {
    hostname: "",
    osName: "",
    osVersion: "",
    kernel: "",
    architecture: "",
    mainIp: "",
    lastRefreshAt: ""
  };
}

export function createDefaultWorkspaceData(): WorkspaceData {
  return {
    version: "0.1",
    server: createEmptySystemInfo(),
    trackedFiles: [],
    changeLog: [],
    notes: [],
    savedCommands: [],
    savedCommandRuns: []
  };
}
