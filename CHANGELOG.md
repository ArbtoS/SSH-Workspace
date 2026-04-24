# Changelog

## 0.3.2

- Updated GitHub repository metadata to the renamed `SSH-Workspace` repository and bumped the package version to keep the renamed package/repository state clearly separated.

## 0.3.1

- Renamed the Marketplace package, visible extension name, command namespace, settings key, icon asset names, VSIX output name, and remote data directory from SSH Server Workspace to SSH Workspace.

## 0.3.0

- Added a per-file `Status` command alongside start/stop/restart actions.
- Changed file actions in the work list from plain details to directly clickable entries.
- Added a `serviceName`-based systemd workflow for default start/stop/restart/status actions.
- Added removable extra commands per tracked file.

## 0.2.2

- Added optional per-file start/stop/restart shell commands in the work list.

## 0.2.0

- Renamed the extension, command namespace, settings, icon asset, package output, and remote data directory to SSH Workspace.
- Added a PNG Marketplace icon and Marketplace publishing script.
- Added `sshWorkspace.language` setting for German/English tree view labels, prompts, and notifications.
- Added Marketplace/GitHub-ready package metadata.
- Added MIT license.

## 0.1.2

- Added drag-and-drop ordering for the work list.
- Cleaned up notes labels.

## 0.1.1

- Added dedicated `Aktionen` view for global commands.
- Moved `SYSTEMSTATUS.md` access into the notes view.
- Hid internal SSH Workspace files from the work list and raw log.

## 0.1.0

- Initial V1 scaffold.
- Added Remote-SSH workspace initialization under `~/.ssh-workspace/`.
- Added work page, system info, notes, file tracking, comments, display names, and VSIX packaging.
