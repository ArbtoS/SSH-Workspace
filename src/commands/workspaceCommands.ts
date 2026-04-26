import * as path from "path";
import { exec } from "child_process";
import * as vscode from "vscode";
import { resolveControlCommand } from "../core/controlCommands";
import {
  addTrackedFileExtraCommand,
  removeTrackedFileExtraCommand,
  setTrackedFileControlCommands,
  updateTrackedFileMetadata,
  refreshTrackedFiles,
  setTrackedFileComment,
  setTrackedFileDisplayName
} from "../core/fileMetadata";
import { toLocalIsoString } from "../core/dateUtils";
import { t } from "../core/localization";
import { readSystemInfo } from "../core/systemInfo";
import { createDefaultWorkspaceData } from "../core/types";
import { WorkspaceStore } from "../core/workspaceStore";
import { extractExtraCommandId, extractFilePath, extractSavedCommandId } from "./commandUtils";

export interface RefreshableViews {
  refreshAll(): void;
}

async function loadRequiredData(store: WorkspaceStore) {
  const data = await store.load();
  if (!data) {
    vscode.window.showWarningMessage(t("warningNotInitialized"));
    return undefined;
  }

  return data;
}

export async function initializeWorkspace(store: WorkspaceStore, views: RefreshableViews): Promise<void> {
  await store.initialize();
  views.refreshAll();
  vscode.window.showInformationMessage(t("initialized", { path: store.paths.directory }));
}

export async function refreshWorkspace(store: WorkspaceStore, views: RefreshableViews): Promise<void> {
  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  data.server = await readSystemInfo();
  await refreshTrackedFiles(data);
  await store.save(data);
  views.refreshAll();
  vscode.window.showInformationMessage(t("refreshed"));
}

export async function recreateWorkspaceData(store: WorkspaceStore, views: RefreshableViews): Promise<void> {
  if (!(await store.isInitialized())) {
    vscode.window.showWarningMessage(t("warningInitializeFirst"));
    return;
  }

  const confirmation = await vscode.window.showWarningMessage(
    t("recreateQuestion"),
    { modal: true },
    t("recreateConfirm")
  );

  if (confirmation !== t("recreateConfirm")) {
    return;
  }

  const data = createDefaultWorkspaceData();
  data.server = await readSystemInfo();
  await store.recreateData(data);
  views.refreshAll();
  vscode.window.showInformationMessage(t("recreated"));
}

export async function openNotes(store: WorkspaceStore, input?: unknown): Promise<void> {
  if (!(await store.isInitialized())) {
    vscode.window.showWarningMessage(t("warningInitializeFirst"));
    return;
  }

  const filePath = extractFilePath(input);
  await vscode.window.showTextDocument(store.notesUri(filePath), { preview: false });
}

export async function addNote(store: WorkspaceStore, views: RefreshableViews): Promise<void> {
  if (!(await store.isInitialized())) {
    vscode.window.showWarningMessage(t("warningInitializeFirst"));
    return;
  }

  const title = await vscode.window.showInputBox({
    title: t("actionAddNote"),
    prompt: t("addNotePrompt"),
    placeHolder: t("addNotePlaceholder"),
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim() ? undefined : t("emptyNote"))
  });

  if (title === undefined) {
    return;
  }

  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  const note = await store.createNote(data, title.trim());
  await store.save(data);
  views.refreshAll();
  await vscode.window.showTextDocument(store.notesUri(note.path), { preview: false });
  vscode.window.showInformationMessage(t("noteAdded", { title: note.title }));
}

export async function deleteNote(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const notePath = extractFilePath(input);
  if (!notePath) {
    vscode.window.showWarningMessage(t("noNoteSelected"));
    return;
  }

  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  const note = store.listNotes(data).find((entry) => path.resolve(entry.path) === path.resolve(notePath));
  if (!note) {
    vscode.window.showWarningMessage(t("noNoteSelected"));
    return;
  }

  if (path.resolve(note.path) === path.resolve(store.paths.notes)) {
    vscode.window.showWarningMessage(t("deleteGeneralNoteBlocked"));
    return;
  }

  const confirmation = await vscode.window.showWarningMessage(
    t("deleteNoteQuestion", { title: note.title }),
    { modal: true },
    t("deleteNoteConfirm")
  );

  if (confirmation !== t("deleteNoteConfirm")) {
    return;
  }

  await store.deleteNote(data, note.path);
  await store.save(data);
  views.refreshAll();
  vscode.window.showInformationMessage(t("noteDeleted", { title: note.title }));
}

