# Flutter Checker

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/abdelkhalik.flutter-checker?label=VS%20Code%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=abdelkhalik.flutter-checker)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/abdelkhalik.flutter-checker?label=Downloads&color=green)](https://marketplace.visualstudio.com/items?itemName=abdelkhalik.flutter-checker)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/abdelkhalik.flutter-checker?label=Rating&color=yellow)](https://marketplace.visualstudio.com/items?itemName=abdelkhalik.flutter-checker)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A VS Code extension that helps you identify outdated packages in your Flutter/Dart `pubspec.yaml` files with intelligent color-coded highlighting, real-time status tracking, and smart workspace detection.

## Preview

![Flutter Checker in Action](https://raw.githubusercontent.com/muhmmedAbdelkhalik/flutter-checker/refs/heads/main/assets/screenshot.png)

*The extension highlights outdated packages with color-coded update types, version comparisons, and rich hover tooltips*

## Features

- 🔍 **Smart Detection**: Automatically finds and opens pubspec.yaml files from anywhere in workspace
- 📊 **Status Bar**: Real-time package counts and checking progress
- 🎨 **Color-Coded Updates**: Different colors for patch (🔧), minor (✨), and major (⚠️) updates
- ⚡ **Fast & Reliable**: Intelligent caching with 5-minute cache duration
- 🎛️ **Highly Configurable**: Customize colors, status bar behavior, and theme-aware schemes

## How it Works

1. **Auto-detects** Flutter projects in your workspace
2. **Checks** package versions against pub.dev API
3. **Highlights** outdated packages with color-coded indicators
4. **Shows** status updates in the status bar

**Update Types:**
- 🔧 **Patch**: Bug fixes (green)
- ✨ **Minor**: New features (orange)
- ⚠️ **Major**: Breaking changes (red)

## Usage

### Automatic (Default)
Checks packages when you open or modify `pubspec.yaml` files.

### Manual Check
- **Command Palette**: `Flutter Checker: Check for Outdated Packages`
- **Status Bar**: Click the status bar icon from anywhere in your workspace

### Status Bar States
- `$(package) Flutter Checker` - Ready to check
- `$(sync~spin) Checking...` - In progress
- `$(check) Up to date` - All packages current
- `$(warning) X outdated` - Packages need updates
- `$(error) Check failed` - Error occurred

### Clear Highlights
Run `Flutter Checker: Clear Package Highlights` from command palette.

## Configuration

### Key Settings
- `flutterChecker.enabled`: Enable/disable extension (default: `true`)
- `flutterChecker.autoCheck`: Auto-check on file changes (default: `true`)
- `flutterChecker.showStatusBar`: Show status bar indicator (default: `true`)
- `flutterChecker.patchUpdateColor`: Color for patch updates (default: `#4ecdc4`)
- `flutterChecker.minorUpdateColor`: Color for minor updates (default: `#ffa726`)
- `flutterChecker.majorUpdateColor`: Color for major updates (default: `#ff6b6b`)

**Colors automatically adapt to light/dark themes.**

### Commands
- `Flutter Checker: Check for Outdated Packages`
- `Flutter Checker: Clear Package Highlights`

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Flutter Checker"
4. Click Install

### From Source
```bash
git clone https://github.com/muhmmedAbdelkhalik/flutter-checker.git
cd flutter-checker
npm install && npm run compile
```

**Requirements:** VS Code 1.74.0+, Node.js 16+

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues or have feature requests, please file an issue on the GitHub repository.

