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

  registerSafeCommand(context, "sshServerWorkspace.initialize", () => initializeWorkspace(store, views));
  registerSafeCommand(context, "sshServerWorkspace.refresh", () => refreshWorkspace(store, views));
  registerSafeCommand(context, "sshServerWorkspace.recreateData", () => recreateWorkspaceData(store, views));
  registerSafeCommand(context, "sshServerWorkspace.openNotes", () => openNotes(store));
  registerSafeCommand(context, "sshServerWorkspace.addNote", () => addNote(store, views));
  registerSafeCommand(context, "sshServerWorkspace.openSystemStatus", () => openSystemStatus(store));
  registerSafeCommand(context, "sshServerWorkspace.openFile", (input) => openTrackedFile(store, views, input));
  registerSafeCommand(context, "sshServerWorkspace.trackCurrentFile", () => trackCurrentFile(store, views));
  registerSafeCommand(context, "sshServerWorkspace.trackPath", () => trackPath(store, views));
  registerSafeCommand(context, "sshServerWorkspace.editDisplayName", (input) => editDisplayName(store, views, input));
  registerSafeCommand(context, "sshServerWorkspace.clearDisplayName", (input) => clearDisplayName(store, views, input));
  registerSafeCommand(context, "sshServerWorkspace.editComment", (input) => editComment(store, views, input));
  registerSafeCommand(context, "sshServerWorkspace.deleteComment", (input) => deleteComment(store, views, input));
  registerSafeCommand(context, "sshServerWorkspace.editControlCommands", (input) => editControlCommands(store, views, input));
  registerSafeCommand(context, "sshServerWorkspace.addExtraCommand", (input) => addExtraCommand(store, views, input));
  registerSafeCommand(context, "sshServerWorkspace.removeExtraCommand", (input) => removeExtraCommand(store, views, input));
  registerSafeCommand(context, "sshServerWorkspace.runExtraCommand", (input) => runExtraCommand(store, input));
  registerSafeCommand(context, "sshServerWorkspace.startFileAction", (input) => runStartCommand(store, input));
  registerSafeCommand(context, "sshServerWorkspace.stopFileAction", (input) => runStopCommand(store, input));
  registerSafeCommand(context, "sshServerWorkspace.restartFileAction", (input) => runRestartCommand(store, input));
  registerSafeCommand(context, "sshServerWorkspace.statusFileAction", (input) => runStatusCommand(store, input));
  registerSafeCommand(context, "sshServerWorkspace.copyPath", (input) => copyPath(input));
  registerSafeCommand(context, "sshServerWorkspace.updateMetadata", (input) => updateMetadata(store, views, input));
}