export async function openSystemStatus(store: WorkspaceStore): Promise<void> {
  if (!(await store.isInitialized())) {
    vscode.window.showWarningMessage(t("warningInitializeFirst"));
    return;
  }

  await vscode.window.showTextDocument(store.systemStatusUri(), { preview: false });
}

export async function openTrackedFile(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const filePath = extractFilePath(input);
  if (!filePath) {
    vscode.window.showWarningMessage(t("noFileSelected"));
    return;
  }

  if (store.isInternalPath(filePath)) {
    await vscode.window.showTextDocument(vscode.Uri.file(filePath), { preview: false });
    return;
  }

  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  const trackedFile = await updateTrackedFileMetadata(data, filePath);
  await store.save(data);
  views.refreshAll();

  if (!trackedFile.exists) {
    vscode.window.showWarningMessage(t("fileNoLongerExists", { path: trackedFile.path }));
    return;
  }

  await vscode.window.showTextDocument(vscode.Uri.file(trackedFile.path), { preview: false });
}

export async function trackCurrentFile(store: WorkspaceStore, views: RefreshableViews): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.uri.scheme !== "file") {
    vscode.window.showWarningMessage(t("noEditorFile"));
    return;
  }

  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  if (store.isInternalPath(editor.document.uri.fsPath)) {
    vscode.window.showWarningMessage(t("internalFileNotTracked"));
    return;
  }

  const trackedFile = await updateTrackedFileMetadata(data, editor.document.uri.fsPath);
  await store.save(data);
  views.refreshAll();
  vscode.window.showInformationMessage(t("fileTracked", { path: trackedFile.path }));
}

export async function trackPath(store: WorkspaceStore, views: RefreshableViews): Promise<void> {
  const filePath = await vscode.window.showInputBox({
    title: t("actionTrackPath"),
    prompt: t("trackPathPrompt"),
    placeHolder: "/etc/systemd/system/hostapd-healthcheck.timer",
    ignoreFocusOut: true,
    validateInput: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return t("pathRequired");
      }

      return path.isAbsolute(trimmed) ? undefined : t("absolutePathRequired");
    }
  });

  if (filePath === undefined) {
    return;
  }

  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  if (store.isInternalPath(filePath.trim())) {
    vscode.window.showWarningMessage(t("internalFileNotTracked"));
    return;
  }

  const trackedFile = await updateTrackedFileMetadata(data, filePath.trim());
  await store.save(data);
  views.refreshAll();

  if (!trackedFile.exists) {
    vscode.window.showWarningMessage(t("pathRecordedMissing", { path: trackedFile.path }));
    return;
  }

  vscode.window.showInformationMessage(t("pathTracked", { path: trackedFile.path }));
}

export async function editComment(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const filePath = extractFilePath(input);
  if (!filePath) {
    vscode.window.showWarningMessage(t("noFileSelected"));
    return;
  }

  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  const trackedFile = data.trackedFiles.find((file) => path.resolve(file.path) === path.resolve(filePath));
  if (!trackedFile) {
    vscode.window.showWarningMessage(t("fileNotTracked"));
    return;
  }

  const comment = await vscode.window.showInputBox({
    title: t("editComment"),
    prompt: trackedFile.path,
    value: trackedFile.comment
  });

  if (comment === undefined) {
    return;
  }

  setTrackedFileComment(data, trackedFile.path, comment.trim());
  await store.save(data);
  views.refreshAll();
}

export async function editDisplayName(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const filePath = extractFilePath(input);
  if (!filePath) {
    vscode.window.showWarningMessage(t("noFileSelected"));
    return;
  }

  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  const trackedFile = data.trackedFiles.find((file) => path.resolve(file.path) === path.resolve(filePath));
  if (!trackedFile) {
    vscode.window.showWarningMessage(t("fileNotTracked"));
    return;
  }

  const displayName = await vscode.window.showInputBox({
    title: t("editDisplayName"),
    prompt: trackedFile.path,
    value: trackedFile.displayName || trackedFile.name,
    ignoreFocusOut: true
  });

  if (displayName === undefined) {
    return;
  }

  setTrackedFileDisplayName(data, trackedFile.path, displayName);
  await store.save(data);
  views.refreshAll();
}

export async function clearDisplayName(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const filePath = extractFilePath(input);
  if (!filePath) {
    vscode.window.showWarningMessage(t("noFileSelected"));
    return;
  }

  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  if (!setTrackedFileDisplayName(data, filePath, "")) {
    vscode.window.showWarningMessage(t("fileNotTracked"));
    return;
  }

  await store.save(data);
  views.refreshAll();
}

