import * as path from "path";
import * as vscode from "vscode";
import {
  updateTrackedFileMetadata,
  refreshTrackedFiles,
  setTrackedFileComment,
  setTrackedFileDisplayName
} from "../core/fileMetadata";
import { t } from "../core/localization";
import { readSystemInfo } from "../core/systemInfo";
import { createDefaultWorkspaceData } from "../core/types";
import { WorkspaceStore } from "../core/workspaceStore";
import { extractFilePath } from "./commandUtils";

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

export async function openNotes(store: WorkspaceStore): Promise<void> {
  if (!(await store.isInitialized())) {
    vscode.window.showWarningMessage(t("warningInitializeFirst"));
    return;
  }

  await vscode.window.showTextDocument(store.notesUri(), { preview: false });
}

export async function addNote(store: WorkspaceStore, views: RefreshableViews): Promise<void> {
  if (!(await store.isInitialized())) {
    vscode.window.showWarningMessage(t("warningInitializeFirst"));
    return;
  }

  const note = await vscode.window.showInputBox({
    title: t("actionAddNote"),
    prompt: t("addNotePrompt"),
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim() ? undefined : t("emptyNote"))
  });

  if (note === undefined) {
    return;
  }

  await store.addNote(note.trim());
  views.refreshAll();
  vscode.window.showInformationMessage(t("noteAdded"));
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
