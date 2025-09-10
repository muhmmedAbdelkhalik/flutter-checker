# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Released]

## [1.2.3] - 2025-09-10

### 🚀 Added
- **Status Bar Tracking**: Real-time status bar display showing package update counts and checking status
- **Status Bar Configuration**: New settings for controlling status bar visibility and priority position
  - `flutterChecker.showStatusBar`: Enable/disable status bar item (default: `true`)
  - `flutterChecker.statusBarPriority`: Control status bar item position (default: `100`)

### 🔧 Removed
- **Open Package Command**: Removed "Open Package on pub.dev" command and its activation event for cleaner interface

### 🎯 Enhanced
- **User Experience**: Streamlined command palette with focus on core functionality
- **Status Visibility**: Better visibility of package checking progress and results through status bar
- **Configuration**: More granular control over extension behavior and display options

## [1.1.4] - 2025-09-09

### 🔧 Fixed
- **Command registration reliability**: Enhanced activation events to ensure commands are always available
- **Extension activation**: Added `workspaceContains:**/pubspec.yaml` and `onCommand:` activation events
- **Production stability**: Removed excessive debug logging while maintaining error reporting

## [1.1.3] - 2025-09-09

### 🚀 Added
- **Smart Detection**: Automatic package checking when opening/modifying pubspec.yaml files
- **Production-grade error handling**: Comprehensive try-catch blocks and graceful degradation
- **Command registration verification**: Extension now verifies all commands are properly registered
- **Network resilience**: Enhanced API calls with 15s timeout, User-Agent headers, and proper error handling
- **Memory management**: Proper cleanup of resources, timeouts, and caches on deactivation
- **Input validation**: All user inputs are validated and sanitized before processing
- **Auto-check configuration**: `flutterChecker.autoCheck` and `flutterChecker.showAutoCheckNotifications` settings

### 🔧 Fixed
- **CRITICAL**: "command 'flutter-checker.checkOutdated' not found" error completely eliminated
- **Missing command**: Added `flutter-checker.clearHighlights` command to package.json
- **Race conditions**: Fixed async event listener failures during extension activation
- **Silent failures**: All errors now provide proper user feedback and detailed logging
- **Memory leaks**: Proper resource cleanup prevents memory leaks and conflicts
- **Network failures**: Graceful handling of connection issues and API timeouts

### 🎯 Enhanced
- **API reliability**: Increased timeout from 10s to 15s for production stability
- **Error logging**: Detailed context in all error messages for better debugging
- **Package validation**: Skip Flutter SDK packages and validate package names
- **URL encoding**: Proper encoding of package names for API requests
- **Version validation**: Enhanced semver validation before comparisons

### 📊 Performance
- **Debounced updates**: 2-second delay for file changes prevents API spam
- **Smart caching**: 5-minute cache with proper cleanup
- **Event optimization**: Only process pubspec.yaml files, skip irrelevant events

## [1.1.2] - 2025-09-09

### Added
- Automated version bump to 1.1.2


## [1.1.1] - 2025-09-09

### Added
- Automated version bump to 1.1.1


## [1.1.0] - 2025-01-27

### Added
- Color-coded update type highlighting (Patch, Minor, Major updates)
- Theme-aware color schemes that adapt to light/dark themes
- Rich hover tooltips with detailed update information and emoji indicators
- Progress indicators during package checking with status messages
- Intelligent caching system (5-minute cache duration) for better performance
- Precise highlighting of version specifications only (not entire lines)
- Enhanced configuration options for each update type color
- Improved README documentation with comprehensive feature descriptions

### Changed
- Updated visual highlighting to use different colors for different update types:
  - 🔧 Patch updates (bug fixes): Teal color scheme
  - ✨ Minor updates (new features): Orange color scheme  
  - ⚠️ Major updates (breaking changes): Red color scheme
- Enhanced hover messages with update type descriptions and clickable pub.dev links
- Reorganized project structure with assets directory for better organization
- Updated package.json icon path to point to assets directory
- Improved README with detailed usage instructions and configuration options

### Fixed
- Screenshot path references in README after moving assets to dedicated directory
- Theme compatibility issues with automatic color adaptation


## [1.0.10] - 2025-09-08

### Added
- Automated version bump to 1.0.10


## [1.0.9] - 2025-09-08

### Added
- Automated version bump to 1.0.9


## [1.0.8] - 2025-09-08

### Added
- GitHub Actions workflows for automated version bumping and publishing
- Automated release process with VS Code marketplace publishing
- Version bump workflow with patch/minor/major options
- Release workflow triggered by GitHub releases

### Fixed
- Command registration issues with proper activation events
- Runtime dependencies included in extension package
- Screenshot display in marketplace preview
- Extension activation reliability

### Changed
- Updated package.json with new build scripts
- Added vsce as dev dependency
- Improved extension packaging process

## [1.0.7] - 2025-09-07

### Fixed
- Screenshot URL for marketplace preview
- Extension command availability
- Package activation events

## [1.0.6] - 2025-09-07

### Added
- Screenshot to README for marketplace preview
- Dark theme gallery banner

### Fixed
- Extension packaging with runtime dependencies

## [1.0.5] - 2025-09-07

### Added
- Screenshot to extension package
- Gallery banner configuration

## [1.0.4] - 2025-09-07

### Fixed
- Extension activation events
- Command registration
- Runtime dependencies packaging

## [1.0.3] - 2025-09-07

### Fixed
- Extension activation issues
- Command availability in VS Code

## [1.0.2] - 2025-09-07

### Fixed
- Extension packaging with Node.js 20
- VS Code marketplace compatibility

## [1.0.1] - 2025-09-07

### Fixed
- Initial extension packaging issues

## [1.0.0] - 2025-09-07

### Added
- Initial release of Flutter Checker extension
- Automatic detection of outdated packages in pubspec.yaml
- Visual highlighting of outdated package versions
- Hover tooltips with version information
- Quick navigation to pub.dev
- Configurable colors and settings
- File watcher for automatic checking
- Command palette integration
