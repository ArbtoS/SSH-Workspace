import * as vscode from "vscode";
import { WorkspaceStore } from "../core/workspaceStore";
import { ActionsProvider } from "../providers/actionsProvider";
import { NotesProvider } from "../providers/notesProvider";
import { SystemProvider } from "../providers/systemProvider";
import { WorkPageProvider } from "../providers/workPageProvider";
import { registerSafeCommand } from "./commandUtils";
import {
  addExtraCommand,
  addNote,
  clearDisplayName,
  copyPath,
  deleteComment,
  editComment,
  editControlCommands,
  editDisplayName,
  initializeWorkspace,
  openNotes,
  openSystemStatus,
  openTrackedFile,
  recreateWorkspaceData,
  refreshWorkspace,
  removeExtraCommand,
  runRestartCommand,
  runExtraCommand,
  runStatusCommand,
  runStartCommand,
  runStopCommand,
  trackCurrentFile,
  trackPath,
  updateMetadata
} from "./workspaceCommands";

interface Providers {
  actions: ActionsProvider;
  work: WorkPageProvider;
  system: SystemProvider;
  notes: NotesProvider;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  store: WorkspaceStore,
  providers: Providers
): void {
  const views = {
    refreshAll(): void {
      providers.actions.refresh();
      providers.work.refresh();
      providers.system.refresh();
      providers.notes.refresh();
    }
  };

  registerSafeCommand(context, "sshWorkspace.initialize", () => initializeWorkspace(store, views));
  registerSafeCommand(context, "sshWorkspace.refresh", () => refreshWorkspace(store, views));
  registerSafeCommand(context, "sshWorkspace.recreateData", () => recreateWorkspaceData(store, views));
  registerSafeCommand(context, "sshWorkspace.openNotes", () => openNotes(store));
  registerSafeCommand(context, "sshWorkspace.addNote", () => addNote(store, views));
  registerSafeCommand(context, "sshWorkspace.openSystemStatus", () => openSystemStatus(store));
  registerSafeCommand(context, "sshWorkspace.openFile", (input) => openTrackedFile(store, views, input));
  registerSafeCommand(context, "sshWorkspace.trackCurrentFile", () => trackCurrentFile(store, views));
  registerSafeCommand(context, "sshWorkspace.trackPath", () => trackPath(store, views));
  registerSafeCommand(context, "sshWorkspace.editDisplayName", (input) => editDisplayName(store, views, input));
  registerSafeCommand(context, "sshWorkspace.clearDisplayName", (input) => clearDisplayName(store, views, input));
  registerSafeCommand(context, "sshWorkspace.editComment", (input) => editComment(store, views, input));
  registerSafeCommand(context, "sshWorkspace.deleteComment", (input) => deleteComment(store, views, input));
  registerSafeCommand(context, "sshWorkspace.editControlCommands", (input) => editControlCommands(store, views, input));
  registerSafeCommand(context, "sshWorkspace.addExtraCommand", (input) => addExtraCommand(store, views, input));
  registerSafeCommand(context, "sshWorkspace.removeExtraCommand", (input) => removeExtraCommand(store, views, input));
  registerSafeCommand(context, "sshWorkspace.runExtraCommand", (input) => runExtraCommand(store, input));
  registerSafeCommand(context, "sshWorkspace.startFileAction", (input) => runStartCommand(store, input));
  registerSafeCommand(context, "sshWorkspace.stopFileAction", (input) => runStopCommand(store, input));
  registerSafeCommand(context, "sshWorkspace.restartFileAction", (input) => runRestartCommand(store, input));
  registerSafeCommand(context, "sshWorkspace.statusFileAction", (input) => runStatusCommand(store, input));
  registerSafeCommand(context, "sshWorkspace.copyPath", (input) => copyPath(input));
  registerSafeCommand(context, "sshWorkspace.updateMetadata", (input) => updateMetadata(store, views, input));
}