export async function deleteComment(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const filePath = extractFilePath(input);
  if (!filePath) {
    vscode.window.showWarningMessage(t("noFileSelected"));
    return;
  }

  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  if (!setTrackedFileComment(data, filePath, "")) {
    vscode.window.showWarningMessage(t("fileNotTracked"));
    return;
  }

  await store.save(data);
  views.refreshAll();
}

export async function copyPath(input?: unknown): Promise<void> {
  const filePath = extractFilePath(input);
  if (!filePath) {
    vscode.window.showWarningMessage(t("noPathSelected"));
    return;
  }

  await vscode.env.clipboard.writeText(filePath);
  vscode.window.showInformationMessage(t("pathCopied"));
}

export async function updateMetadata(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const filePath = extractFilePath(input);
  if (!filePath) {
    vscode.window.showWarningMessage(t("noFileSelected"));
    return;
  }

  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  await updateTrackedFileMetadata(data, filePath);
  await store.save(data);
  views.refreshAll();
  vscode.window.showInformationMessage(t("metadataUpdated"));
}

async function loadTrackedFileForAction(store: WorkspaceStore, filePath: string) {
  const data = await loadRequiredData(store);
  if (!data) {
    return undefined;
  }

  const trackedFile = data.trackedFiles.find((file) => path.resolve(file.path) === path.resolve(filePath));
  if (!trackedFile) {
    vscode.window.showWarningMessage(t("fileNotTracked"));
    return undefined;
  }

  return { data, trackedFile };
}


export async function editControlCommands(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const filePath = extractFilePath(input);
  if (!filePath) {
    vscode.window.showWarningMessage(t("noFileSelected"));
    return;
  }

  const loaded = await loadTrackedFileForAction(store, filePath);
  if (!loaded) {
    return;
  }

  const serviceName = await vscode.window.showInputBox({
    title: t("editControlCommands"),
    prompt: t("serviceNamePrompt"),
    value: loaded.trackedFile.controlCommands?.serviceName || "",
    placeHolder: t("serviceNamePlaceholder"),
    ignoreFocusOut: true
  });
  if (serviceName === undefined) {
    return;
  }

  setTrackedFileControlCommands(loaded.data, loaded.trackedFile.path, { serviceName });
  await store.save(loaded.data);
  views.refreshAll();
  vscode.window.showInformationMessage(t("controlCommandsSaved"));
}

async function runControlCommand(
  store: WorkspaceStore,
  input: unknown,
  action: "start" | "stop" | "restart" | "status"
): Promise<void> {
  const filePath = extractFilePath(input);
  if (!filePath) {
    vscode.window.showWarningMessage(t("noFileSelected"));
    return;
  }

  const loaded = await loadTrackedFileForAction(store, filePath);
  if (!loaded) {
    return;
  }

  const command = resolveControlCommand(loaded.trackedFile.controlCommands, action);
  const actionLabel =
    action === "start"
      ? t("actionStart")
      : action === "stop"
        ? t("actionStop")
        : action === "restart"
          ? t("actionRestart")
          : t("actionStatus");

  if (!command) {
    vscode.window.showWarningMessage(t("controlCommandMissing", { action: actionLabel }));
    return;
  }

  const terminalName = "SSH Workspace";
  const terminal = vscode.window.terminals.find((item) => item.name === terminalName) || vscode.window.createTerminal(terminalName);
  terminal.show();
  terminal.sendText(command, true);
  vscode.window.showInformationMessage(t("runningControlCommand", { action: actionLabel }));
}

export async function runStartCommand(store: WorkspaceStore, input?: unknown): Promise<void> {
  await runControlCommand(store, input, "start");
}

export async function runStopCommand(store: WorkspaceStore, input?: unknown): Promise<void> {
  await runControlCommand(store, input, "stop");
}

export async function runRestartCommand(store: WorkspaceStore, input?: unknown): Promise<void> {
  await runControlCommand(store, input, "restart");
}

export async function runStatusCommand(store: WorkspaceStore, input?: unknown): Promise<void> {
  await runControlCommand(store, input, "status");
}

