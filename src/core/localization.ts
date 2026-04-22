import * as vscode from "vscode";

type Language = "de" | "en";

const translations = {
  de: {
    actionInitialize: "Initialisieren",
    actionRefresh: "Aktualisieren",
    actionTrackPath: "Pfad tracken",
    actionTrackCurrentFile: "Aktuelle Datei tracken",
    actionAddNote: "Notiz hinzufuegen",
    actionRecreateData: "Daten neu erstellen",
    workList: "Arbeitsliste",
    rawLog: "Rohlog",
    noTrackedFiles: "Keine Dateien getrackt",
    noRawLog: "Kein Rohlog",
    notInitialized: "Noch nicht initialisiert",
    initializeHint: "Aktionen > Initialisieren",
    errorLoading: "Fehler beim Laden",
    displayName: "Klarname",
    path: "Pfad",
    lastChanged: "Letzte Aenderung",
    comment: "Kommentar",
    fileMissing: "Status: Datei nicht gefunden",
    changes: "Aenderungen",
    notesFile: "NOTIZEN.md",
    systemStatusFile: "SYSTEMSTATUS.md",
    hostname: "Hostname",
    osName: "OS-Name",
    osVersion: "OS-Version",
    kernel: "Kernel",
    architecture: "Architektur",
    mainIp: "Haupt-IP",
    lastRefresh: "Letzter Refresh",
    warningNotInitialized: "Server Workspace ist noch nicht initialisiert.",
    warningInitializeFirst: "Bitte zuerst Server Workspace initialisieren.",
    initialized: "Server Workspace wurde initialisiert: {path}",
    refreshed: "Server Workspace wurde aktualisiert.",
    recreateQuestion:
      "workspace-data.json neu erstellen? Arbeitsliste und Rohlog werden geloescht. SYSTEMSTATUS.md und NOTIZEN.md bleiben erhalten.",
    recreateConfirm: "Neu erstellen",
    recreated: "workspace-data.json wurde neu erstellt.",
    addNotePrompt: "Wird direkt an NOTIZEN.md angehaengt",
    emptyNote: "Notiz ist leer.",
    noteAdded: "Notiz hinzugefuegt.",
    noFileSelected: "Keine Datei ausgewaehlt.",
    noPathSelected: "Kein Pfad ausgewaehlt.",
    fileNoLongerExists: "Datei existiert nicht mehr: {path}",
    noEditorFile: "Keine lokale Remote-Datei im aktiven Editor.",
    internalFileNotTracked: "Interne Server-Workspace-Dateien werden nicht in der Arbeitsliste getrackt.",
    fileTracked: "Datei wird getrackt: {path}",
    trackPathPrompt: "Absoluter Pfad auf dem verbundenen Remote-Host",
    pathRequired: "Pfad ist erforderlich.",
    absolutePathRequired: "Bitte einen absoluten Pfad angeben.",
    pathRecordedMissing: "Pfad wurde aufgenommen, Datei existiert aber nicht: {path}",
    pathTracked: "Pfad wird getrackt: {path}",
    fileNotTracked: "Datei ist noch nicht getrackt.",
    editComment: "Kommentar bearbeiten",
    editDisplayName: "Klarname bearbeiten",
    pathCopied: "Pfad kopiert.",
    metadataUpdated: "Metadaten aktualisiert.",
    open: "Oeffnen"
  },
  en: {
    actionInitialize: "Initialize",
    actionRefresh: "Refresh",
    actionTrackPath: "Track Path",
    actionTrackCurrentFile: "Track Current File",
    actionAddNote: "Add Note",
    actionRecreateData: "Recreate Data",
    workList: "Work List",
    rawLog: "Raw Log",
    noTrackedFiles: "No tracked files",
    noRawLog: "No raw log",
    notInitialized: "Not initialized yet",
    initializeHint: "Actions > Initialize",
    errorLoading: "Error while loading",
    displayName: "Display name",
    path: "Path",
    lastChanged: "Last change",
    comment: "Comment",
    fileMissing: "Status: file not found",
    changes: "changes",
    notesFile: "NOTIZEN.md",
    systemStatusFile: "SYSTEMSTATUS.md",
    hostname: "Hostname",
    osName: "OS name",
    osVersion: "OS version",
    kernel: "Kernel",
    architecture: "Architecture",
    mainIp: "Main IP",
    lastRefresh: "Last refresh",
    warningNotInitialized: "Server Workspace is not initialized yet.",
    warningInitializeFirst: "Please initialize Server Workspace first.",
    initialized: "Server Workspace initialized: {path}",
    refreshed: "Server Workspace refreshed.",
    recreateQuestion:
      "Recreate workspace-data.json? Work list and raw log will be deleted. SYSTEMSTATUS.md and NOTIZEN.md will be kept.",
    recreateConfirm: "Recreate",
    recreated: "workspace-data.json was recreated.",
    addNotePrompt: "Appends directly to NOTIZEN.md",
    emptyNote: "Note is empty.",
    noteAdded: "Note added.",
    noFileSelected: "No file selected.",
    noPathSelected: "No path selected.",
    fileNoLongerExists: "File no longer exists: {path}",
    noEditorFile: "No local remote file in the active editor.",
    internalFileNotTracked: "Internal Server Workspace files are not tracked in the work list.",
    fileTracked: "File is tracked: {path}",
    trackPathPrompt: "Absolute path on the connected remote host",
    pathRequired: "Path is required.",
    absolutePathRequired: "Please enter an absolute path.",
    pathRecordedMissing: "Path was recorded, but the file does not exist: {path}",
    pathTracked: "Path is tracked: {path}",
    fileNotTracked: "File is not tracked yet.",
    editComment: "Edit Comment",
    editDisplayName: "Edit Display Name",
    pathCopied: "Path copied.",
    metadataUpdated: "Metadata updated.",
    open: "Open"
  }
} as const;

type TranslationKey = keyof typeof translations.de;

export function getLanguage(): Language {
  const configured = vscode.workspace.getConfiguration("serverWorkspace").get<string>("language", "de");
  return configured === "en" ? "en" : "de";
}

export function t(key: TranslationKey, values: Record<string, string> = {}): string {
  let text: string = translations[getLanguage()][key] ?? translations.de[key];

  for (const [name, value] of Object.entries(values)) {
    text = text.split(`{${name}}`).join(value);
  }

  return text;
}
