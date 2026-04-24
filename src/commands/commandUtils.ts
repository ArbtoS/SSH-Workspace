import * as vscode from "vscode";
import { LogEntryItem, TrackedFileItem } from "../providers/workPageProvider";

export function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function registerSafeCommand(
  context: vscode.ExtensionContext,
  command: string,
  callback: (...args: unknown[]) => Promise<void> | void
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(command, async (...args: unknown[]) => {
      try {
        await callback(...args);
      } catch (error) {
        vscode.window.showErrorMessage(`SSH Workspace: ${messageFromError(error)}`);
      }
    })
  );
}

export function extractFilePath(input: unknown): string | undefined {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof TrackedFileItem) {
    return input.file.path;
  }

  if (input instanceof LogEntryItem) {
    return input.entry.path;
  }

  if (typeof input === "object" && input && "path" in input && typeof input.path === "string") {
    return input.path;
  }

  if (typeof input === "object" && input && "file" in input) {
    const file = input.file as { path?: unknown };
    return typeof file.path === "string" ? file.path : undefined;
  }

  if (typeof input === "object" && input && "entry" in input) {
    const entry = input.entry as { path?: unknown };
    return typeof entry.path === "string" ? entry.path : undefined;
  }

  return undefined;
}

export function extractExtraCommandId(input: unknown): string | undefined {
  if (typeof input === "object" && input && "extraCommandId" in input) {
    const extraCommandId = input.extraCommandId as unknown;
    return typeof extraCommandId === "string" ? extraCommandId : undefined;
  }

  if (typeof input === "object" && input && "extraCommand" in input) {
    const extraCommand = input.extraCommand as { id?: unknown };
    return typeof extraCommand.id === "string" ? extraCommand.id : undefined;
  }

  return undefined;
}
