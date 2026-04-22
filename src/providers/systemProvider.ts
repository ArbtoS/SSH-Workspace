import * as vscode from "vscode";
import { formatDisplayDate } from "../core/dateUtils";
import { t } from "../core/localization";
import { ServerSystemInfo } from "../core/types";
import { WorkspaceStore } from "../core/workspaceStore";
import { MessageItem } from "./commonItems";

type SystemNode = InfoItem | MessageItem;

class InfoItem extends vscode.TreeItem {
  public constructor(label: string, value: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = value || "-";
    this.contextValue = "systemInfo";
    this.iconPath = new vscode.ThemeIcon("server-environment");
  }
}

function infoItems(server: ServerSystemInfo): InfoItem[] {
  return [
    new InfoItem(t("hostname"), server.hostname),
    new InfoItem(t("osName"), server.osName),
    new InfoItem(t("osVersion"), server.osVersion),
    new InfoItem(t("kernel"), server.kernel),
    new InfoItem(t("architecture"), server.architecture),
    new InfoItem(t("mainIp"), server.mainIp),
    new InfoItem(t("lastRefresh"), formatDisplayDate(server.lastRefreshAt, true))
  ];
}

export class SystemProvider implements vscode.TreeDataProvider<SystemNode> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<SystemNode | undefined | null | void>();
  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  public constructor(private readonly store: WorkspaceStore) {}

  public refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  public getTreeItem(element: SystemNode): vscode.TreeItem {
    return element;
  }

  public async getChildren(): Promise<SystemNode[]> {
    try {
      const data = await this.store.load();
      if (!data) {
        return [
          new MessageItem(t("notInitialized"), t("initializeHint"))
        ];
      }

      return infoItems(data.server);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [new MessageItem(t("errorLoading"), message)];
    }
  }
}