export async function addExtraCommand(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const filePath = extractFilePath(input);
  if (!filePath) {
    vscode.window.showWarningMessage(t("noFileSelected"));
    return;
  }

  const loaded = await loadTrackedFileForAction(store, filePath);
  if (!loaded) {
    return;
  }

  const label = await vscode.window.showInputBox({
    title: t("actionAddExtraCommand"),
    prompt: t("extraCommandLabelPrompt"),
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim() ? undefined : t("extraCommandLabelRequired"))
  });
  if (label === undefined) {
    return;
  }

  const command = await vscode.window.showInputBox({
    title: t("actionAddExtraCommand"),
    prompt: t("extraCommandCommandPrompt"),
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim() ? undefined : t("extraCommandCommandRequired"))
  });
  if (command === undefined) {
    return;
  }

  addTrackedFileExtraCommand(loaded.data, loaded.trackedFile.path, { label, command });
  await store.save(loaded.data);
  views.refreshAll();
  vscode.window.showInformationMessage(t("extraCommandAdded"));
}

export async function removeExtraCommand(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const filePath = extractFilePath(input);
  const extraCommandId = extractExtraCommandId(input);
  if (!filePath || !extraCommandId) {
    vscode.window.showWarningMessage(t("extraCommandNotFound"));
    return;
  }

  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  if (!removeTrackedFileExtraCommand(data, filePath, extraCommandId)) {
    vscode.window.showWarningMessage(t("extraCommandNotFound"));
    return;
  }

  await store.save(data);
  views.refreshAll();
  vscode.window.showInformationMessage(t("extraCommandRemoved"));
}

export async function runExtraCommand(store: WorkspaceStore, input?: unknown): Promise<void> {
  const filePath = extractFilePath(input);
  const extraCommandId = extractExtraCommandId(input);
  if (!filePath || !extraCommandId) {
    vscode.window.showWarningMessage(t("extraCommandNotFound"));
    return;
  }

  const loaded = await loadTrackedFileForAction(store, filePath);
  if (!loaded) {
    return;
  }

  const extraCommand = loaded.trackedFile.extraCommands?.find((command) => command.id === extraCommandId);
  if (!extraCommand) {
    vscode.window.showWarningMessage(t("extraCommandNotFound"));
    return;
  }

  const terminalName = "SSH Workspace";
  const terminal = vscode.window.terminals.find((item) => item.name === terminalName) || vscode.window.createTerminal(terminalName);
  terminal.show();
  terminal.sendText(extraCommand.command, true);
  vscode.window.showInformationMessage(t("runningControlCommand", { action: extraCommand.label }));
}

function getWorkspaceTerminal(): vscode.Terminal {
  const terminalName = "SSH Workspace";
  return vscode.window.terminals.find((item) => item.name === terminalName) || vscode.window.createTerminal(terminalName);
}

function runCommandInWorkspaceTerminal(label: string, command: string): void {
  const terminal = getWorkspaceTerminal();
  terminal.show();
  terminal.sendText(command, true);
  vscode.window.showInformationMessage(t("runningControlCommand", { action: label }));
}

async function promptSavedCommandValues(
  title: string,
  current?: { name?: string; command?: string; note?: string }
): Promise<{ name: string; command: string; note: string } | undefined> {
  const name = await vscode.window.showInputBox({
    title,
    prompt: t("savedCommandNamePrompt"),
    value: current?.name || "",
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim() ? undefined : t("savedCommandNameRequired"))
  });
  if (name === undefined) {
    return undefined;
  }

  const command = await vscode.window.showInputBox({
    title,
    prompt: t("savedCommandCommandPrompt"),
    value: current?.command || "",
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim() ? undefined : t("savedCommandCommandRequired"))
  });
  if (command === undefined) {
    return undefined;
  }

  const note = await vscode.window.showInputBox({
    title,
    prompt: t("savedCommandNotePrompt"),
    value: current?.note || "",
    ignoreFocusOut: true
  });
  if (note === undefined) {
    return undefined;
  }

  return {
    name: name.trim(),
    command: command.trim(),
    note: note.trim()
  };
}

async function loadSavedCommandForAction(store: WorkspaceStore, commandId: string) {
  const data = await loadRequiredData(store);
  if (!data) {
    return undefined;
  }

  const savedCommand = store.listSavedCommands(data).find((entry) => entry.id === commandId);
  if (!savedCommand) {
    vscode.window.showWarningMessage(t("savedCommandNotFound"));
    return undefined;
  }

  return { data, savedCommand };
}

export async function addSavedCommand(store: WorkspaceStore, views: RefreshableViews): Promise<void> {
  const data = await loadRequiredData(store);
  if (!data) {
    return;
  }

  const values = await promptSavedCommandValues(t("actionAddSavedCommand"));
  if (!values) {
    return;
  }

  store.addSavedCommand(data, values);
  await store.save(data);
  views.refreshAll();
  vscode.window.showInformationMessage(t("savedCommandAdded"));
}

