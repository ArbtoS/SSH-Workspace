import * as vscode from "vscode";
import { resolveControlCommand } from "../core/controlCommands";
import { compareIsoDesc, formatDisplayDate } from "../core/dateUtils";
import { t } from "../core/localization";
import { ChangeLogEntry, TrackedFile, TrackedFileExtraCommand } from "../core/types";
import { WorkspaceStore } from "../core/workspaceStore";
import { CommandItem, MessageItem } from "./commonItems";

type WorkNode =
  | WorkSectionItem
  | TrackedFileItem
  | DetailItem
  | FileActionItem
  | ExtraCommandItem
  | LogEntryItem
  | MessageItem
  | CommandItem;
const trackedFileMime = "application/vnd.ssh-server-workspace.tracked-file";

function sortTrackedFiles(files: TrackedFile[]): TrackedFile[] {
  return [...files].sort((left, right) => {
    if (typeof left.sortOrder === "number" && typeof right.sortOrder === "number") {
      return left.sortOrder - right.sortOrder;
    }

    if (typeof left.sortOrder === "number") {
      return -1;
    }

    if (typeof right.sortOrder === "number") {
      return 1;
    }

    return compareIsoDesc(left.lastModifiedAt || left.firstSeenAt, right.lastModifiedAt || right.firstSeenAt);
  });
}

class WorkSectionItem extends vscode.TreeItem {
  public constructor(public readonly section: "files" | "log", label: string) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = "workSection";
    this.iconPath = new vscode.ThemeIcon(section === "files" ? "files" : "list-flat");
  }
}

export class TrackedFileItem extends vscode.TreeItem {
  public constructor(public readonly file: TrackedFile) {
    super(file.displayName || file.name, vscode.TreeItemCollapsibleState.Expanded);
    this.description = file.displayName ? `${file.name}  ${file.path}` : file.path;
    this.contextValue = "trackedFile";
    this.iconPath = new vscode.ThemeIcon(file.exists ? "file" : "warning");
    this.command = {
      command: "sshServerWorkspace.openFile",
      title: t("open"),
      arguments: [file.path]
    };
    this.tooltip = new vscode.MarkdownString(
      [
        `**${file.name}**`,
        "",
        `${t("displayName")}: ${file.displayName || "-"}`,
        `${t("path")}: \`${file.path}\``,
        `${t("lastChanged")}: ${formatDisplayDate(file.lastModifiedAt)}`,
        `${file.owner || "-"}:${file.group || "-"} | ${file.mode || "-"} | ${file.changeCount} ${t("changes")}`,
        `${t("comment")}: ${file.comment || "-"}`,
        `${t("service")}: \`${file.controlCommands?.serviceName || "-"}\``,
        `${t("controlStart")}: \`${resolveControlCommand(file.controlCommands, "start") || "-"}\``,
        `${t("controlStop")}: \`${resolveControlCommand(file.controlCommands, "stop") || "-"}\``,
        `${t("controlRestart")}: \`${resolveControlCommand(file.controlCommands, "restart") || "-"}\``,
        `${t("controlStatus")}: \`${resolveControlCommand(file.controlCommands, "status") || "-"}\``
      ].join("\n")
    );
  }
}

class DetailItem extends vscode.TreeItem {
  public constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "fileDetail";
    this.iconPath = new vscode.ThemeIcon("blank");
  }
}

class FileActionItem extends vscode.TreeItem {
  public constructor(
    label: string,
    commandId: string,
    file: TrackedFile,
    configuredCommand: string | undefined,
    iconName: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "fileAction";
    this.description = configuredCommand || "-";
    this.iconPath = new vscode.ThemeIcon(iconName);
    this.command = {
      command: commandId,
      title: label,
      arguments: [file.path]
    };
    this.tooltip = configuredCommand || label;
  }
}

class ExtraCommandItem extends vscode.TreeItem {
  public constructor(public readonly file: TrackedFile, public readonly extraCommand: TrackedFileExtraCommand) {
    super(extraCommand.label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "extraFileAction";
    this.description = extraCommand.command;
    this.iconPath = new vscode.ThemeIcon("terminal");
    this.command = {
      command: "sshServerWorkspace.runExtraCommand",
      title: extraCommand.label,
      arguments: [{ path: file.path, extraCommandId: extraCommand.id }]
    };
    this.tooltip = extraCommand.command;
  }
}

export class LogEntryItem extends vscode.TreeItem {
  public constructor(public readonly entry: ChangeLogEntry) {
    super(`${formatDisplayDate(entry.timestamp, true)} | ${entry.path}`, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "logEntry";
    this.iconPath = new vscode.ThemeIcon("history");
    this.command = {
      command: "sshServerWorkspace.openFile",
      title: t("open"),
      arguments: [entry.path]
    };
    this.tooltip = entry.path;
  }
}

export class WorkPageProvider implements vscode.TreeDataProvider<WorkNode>, vscode.TreeDragAndDropController<WorkNode> {
  public readonly dragMimeTypes = [trackedFileMime];
  public readonly dropMimeTypes = [trackedFileMime];
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<WorkNode | undefined | null | void>();
  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  public constructor(private readonly store: WorkspaceStore) {}

