# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flutter Checker is a VS Code extension that detects outdated packages in Flutter/Dart `pubspec.yaml` files. It queries pub.dev API, classifies updates by semantic versioning (patch/minor/major), and provides visual highlighting with Quick Fix actions to update packages.

## Build and Development Commands

### Compile TypeScript
```bash
npm run compile
```
Compiles TypeScript source files from `src/` to JavaScript in `out/` directory.

### Watch Mode (Development)
```bash
npm run watch
```
Continuously recompiles TypeScript files on changes. Use this during active development.

### Package Extension
```bash
npm run package
```
Creates a `.vsix` package file for distribution. Runs `compile` first, then uses `vsce package`.

### Full Build
```bash
npm run build
```
Runs both compile and package commands. Use this before publishing.

### Testing Extension
Press F5 in VS Code to launch Extension Development Host with the extension loaded.

## Architecture

### Core Components

**[extension.ts](src/extension.ts)** - Extension lifecycle and orchestration
- `activate()`: Initializes all providers, registers commands (`checkOutdated`, `clearHighlights`, `updatePackage`, `updatePackageNoInstall`), and sets up event listeners
- Event-driven architecture: Listens to `onDidOpenTextDocument`, `onDidChangeTextDocument`, `onDidSaveTextDocument` for automatic package checking
- Debouncing: 2-second delay on text changes to prevent excessive API calls
- Maintains `outdatedByDoc` map to track outdated packages per document for CodeAction provider
- Security: Validates pubspec.yaml files are within workspace and version strings match semver patterns

**[packageChecker.ts](src/packageChecker.ts)** - Package version detection and pub.dev API integration
- `checkOutdatedPackages()`: Parses pubspec.yaml using js-yaml, extracts dependencies, queries pub.dev API
- Caching layer: 5-minute cache (`CACHE_DURATION`) for pub.dev responses to minimize API calls
- Rate limiting: 100ms minimum interval between requests (`MIN_REQUEST_INTERVAL`)
- Security validation: Package names must match Dart convention (`/^[a-z0-9_]+$/`), version strings validated against semver patterns
- HTTPS security: Uses TLS 1.2+, strict SSL verification, 3 redirect max, 1MB response limit
- Update classification: Uses `semver` library to determine PATCH/MINOR/MAJOR update types

**[decorationProvider.ts](src/decorationProvider.ts)** - Visual highlighting and hover tooltips
- Creates three decoration types (patch/minor/major) with theme-aware colors
- `updateDecorations()`: Groups packages by update type and applies color-coded underlines with version comparisons
- Hover tooltips: Markdown with update type emoji, version comparison, and command links for Quick Fix actions
- Security: Sanitizes all user input in markdown to prevent injection (`sanitizeForMarkdown()`)

**[statusBarProvider.ts](src/statusBarProvider.ts)** - Status bar UI management
- Four states: IDLE, CHECKING, COMPLETE, ERROR
- Displays package counts with warning/error background colors
- Clickable: Triggers `flutter-checker.checkOutdated` command
- Configurable: `showStatusBar` and `statusBarPriority` settings

**[codeActionProvider.ts](src/codeActionProvider.ts)** - Quick Fix actions
- Provides lightbulb actions for outdated package versions
- Two actions per package: "Update" (runs `flutter pub get`) and "Update (no pub get)"
- Registered for `{ language: 'yaml', pattern: '**/pubspec.yaml' }` with `QuickFix` kind

### Key Patterns

**Data Flow**:
1. User opens/modifies pubspec.yaml → event listener triggers
2. `packageChecker.checkOutdatedPackages()` parses YAML and queries pub.dev
3. Results stored in `outdatedByDoc` map
4. `decorationProvider.updateDecorations()` applies visual highlights
5. `statusBarProvider.setComplete()` updates status bar
6. User clicks Quick Fix → `updatePackage` command → edits YAML and optionally runs `flutter pub get`

**Auto-Check System**: Automatic checking can be disabled via `flutterChecker.autoCheck` setting. Silent mode (no notifications) used for auto-checks unless `showAutoCheckNotifications` enabled.

**Security Layer**: All external data (package names, versions) validated before use in commands or markdown. Version strings must match semver pattern. Package names validated against Dart naming rules.

## Configuration

Extension settings live in `flutterChecker.*` namespace. Key settings:
- `enabled`: Master switch for extension functionality
- `autoCheck`: Automatic checking on file open/change/save
- `showAutoCheckNotifications`: Show notifications for auto-checks (default: false)
- Color customization: `patchUpdateColor`, `minorUpdateColor`, `majorUpdateColor` (theme-aware)
- Status bar: `showStatusBar`, `statusBarPriority`

## Dependencies

- `axios`: HTTP client for pub.dev API calls (configured with strict HTTPS/TLS requirements)
- `js-yaml`: YAML parsing for pubspec.yaml files
- `semver`: Semantic versioning comparison and validation
- VS Code API 1.75.0+

## Testing Notes

No formal test suite exists. Manual testing workflow:
1. Press F5 to launch Extension Development Host
2. Open a Flutter project with pubspec.yaml
3. Verify automatic checking, decorations, Quick Fix actions, and status bar

## Security Considerations

- All package names validated against `/^[a-z0-9_]+$/` pattern (Dart convention)
- Version strings validated against semver pattern before use
- Markdown sanitization prevents injection in hover tooltips
- HTTPS agent enforces TLS 1.2+, SSL certificate validation, max 3 redirects, 1MB response limit
- Pubspec.yaml files must be within workspace boundaries
- User-Agent header identifies extension: `Flutter-Checker-VSCode-Extension/1.2.5`
