# Server Workspace

[Deutsch](#deutsch) | [English](#english)

Server Workspace is a small Visual Studio Code extension for users who are already connected to a Linux server through VS Code Remote-SSH. It does not create SSH connections, manage SSH hosts, or edit SSH configuration files.

This project was developed with support from ChatGPT. The extension scope, behavior, and final code decisions remain project-owned and reviewable in this repository.

---

## Deutsch

### Ueberblick

Server Workspace ist eine kleine VS-Code-Extension fuer Remote-SSH-Workspaces. Sie hilft dabei, wichtige Serverdateien bewusst zu tracken, einfache Systeminfos zu sehen und Notizen direkt auf dem verbundenen Server abzulegen.

Die Extension laeuft im bereits verbundenen Remote-Workspace. Remote-SSH bleibt fuer Verbindung, Authentifizierung und Host-Verwaltung zustaendig.

### Funktionen

- Eigener Activity-Bar-Bereich `Server Workspace`
- Views: `Aktionen`, `Arbeitsseite`, `System`, `Notizen`
- Initialisierung von `~/.server-workspace/` auf dem Remote-Host
- Datei-Tracking fuer bewusst ausgewaehlte Serverdateien
- Klarname und Kommentar pro getrackter Datei
- Drag-and-Drop-Sortierung in der Arbeitsliste
- Rohlog fuer erkannte Aenderungen an getrackten Dateien
- Systeminfos wie Hostname, OS, Kernel, Architektur und Haupt-IP
- Notizen in `NOTIZEN.md`
- Manuell pflegbarer Systemstatus in `SYSTEMSTATUS.md`
- Sprachumschaltung Deutsch/Englisch ueber `serverWorkspace.language`

### Nicht enthalten

- Keine eigene SSH-Verbindung
- Keine SSH-Config-Verwaltung
- Keine Server-/Host-Merkliste
- Keine Services oder Hintergrundkomponente
- Keine Webview
- Kein Cockpit-Ersatz
- Kein automatisches Tracking beliebiger Terminal-Edits

Dateien, die mit `nano`, `vim`, `cat > file` oder `sudo` im Terminal bearbeitet werden, werden nicht automatisch entdeckt. Sobald eine Datei einmal getrackt ist, kann `Aktualisieren` ihre Metadaten und Aenderungen erfassen.

### Remote-Dateien

Beim Initialisieren legt die Extension auf dem verbundenen Remote-Host diesen Ordner an:

```text
~/.server-workspace/
```

Darin liegen:

```text
SYSTEMSTATUS.md
NOTIZEN.md
workspace-data.json
```

Vor dem Command `Server Workspace: Initialisieren` wird nichts auf dem Server angelegt.

### Views

#### Aktionen

Buendelt die globalen Befehle:

- Initialisieren
- Aktualisieren
- Pfad tracken
- Aktuelle Datei tracken
- Notiz hinzufuegen
- Daten neu erstellen

#### Arbeitsseite

Die Arbeitsseite besteht aus:

- `Arbeitsliste`: bewusst getrackte Dateien
- `Rohlog`: erkannte Aenderungen im Format `Datum Uhrzeit | Pfad`

Eine Datei kann auf zwei Wegen aufgenommen werden:

- `Aktuelle Datei tracken`: trackt die Datei, die gerade im VS-Code-Editor aktiv ist
- `Pfad tracken`: nimmt einen absoluten Remote-Pfad auf, zum Beispiel `/etc/systemd/system/hostapd-healthcheck.timer`

Pro getrackter Datei koennen Klarname und Kommentar gepflegt werden. Die Arbeitsliste kann per Drag and Drop manuell sortiert werden. Interne Server-Workspace-Dateien wie `NOTIZEN.md`, `SYSTEMSTATUS.md` und `workspace-data.json` werden nicht in der Arbeitsliste angezeigt.

#### System

Zeigt einfache Systeminfos:

- Hostname
- OS-Name
- OS-Version
- Kernel
- Architektur
- Haupt-IP
- letzter Refresh

#### Notizen

Die Notizen-View bietet:

- `Notiz hinzufuegen`: schreibt eine neue Zeile in `NOTIZEN.md`
- `NOTIZEN.md`: oeffnet die Notizdatei zur freien Bearbeitung
- `SYSTEMSTATUS.md`: oeffnet die Datei fuer Rolle, Zweck und Bemerkungen
- Anzeige der letzten Notizzeilen

### Installation zum Testen

Abhaengigkeiten installieren und kompilieren:

```powershell
npm install
npm run compile
```

VSIX bauen:

```powershell
npm run package
```

Danach im Remote-SSH-Fenster:

1. `Extensions: Install from VSIX...` ausfuehren.
2. Die erzeugte Datei `server-workspace-*.vsix` auswaehlen.
3. `Developer: Reload Window` ausfuehren.
4. In der Activity Bar `Server Workspace` oeffnen.
5. In `Aktionen` den Command `Initialisieren` ausfuehren.

### Sprache umschalten

Die Extension bringt eine eigene Einstellung mit:

```json
"serverWorkspace.language": "de"
```

Moegliche Werte:

- `de`: Deutsch
- `en`: English

Die Einstellung wirkt auf Tree-View-Inhalte, Eingabedialoge und Benachrichtigungen der Extension. VS-Code-Manifest-Texte wie View-Namen und Command-Palette-Titel sind statisch und koennen von VS Code nicht vollstaendig zur Laufzeit ueber eine Extension-eigene Einstellung umgeschaltet werden.

### Entwicklung

```powershell
npm install
npm run compile
npm run package
```

Die Extension ist als Workspace-Extension konfiguriert:

```json
"extensionKind": ["workspace"]
```

Damit ist sie fuer den Einsatz im Remote-SSH-Workspace gedacht.

### Veroeffentlichung

Das Projekt ist als normale VS-Code-Extension paketierbar:

```powershell
npm run package
```

Die erzeugte Datei `server-workspace-*.vsix` kann lokal oder in einem Remote-SSH-Fenster installiert werden.

Fuer eine Veroeffentlichung im Visual Studio Marketplace muss der Wert `publisher` in `package.json` zu einem registrierten Marketplace-Publisher passen.

### KI-Unterstuetzung

ChatGPT war an Planung, Code-Erstellung und Iteration dieser Extension beteiligt. Der Einsatz von ChatGPT ist hier transparent dokumentiert; die Extension bleibt ein normales, pruefbares Open-Source-Projekt.

---

## English

### Overview

Server Workspace is a small VS Code extension for Remote-SSH workspaces. It helps users deliberately track important server files, view basic system information, and keep notes directly on the connected server.

The extension runs inside an already connected remote workspace. VS Code Remote-SSH remains responsible for connection handling, authentication, and host management.

### Features

- Dedicated `Server Workspace` Activity Bar container
- Views: `Aktionen` (Actions), `Arbeitsseite` (Work Page), `System`, `Notizen` (Notes)
- Initializes `~/.server-workspace/` on the remote host
- File tracking for deliberately selected server files
- Display name and comment per tracked file
- Drag-and-drop ordering in the work list
- Raw log for detected changes in tracked files
- System information such as hostname, OS, kernel, architecture, and main IP
- Notes in `NOTIZEN.md`
- Manually maintained system status in `SYSTEMSTATUS.md`
- German/English language switch through `serverWorkspace.language`

### Not Included

- No SSH connection handling
- No SSH config management
- No saved SSH host list
- No service or background backend component
- No webview
- No Cockpit replacement
- No automatic tracking of arbitrary terminal edits

Files edited through `nano`, `vim`, `cat > file`, or `sudo` in a terminal are not discovered automatically. Once a file is tracked, `Refresh` can update its metadata and detect changes.

### Remote Files

Initialization creates this folder on the connected remote host:

```text
~/.server-workspace/
```

It contains:

```text
SYSTEMSTATUS.md
NOTIZEN.md
workspace-data.json
```

No server-side files are created before running `Server Workspace: Initialisieren`.

### Views

#### Aktionen

Collects global commands:

- Initialisieren (initialize)
- Aktualisieren (refresh)
- Pfad tracken (track path)
- Aktuelle Datei tracken (track current file)
- Notiz hinzufuegen (add note)
- Daten neu erstellen (recreate data)

#### Arbeitsseite

The work page contains:

- `Arbeitsliste`: deliberately tracked files
- `Rohlog`: detected changes in the format `date time | path`

A file can be added in two ways:

- `Aktuelle Datei tracken`: tracks the file currently active in the VS Code editor
- `Pfad tracken`: tracks an absolute remote path, for example `/etc/systemd/system/hostapd-healthcheck.timer`

Each tracked file can have a display name and a comment. The work list can be manually sorted with drag and drop. Internal Server Workspace files such as `NOTIZEN.md`, `SYSTEMSTATUS.md`, and `workspace-data.json` are hidden from the work list.

#### System

Shows basic system information:

- Hostname
- OS name
- OS version
- Kernel
- Architecture
- Main IP
- Last refresh

#### Notizen

The notes view offers:

- `Notiz hinzufuegen`: appends a new line to `NOTIZEN.md`
- `NOTIZEN.md`: opens the notes file for manual editing
- `SYSTEMSTATUS.md`: opens the file for role, purpose, and remarks
- A preview of the latest note lines

### Test Installation

Install dependencies and compile:

```powershell
npm install
npm run compile
```

Build a VSIX:

```powershell
npm run package
```

Then, in the Remote-SSH window:

1. Run `Extensions: Install from VSIX...`.
2. Select the generated `server-workspace-*.vsix` file.
3. Run `Developer: Reload Window`.
4. Open `Server Workspace` in the Activity Bar.
5. Run `Initialisieren` from the `Aktionen` view.

### Language Setting

The extension provides its own setting:

```json
"serverWorkspace.language": "en"
```

Supported values:

- `de`: German
- `en`: English

The setting affects tree view contents, input prompts, and notifications provided by the extension. VS Code manifest texts such as view names and command palette titles are static and cannot be fully switched at runtime through an extension-specific setting.

### Development

```powershell
npm install
npm run compile
npm run package
```

The extension is configured as a workspace extension:

```json
"extensionKind": ["workspace"]
```

It is intended to run inside the Remote-SSH workspace.

### Publishing

The project can be packaged as a regular VS Code extension:

```powershell
npm run package
```

The generated `server-workspace-*.vsix` file can be installed locally or inside a Remote-SSH window.

For Visual Studio Marketplace publishing, the `publisher` value in `package.json` must match a registered Marketplace publisher.

### AI Assistance

ChatGPT assisted with planning, code generation, and iteration for this extension. This involvement is documented transparently; the extension remains a normal, reviewable open-source project.
