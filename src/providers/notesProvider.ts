import * as vscode from "vscode";
import { t } from "../core/localization";
import { WorkspaceStore } from "../core/workspaceStore";
import { CommandItem, MessageItem } from "./commonItems";

type NotesNode = CommandItem | MessageItem | NoteLineItem;

class NoteLineItem extends vscode.TreeItem {
  public constructor(line: string) {
    super(line, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "noteLine";
    this.iconPath = new vscode.ThemeIcon("note");
  }
}

export class NotesProvider implements vscode.TreeDataProvider<NotesNode> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<NotesNode | undefined | null | void>();
  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  public constructor(private readonly store: WorkspaceStore) {}

  public refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  public getTreeItem(element: NotesNode): vscode.TreeItem {
    return element;
  }

  public async getChildren(): Promise<NotesNode[]> {
    try {
      if (!(await this.store.isInitialized())) {
        return [
          new MessageItem(t("notInitialized"), t("initializeHint"))
        ];
      }

      const notes = await this.store.readNotes();

      return [
        new CommandItem(
          t("actionAddNote"),
          {
            command: "sshWorkspace.addNote",
            title: t("actionAddNote")
          },
          "add"
        ),
        new CommandItem(
          t("notesFile"),
          {
            command: "sshWorkspace.openNotes",
            title: t("notesFile")
          },
          "notebook"
        ),
        ...notes.map((line) => new NoteLineItem(line)),
        new CommandItem(
          t("systemStatusFile"),
          {
            command: "sshWorkspace.openSystemStatus",
            title: t("systemStatusFile")
          },
          "markdown"
        )
      ];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [new MessageItem(t("errorLoading"), message)];
    }
  }
}
