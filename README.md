# Flutter Checker

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/abdelkhalik.flutter-checker?label=VS%20Code%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=abdelkhalik.flutter-checker)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/abdelkhalik.flutter-checker?label=Downloads&color=green)](https://marketplace.visualstudio.com/items?itemName=abdelkhalik.flutter-checker)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/abdelkhalik.flutter-checker?label=Rating&color=yellow)](https://marketplace.visualstudio.com/items?itemName=abdelkhalik.flutter-checker)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A VS Code extension that helps you identify outdated packages in your Flutter/Dart `pubspec.yaml` files with intelligent color-coded highlighting and detailed update information.

## Preview

![Flutter Checker in Action](https://raw.githubusercontent.com/muhmmedAbdelkhalik/flutter-checker/refs/heads/main/assets/screenshot.png)

*The extension highlights outdated packages with color-coded update types, version comparisons, and rich hover tooltips*

## Features

- 🔍 **Smart Detection**: Automatically checks for outdated packages when you open or modify `pubspec.yaml` files
- 🎨 **Color-Coded Updates**: Visual highlighting with different colors for patch (🔧), minor (✨), and major (⚠️) updates
- 📊 **Rich Hover Information**: Detailed hover tooltips showing current → latest version with update type descriptions
- 🔗 **Quick Navigation**: Click to open package page on pub.dev directly from hover tooltips
- ⚡ **Fast Performance**: Intelligent caching system minimizes API calls to pub.dev (5-minute cache)
- 🎛️ **Highly Configurable**: Customize colors for each update type, theme-aware color schemes, and more
- 📈 **Progress Indicators**: Visual progress feedback during package checking
- 🎯 **Precise Highlighting**: Highlights only the version specification, not the entire line

## How it Works

1. **Package Detection**: The extension parses your `pubspec.yaml` file to extract package dependencies
2. **Version Checking**: It queries the pub.dev API to get the latest versions of your packages (with intelligent caching)
3. **Update Classification**: Uses semantic versioning to categorize updates as:
   - 🔧 **Patch Updates**: Bug fixes and small improvements
   - ✨ **Minor Updates**: New features (backward compatible)
   - ⚠️ **Major Updates**: Breaking changes
4. **Visual Highlighting**: Outdated packages are highlighted with:
   - Color-coded underlines based on update type
   - Version comparison showing current → latest
   - Rich hover tooltips with update type descriptions
   - Overview ruler indicators with appropriate colors
   - Clickable links to pub.dev

## Usage

### Automatic Mode (Default)
The extension automatically checks for outdated packages when:
- You open a `pubspec.yaml` file
- You modify a `pubspec.yaml` file
- The file is saved

### Manual Mode
You can also manually trigger the check:
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `Flutter Checker: Check for Outdated Packages`

### Clear Highlights
To remove all highlights:
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `Flutter Checker: Clear Package Highlights`

### Navigation Features
Rich interaction with outdated packages:

1. **Hover Information**: Hover over any highlighted package to see:
   - Package name with emoji indicators
   - Current → Latest version comparison
   - Update type description (Patch/Minor/Major)
   - Clickable link to open pub.dev

2. **Progress Feedback**: When checking packages, you'll see:
   - Progress notification with current status
   - "Parsing pubspec.yaml..." → "Applying highlights..." → "Complete!"
   - Summary message showing number of outdated packages found

3. **Command Palette**: Available commands:
   - `Flutter Checker: Check for Outdated Packages` - Manual check
   - `Flutter Checker: Clear Package Highlights` - Remove all highlights
   - `Flutter Checker: Open Package on pub.dev` - Open specific package

## Configuration

You can customize the extension behavior in VS Code settings:

```json
{
  "flutterChecker.enabled": true,
  "flutterChecker.highlightColor": "#ff6b6b",
  "flutterChecker.backgroundColor": "#ff6b6b20",
  "flutterChecker.borderColor": "#ff6b6b",
  "flutterChecker.textColor": "#ff6b6b",
  "flutterChecker.versionTextColor": "#ff6b6b",
  "flutterChecker.patchUpdateColor": "#4ecdc4",
  "flutterChecker.minorUpdateColor": "#ffa726",
  "flutterChecker.majorUpdateColor": "#ff6b6b"
}
```

### Settings

#### Core Settings
- `enabled`: Enable/disable the extension (default: `true`)
- `highlightColor`: Main highlight color for overview ruler (default: `#ff6b6b`)
- `backgroundColor`: Background color with transparency (default: `#ff6b6b20`)
- `borderColor`: Border color for highlighting (default: `#ff6b6b`)
- `textColor`: Color for the "(outdated)" label (default: `#ff6b6b`)
- `versionTextColor`: Color for version comparison text (default: `#ff6b6b`)

#### Update Type Colors (Theme-Aware)
- `patchUpdateColor`: Color for patch updates - bug fixes (default: `#4ecdc4` / `#2d7d7d` for dark theme)
- `minorUpdateColor`: Color for minor updates - new features (default: `#ffa726` / `#cc8500` for dark theme)
- `majorUpdateColor`: Color for major updates - breaking changes (default: `#ff6b6b` / `#cc5555` for dark theme)

> **Note**: Update type colors automatically adapt to your VS Code theme. Light theme uses the default colors, while dark theme uses darker variants for better visibility.

### Commands Available

- `Flutter Checker: Check for Outdated Packages` - Manual check
- `Flutter Checker: Clear Package Highlights` - Remove highlights
- `Flutter Checker: Open Package on pub.dev` - Open package page

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Flutter Checker"
4. Click Install

### From Source
1. Clone this repository:
   ```bash
   git clone https://github.com/muhmmedAbdelkhalik/flutter-checker.git
   cd flutter-checker
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run compile
   ```
4. Press `F5` to run the extension in a new Extension Development Host window

## Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- VS Code

### Building
```bash
npm install
npm run compile
```

### Testing
```bash
npm run watch
```
Then press `F5` in VS Code to run the extension in a new window.

## Compatibility

- **VS Code**: 1.74.0 or higher
- **Cursor**: Compatible (uses VS Code extension API)
- **Platforms**: Windows, macOS, Linux

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues or have feature requests, please file an issue on the GitHub repository.
