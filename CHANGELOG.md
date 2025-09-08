# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
