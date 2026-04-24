import * as vscode from "vscode";
import { t } from "../core/localization";
import { CommandItem } from "./commonItems";

type ActionNode = CommandItem;

export class ActionsProvider implements vscode.TreeDataProvider<ActionNode> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<ActionNode | undefined | null | void>();
  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  public refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  public getTreeItem(element: ActionNode): vscode.TreeItem {
    return element;
  }

  public getChildren(): ActionNode[] {
    return [
      new CommandItem(
        t("actionInitialize"),
        {
          command: "sshWorkspace.initialize",
          title: t("actionInitialize")
        },
        "add"
      ),
      new CommandItem(
        t("actionRefresh"),
        {
          command: "sshWorkspace.refresh",
          title: t("actionRefresh")
        },
        "refresh"
      ),
      new CommandItem(
        t("actionTrackPath"),
        {
          command: "sshWorkspace.trackPath",
          title: t("actionTrackPath")
        },
        "file-add"
      ),
      new CommandItem(
        t("actionTrackCurrentFile"),
        {
          command: "sshWorkspace.trackCurrentFile",
          title: t("actionTrackCurrentFile")
        },
        "eye"
      ),
      new CommandItem(
        t("actionAddNote"),
        {
          command: "sshWorkspace.addNote",
          title: t("actionAddNote")
        },
        "note"
      ),
      new CommandItem(
        t("actionRecreateData"),
        {
          command: "sshWorkspace.recreateData",
          title: t("actionRecreateData")
        },
        "trash"
      )
    ];
  }
}
