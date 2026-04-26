import * as vscode from "vscode";
import { compareIsoDesc, formatDisplayDate } from "../core/dateUtils";
import { t } from "../core/localization";
import { WorkspaceCommand, WorkspaceCommandRun } from "../core/types";
import { WorkspaceStore } from "../core/workspaceStore";
import { CommandItem, MessageItem } from "./commonItems";

type ActionNode = ActionSectionItem | CommandItem | SavedCommandItem | SavedCommandRunItem | SavedCommandRunDetailItem | MessageItem;
const savedCommandMime = "application/vnd.ssh-workspace.saved-command";

class ActionSectionItem extends vscode.TreeItem {
  public constructor(public readonly section: "actions" | "commands" | "history", label: string) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = "actionSection";
    this.iconPath = new vscode.ThemeIcon(section === "actions" ? "tools" : section === "commands" ? "terminal" : "history");
  }
}

export class SavedCommandItem extends vscode.TreeItem {
  public constructor(public readonly savedCommand: WorkspaceCommand) {
    super(savedCommand.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "savedCommand";
    this.description = savedCommand.note || savedCommand.command;
    this.iconPath = new vscode.ThemeIcon("terminal");
    this.command = {
      command: "sshWorkspace.runSavedCommand",
      title: savedCommand.name,
      arguments: [{ savedCommandId: savedCommand.id }]
    };
    this.tooltip = new vscode.MarkdownString(
      [`**${savedCommand.name}**`, "", `\`${savedCommand.command}\``, "", savedCommand.note || "-"].join("\n")
    );
  }
}

class SavedCommandRunDetailItem extends vscode.TreeItem {
  public constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "savedCommandRunDetail";
    this.iconPath = new vscode.ThemeIcon("blank");
  }
}

class SavedCommandRunItem extends vscode.TreeItem {
  public constructor(public readonly run: WorkspaceCommandRun) {
    super(run.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = "savedCommandRun";
    this.description = `${run.success ? t("runSuccess") : t("runFailed")} | ${formatDisplayDate(run.finishedAt, true)}`;
    this.iconPath = new vscode.ThemeIcon(run.success ? "pass" : "error");
    this.tooltip = new vscode.MarkdownString(
      [
        `**${run.name}**`,
        "",
        `\`${run.command}\``,
        "",
        `${t("finishedAt")}: ${formatDisplayDate(run.finishedAt, true)}`,
        `${t("exitCode")}: ${run.exitCode ?? "-"}`
      ].join("\n")
    );
  }
}

export class ActionsProvider implements vscode.TreeDataProvider<ActionNode>, vscode.TreeDragAndDropController<ActionNode> {
  public readonly dragMimeTypes = [savedCommandMime];
  public readonly dropMimeTypes = [savedCommandMime];
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<ActionNode | undefined | null | void>();
  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  public constructor(private readonly store: WorkspaceStore) {}

  public refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  public getTreeItem(element: ActionNode): vscode.TreeItem {
    return element;
  }

  public async getChildren(element?: ActionNode): Promise<ActionNode[]> {
    if (!element) {
      return [
        new ActionSectionItem("actions", t("actionsSection")),
        new ActionSectionItem("commands", t("savedCommandsSection")),
        new ActionSectionItem("history", t("savedCommandRunsSection"))
      ];
    }

    if (element instanceof ActionSectionItem && element.section === "actions") {
      return [
        new CommandItem(t("actionInitialize"), { command: "sshWorkspace.initialize", title: t("actionInitialize") }, "add"),
        new CommandItem(t("actionRefresh"), { command: "sshWorkspace.refresh", title: t("actionRefresh") }, "refresh"),
        new CommandItem(t("actionTrackPath"), { command: "sshWorkspace.trackPath", title: t("actionTrackPath") }, "file-add"),
        new CommandItem(t("actionTrackCurrentFile"), { command: "sshWorkspace.trackCurrentFile", title: t("actionTrackCurrentFile") }, "eye"),
        new CommandItem(t("actionAddNote"), { command: "sshWorkspace.addNote", title: t("actionAddNote") }, "note"),
        new CommandItem(t("actionAddSavedCommand"), { command: "sshWorkspace.addSavedCommand", title: t("actionAddSavedCommand") }, "terminal"),
        new CommandItem(t("actionRecreateData"), { command: "sshWorkspace.recreateData", title: t("actionRecreateData") }, "trash")
      ];
    }

    if (element instanceof ActionSectionItem && element.section === "commands") {
      const data = await this.store.load();
      if (!data) {
        return [new MessageItem(t("notInitialized"), t("initializeHint"))];
      }

      const commands = this.store.listSavedCommands(data);
      return commands.length > 0 ? commands.map((entry) => new SavedCommandItem(entry)) : [new MessageItem(t("noSavedCommands"))];
    }

    if (element instanceof ActionSectionItem && element.section === "history") {
      const data = await this.store.load();
      if (!data) {
        return [new MessageItem(t("notInitialized"), t("initializeHint"))];
      }

      const runs = this.store.listSavedCommandRuns(data).sort((left, right) => compareIsoDesc(left.finishedAt, right.finishedAt));
      return runs.length > 0 ? runs.map((entry) => new SavedCommandRunItem(entry)) : [new MessageItem(t("noSavedCommandRuns"))];
    }

    if (element instanceof SavedCommandRunItem) {
      const details: ActionNode[] = [
        new SavedCommandRunDetailItem(`${t("commandLabel")}: ${element.run.command}`),
        new SavedCommandRunDetailItem(`${t("startedAt")}: ${formatDisplayDate(element.run.startedAt, true)}`),
        new SavedCommandRunDetailItem(`${t("finishedAt")}: ${formatDisplayDate(element.run.finishedAt, true)}`),
        new SavedCommandRunDetailItem(`${t("exitCode")}: ${element.run.exitCode ?? "-"}`)
      ];

      const outputLines = element.run.output
        ? element.run.output.split(/\r?\n/).filter((line) => line.trim()).slice(0, 20)
        : [t("noOutput")];

      details.push(new SavedCommandRunDetailItem(`${t("outputLabel")}:`));
      for (const line of outputLines) {
        details.push(new SavedCommandRunDetailItem(line));
      }

      return details;
    }

    return [];
  }

  public handleDrag(source: readonly ActionNode[], dataTransfer: vscode.DataTransfer): void {
    const commandIds = source.filter((item): item is SavedCommandItem => item instanceof SavedCommandItem).map((item) => item.savedCommand.id);
    if (commandIds.length > 0) {
      dataTransfer.set(savedCommandMime, new vscode.DataTransferItem(JSON.stringify(commandIds)));
    }
  }

  public async handleDrop(target: ActionNode | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
    const transferItem = dataTransfer.get(savedCommandMime);
    if (!transferItem) {
      return;
    }

    if (target && !(target instanceof SavedCommandItem) && !(target instanceof ActionSectionItem && target.section === "commands")) {
      return;
    }

    const rawIds = await transferItem.asString();
    const draggedIds = JSON.parse(rawIds) as string[];
    if (draggedIds.length === 0) {
      return;
    }

    const data = await this.store.load();
    if (!data) {
      return;
    }

    this.store.reorderSavedCommands(data, draggedIds, target instanceof SavedCommandItem ? target.savedCommand.id : undefined);
    await this.store.save(data);
    this.refresh();
  }
}
