import * as vscode from "vscode";
import { WorkspaceStore } from "./core/workspaceStore";
import { registerCommands } from "./commands/registerCommands";
import { ActionsProvider } from "./providers/actionsProvider";
import { NotesProvider } from "./providers/notesProvider";
import { SystemProvider } from "./providers/systemProvider";
import { WorkPageProvider } from "./providers/workPageProvider";

export function activate(context: vscode.ExtensionContext): void {
  const store = new WorkspaceStore();

  const actionsProvider = new ActionsProvider();
  const workProvider = new WorkPageProvider(store);
  const systemProvider = new SystemProvider(store);
  const notesProvider = new NotesProvider(store);

  const refreshAll = (): void => {
    actionsProvider.refresh();
    workProvider.refresh();
    systemProvider.refresh();
    notesProvider.refresh();
  };

  context.subscriptions.push(
    vscode.window.createTreeView("sshWorkspace.actions", {
      treeDataProvider: actionsProvider
    }),
    vscode.window.createTreeView("sshWorkspace.work", {
      treeDataProvider: workProvider,
      dragAndDropController: workProvider,
      showCollapseAll: true
    }),
    vscode.window.createTreeView("sshWorkspace.system", {
      treeDataProvider: systemProvider
    }),
    vscode.window.createTreeView("sshWorkspace.notes", {
      treeDataProvider: notesProvider
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("sshWorkspace.language")) {
        refreshAll();
      }
    })
  );

  registerCommands(context, store, {
    actions: actionsProvider,
    work: workProvider,
    system: systemProvider,
    notes: notesProvider
  });
}

export function deactivate(): void {
  // No services or background resources in V1.
}