  public refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  public getTreeItem(element: WorkNode): vscode.TreeItem {
    return element;
  }

  public async getChildren(element?: WorkNode): Promise<WorkNode[]> {
    try {
      const data = await this.store.load();
      if (!data) {
        return [
          new MessageItem(t("notInitialized"), t("initializeHint"))
        ];
      }

      if (!element) {
        return [new WorkSectionItem("files", t("workList")), new WorkSectionItem("log", t("rawLog"))];
      }

      if (element instanceof WorkSectionItem && element.section === "files") {
        const files = sortTrackedFiles(data.trackedFiles);

        return files.length > 0 ? files.map((file) => new TrackedFileItem(file)) : [new MessageItem(t("noTrackedFiles"))];
      }

      if (element instanceof WorkSectionItem && element.section === "log") {
        const entries = [...data.changeLog].sort((left, right) => compareIsoDesc(left.timestamp, right.timestamp));
        return entries.length > 0 ? entries.map((entry) => new LogEntryItem(entry)) : [new MessageItem(t("noRawLog"))];
      }

      if (element instanceof TrackedFileItem) {
        const file = element.file;
        const details = [
          new DetailItem(`${t("displayName")}: ${file.displayName || "-"}`),
          new DetailItem(file.path),
          new DetailItem(`${t("lastChanged")}: ${formatDisplayDate(file.lastModifiedAt)}`),
          new DetailItem(`${file.owner || "-"}:${file.group || "-"} | ${file.mode || "-"} | ${file.changeCount} ${t("changes")}`),
          new DetailItem(`${t("comment")}: ${file.comment || "-"}`),
          new DetailItem(`${t("service")}: ${file.controlCommands?.serviceName || "-"}`),
          new FileActionItem(
            t("actionStart"),
            "sshServerWorkspace.startFileAction",
            file,
            resolveControlCommand(file.controlCommands, "start"),
            "play"
          ),
          new FileActionItem(
            t("actionStop"),
            "sshServerWorkspace.stopFileAction",
            file,
            resolveControlCommand(file.controlCommands, "stop"),
            "primitive-square"
          ),
          new FileActionItem(
            t("actionRestart"),
            "sshServerWorkspace.restartFileAction",
            file,
            resolveControlCommand(file.controlCommands, "restart"),
            "refresh"
          ),
          new FileActionItem(
            t("actionStatus"),
            "sshServerWorkspace.statusFileAction",
            file,
            resolveControlCommand(file.controlCommands, "status"),
            "pulse"
          ),
          new CommandItem(
            t("actionAddExtraCommand"),
            {
              command: "sshServerWorkspace.addExtraCommand",
              title: t("actionAddExtraCommand"),
              arguments: [{ path: file.path }]
            },
            "add"
          )
        ];

        const extraCommandItems = (file.extraCommands ?? []).map((extraCommand) => new ExtraCommandItem(file, extraCommand));

        if (extraCommandItems.length > 0) {
          details.push(new DetailItem(`${t("extraCommands")}:`));
          details.push(...extraCommandItems);
        }

        if (!file.exists) {
          details.unshift(new DetailItem(t("fileMissing")));
        }

        return details;
      }

      return [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [new MessageItem(t("errorLoading"), message)];
    }
  }

  public handleDrag(source: readonly WorkNode[], dataTransfer: vscode.DataTransfer): void {
    const paths = source
      .filter((item): item is TrackedFileItem => item instanceof TrackedFileItem)
      .map((item) => item.file.path);

    if (paths.length > 0) {
      dataTransfer.set(trackedFileMime, new vscode.DataTransferItem(JSON.stringify(paths)));
    }
  }

  public async handleDrop(target: WorkNode | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
    const transferItem = dataTransfer.get(trackedFileMime);
    if (!transferItem) {
      return;
    }

    const rawPaths = await transferItem.asString();
    const draggedPaths = JSON.parse(rawPaths) as string[];
    const draggedSet = new Set(draggedPaths);
    if (draggedSet.size === 0) {
      return;
    }

    if (
      target &&
      !(target instanceof TrackedFileItem) &&
      !(target instanceof WorkSectionItem && target.section === "files")
    ) {
      return;
    }

    const data = await this.store.load();
    if (!data) {
      return;
    }

    const current = sortTrackedFiles(data.trackedFiles);
    const moving = current.filter((file) => draggedSet.has(file.path));
    if (moving.length === 0) {
      return;
    }

    const remaining = current.filter((file) => !draggedSet.has(file.path));
    const targetIndex =
      target instanceof TrackedFileItem
        ? remaining.findIndex((file) => file.path === target.file.path)
        : remaining.length;
    const insertIndex = targetIndex >= 0 ? targetIndex : remaining.length;
    const next = [
      ...remaining.slice(0, insertIndex),
      ...moving,
      ...remaining.slice(insertIndex)
    ].map((file, index) => ({
      ...file,
      sortOrder: index
    }));

    data.trackedFiles = next;
    await this.store.save(data);
    this.refresh();
  }
}