export async function editSavedCommand(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const savedCommandId = extractSavedCommandId(input);
  if (!savedCommandId) {
    vscode.window.showWarningMessage(t("savedCommandNotFound"));
    return;
  }

  const loaded = await loadSavedCommandForAction(store, savedCommandId);
  if (!loaded) {
    return;
  }

  const values = await promptSavedCommandValues(t("editSavedCommand"), loaded.savedCommand);
  if (!values) {
    return;
  }

  store.updateSavedCommand(loaded.data, savedCommandId, values);
  await store.save(loaded.data);
  views.refreshAll();
  vscode.window.showInformationMessage(t("savedCommandUpdated"));
}

export async function duplicateSavedCommand(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const savedCommandId = extractSavedCommandId(input);
  if (!savedCommandId) {
    vscode.window.showWarningMessage(t("savedCommandNotFound"));
    return;
  }

  const loaded = await loadSavedCommandForAction(store, savedCommandId);
  if (!loaded) {
    return;
  }

  const duplicated = store.duplicateSavedCommand(loaded.data, savedCommandId);
  if (!duplicated) {
    vscode.window.showWarningMessage(t("savedCommandNotFound"));
    return;
  }

  const values = await promptSavedCommandValues(t("duplicateSavedCommand"), duplicated);
  if (!values) {
    loaded.data.savedCommands = loaded.data.savedCommands.filter((entry) => entry.id !== duplicated.id);
    await store.save(loaded.data);
    views.refreshAll();
    return;
  }

  store.updateSavedCommand(loaded.data, duplicated.id, values);
  await store.save(loaded.data);
  views.refreshAll();
  vscode.window.showInformationMessage(t("savedCommandDuplicated"));
}

export async function deleteSavedCommand(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const savedCommandId = extractSavedCommandId(input);
  if (!savedCommandId) {
    vscode.window.showWarningMessage(t("savedCommandNotFound"));
    return;
  }

  const loaded = await loadSavedCommandForAction(store, savedCommandId);
  if (!loaded) {
    return;
  }

  const confirmation = await vscode.window.showWarningMessage(
    t("deleteSavedCommandQuestion", { name: loaded.savedCommand.name }),
    { modal: true },
    t("deleteSavedCommandConfirm")
  );
  if (confirmation !== t("deleteSavedCommandConfirm")) {
    return;
  }

  if (!store.removeSavedCommand(loaded.data, savedCommandId)) {
    vscode.window.showWarningMessage(t("savedCommandNotFound"));
    return;
  }

  await store.save(loaded.data);
  views.refreshAll();
  vscode.window.showInformationMessage(t("savedCommandDeleted", { name: loaded.savedCommand.name }));
}

async function executeSavedCommand(command: string): Promise<{ success: boolean; exitCode: number | null; output: string }> {
  return new Promise((resolve) => {
    exec(
      command,
      {
        shell: "/bin/bash",
        timeout: 120000,
        maxBuffer: 1024 * 1024
      },
      (error, stdout, stderr) => {
        const output = [stdout, stderr].filter((value) => value && value.trim()).join("\n").trim();
        const exitCode = typeof error === "object" && error && "code" in error && typeof error.code === "number" ? error.code : error ? 1 : 0;
        resolve({
          success: !error,
          exitCode,
          output
        });
      }
    );
  });
}

export async function runSavedCommand(store: WorkspaceStore, views: RefreshableViews, input?: unknown): Promise<void> {
  const savedCommandId = extractSavedCommandId(input);
  if (!savedCommandId) {
    vscode.window.showWarningMessage(t("savedCommandNotFound"));
    return;
  }

  const loaded = await loadSavedCommandForAction(store, savedCommandId);
  if (!loaded) {
    return;
  }

  const startedAt = toLocalIsoString();
  const result = await executeSavedCommand(loaded.savedCommand.command);
  const finishedAt = toLocalIsoString();

  store.addSavedCommandRun(loaded.data, {
    savedCommandId: loaded.savedCommand.id,
    name: loaded.savedCommand.name,
    command: loaded.savedCommand.command,
    startedAt,
    finishedAt,
    exitCode: result.exitCode,
    success: result.success,
    output: result.output
  });
  await store.save(loaded.data);

  if (result.success) {
    vscode.window.showInformationMessage(t("savedCommandRunSuccess", { name: loaded.savedCommand.name }));
  } else {
    vscode.window.showWarningMessage(t("savedCommandRunFailed", { name: loaded.savedCommand.name }));
  }
}