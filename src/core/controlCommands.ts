import { TrackedFileControlCommands } from "./types";

export type ControlAction = "start" | "stop" | "restart" | "status";

export function normalizeServiceName(serviceName: string | undefined): string | undefined {
  const trimmed = serviceName?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveControlCommand(
  controlCommands: TrackedFileControlCommands | undefined,
  action: ControlAction
): string | undefined {
  const custom = controlCommands?.[action]?.trim();
  if (custom) {
    return custom;
  }

  const serviceName = normalizeServiceName(controlCommands?.serviceName);
  if (!serviceName) {
    return undefined;
  }

  return `sudo systemctl ${action} ${serviceName}`;
}
