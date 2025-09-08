# Flutter Checker

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/abdelkhalik.flutter-checker?label=VS%20Code%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=abdelkhalik.flutter-checker)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/abdelkhalik.flutter-checker?label=Downloads&color=green)](https://marketplace.visualstudio.com/items?itemName=abdelkhalik.flutter-checker)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/abdelkhalik.flutter-checker?label=Rating&color=yellow)](https://marketplace.visualstudio.com/items?itemName=abdelkhalik.flutter-checker)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A VS Code extension that helps you identify outdated packages in your Flutter/Dart `pubspec.yaml` files by highlighting version lines with visual indicators.

## Preview

![Flutter Checker in Action](https://raw.githubusercontent.com/muhmmedAbdelkhalik/flutter-checker/refs/heads/main/screenshot.png)

*The extension highlights outdated packages with version comparisons and interactive hover tooltips*

## Features

- 🔍 **Automatic Detection**: Automatically checks for outdated packages when you open or modify `pubspec.yaml` files
- 🎨 **Visual Highlighting**: Highlights outdated package versions with colored underlines and indicators
- 📊 **Simple Hover Info**: Clean hover tooltip showing current → latest version
- 🔗 **Quick Navigation**: Click to open package page on pub.dev
- ⚡ **Fast Performance**: Uses caching to minimize API calls to pub.dev
- 🎛️ **Configurable**: Customize colors, auto-check behavior, and more

## How it Works

1. **Package Detection**: The extension parses your `pubspec.yaml` file to extract package dependencies
2. **Version Checking**: It queries the pub.dev API to get the latest versions of your packages
3. **Visual Highlighting**: Outdated packages are highlighted with:
   - Colored background and border
   - Version comparison in the editor
   - Simple hover tooltip with version info
   - Overview ruler indicators

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
Simple and clean interaction with outdated packages:

1. **Hover Information**: Hover over any highlighted package to see:
   - Package name
   - Current → Latest version comparison
   - Clickable link to open pub.dev

2. **Command Palette**: Use this command:
   - `Flutter Checker: Open Package on pub.dev`

## Configuration

You can customize the extension behavior in VS Code settings:

```json
{
  "flutterChecker.enabled": true,
  "flutterChecker.autoCheck": true,
  "flutterChecker.highlightColor": "#ff6b6b",
  "flutterChecker.backgroundColor": "#ff6b6b20",
  "flutterChecker.borderColor": "#ff6b6b",
  "flutterChecker.textColor": "#ff6b6b",
  "flutterChecker.versionTextColor": "#ff6b6b",
  "flutterChecker.checkInterval": 300
}
```

### Settings

- `enabled`: Enable/disable the extension (default: `true`)
- `autoCheck`: Automatically check for outdated packages (default: `true`)
- `highlightColor`: Main highlight color for overview ruler (default: `#ff6b6b`)
- `backgroundColor`: Background color with transparency (default: `#ff6b6b20`)
- `borderColor`: Border color for highlighting (default: `#ff6b6b`)
- `textColor`: Color for the "(outdated)" label (default: `#ff6b6b`)
- `versionTextColor`: Color for version comparison text (default: `#ff6b6b`)
- `checkInterval`: Interval in seconds between automatic checks (default: `300`)

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
