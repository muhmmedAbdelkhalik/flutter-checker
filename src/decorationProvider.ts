import * as vscode from 'vscode';
import { OutdatedPackage, UpdateType } from './packageChecker';

export class DecorationProvider {
    private decorationTypes: Map<UpdateType, vscode.TextEditorDecorationType> = new Map();
    private activeDecorations: vscode.TextEditorDecorationType[] = [];

    constructor() {
        this.createDecorationTypes();
    }

    private getThemeAwareColor(configKey: string, lightColor: string, darkColor: string): string {
        const config = vscode.workspace.getConfiguration('flutterChecker');
        const customColor = config.get<string>(configKey);
        
        if (customColor && customColor.trim() !== '') {
            return customColor;
        }
        
        // Use theme-aware colors
        const colorTheme = vscode.window.activeColorTheme;
        return colorTheme.kind === vscode.ColorThemeKind.Dark ? darkColor : lightColor;
    }

    private createDecorationTypes() {
        // Get theme-aware colors
        const patchColor = this.getThemeAwareColor('patchUpdateColor', '#4ecdc4', '#2d7d7d');
        const minorColor = this.getThemeAwareColor('minorUpdateColor', '#ffa726', '#cc8500');
        const majorColor = this.getThemeAwareColor('majorUpdateColor', '#ff6b6b', '#cc5555');
        
        this.decorationTypes.set(UpdateType.PATCH, vscode.window.createTextEditorDecorationType({
            border: `1px solid ${patchColor}`,
            borderStyle: 'solid',
            borderWidth: '0 0 1.5px 0',
            overviewRulerColor: patchColor,
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                contentText: ' (patch)',
                color: patchColor,
                fontWeight: 'bold',
                margin: '0 0 0 0.5em'
            }
        }));
        
        this.decorationTypes.set(UpdateType.MINOR, vscode.window.createTextEditorDecorationType({
            border: `1px solid ${minorColor}`,
            borderStyle: 'solid',
            borderWidth: '0 0 1.5px 0',
            overviewRulerColor: minorColor,
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                contentText: ' (minor)',
                color: minorColor,
                fontWeight: 'bold',
                margin: '0 0 0 0.5em'
            }
        }));
        
        this.decorationTypes.set(UpdateType.MAJOR, vscode.window.createTextEditorDecorationType({
            border: `1px solid ${majorColor}`,
            borderStyle: 'solid',
            borderWidth: '0 0 1.5px 0',
            overviewRulerColor: majorColor,
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                contentText: ' (major)',
                color: majorColor,
                fontWeight: 'bold',
                margin: '0 0 0 0.5em'
            }
        }));
    }

    updateDecorations(editor: vscode.TextEditor, outdatedPackages: OutdatedPackage[]) {
        // Clear existing decorations
        this.clearDecorations();

        if (outdatedPackages.length === 0) {
            return;
        }

        // Group packages by update type
        const packagesByType = new Map<UpdateType, OutdatedPackage[]>();
        for (const pkg of outdatedPackages) {
            if (!packagesByType.has(pkg.updateType)) {
                packagesByType.set(pkg.updateType, []);
            }
            packagesByType.get(pkg.updateType)!.push(pkg);
        }

        // Apply decorations for each update type
        for (const [updateType, packages] of packagesByType) {
            const decorationType = this.decorationTypes.get(updateType);
            if (!decorationType) {
                continue;
            }

            const decorations: vscode.DecorationOptions[] = [];

            for (const pkg of packages) {
                let color: string;
                
                switch (pkg.updateType) {
                    case UpdateType.PATCH:
                        color = this.getThemeAwareColor('patchUpdateColor', '#4ecdc4', '#2d7d7d');
                        break;
                    case UpdateType.MINOR:
                        color = this.getThemeAwareColor('minorUpdateColor', '#ffa726', '#cc8500');
                        break;
                    case UpdateType.MAJOR:
                        color = this.getThemeAwareColor('majorUpdateColor', '#ff6b6b', '#cc5555');
                        break;
                    default:
                        color = this.getThemeAwareColor('majorUpdateColor', '#ff6b6b', '#cc5555');
                }

                const decoration: vscode.DecorationOptions = {
                    range: pkg.range,
                    hoverMessage: this.createHoverMessage(pkg),
                    renderOptions: {
                        after: {
                            contentText: ` → ${pkg.latestVersion}`,
                            color: color,
                            fontWeight: 'bold',
                            margin: '0 0 0 1em'
                        }
                    }
                };

                decorations.push(decoration);
            }

            // Apply decorations for this update type
            editor.setDecorations(decorationType, decorations);
            this.activeDecorations.push(decorationType);
        }
    }

    /**
     * Sanitize string for safe use in markdown to prevent injection attacks
     */
    private sanitizeForMarkdown(str: string): string {
        if (!str || typeof str !== 'string') {
            return '';
        }
        // Escape markdown special characters and remove any potential command injection
        return str
            .replace(/[\\`*_{}[\]()#+\-.!|]/g, '\\$&') // Escape markdown syntax
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/\n/g, ' '); // Remove newlines
    }

    private createHoverMessage(pkg: OutdatedPackage): vscode.MarkdownString {
        const message = new vscode.MarkdownString();

        // Sanitize all user-controlled input before embedding in markdown
        const safeName = this.sanitizeForMarkdown(pkg.name);
        const safeCurrentVersion = this.sanitizeForMarkdown(pkg.currentVersion);
        const safeLatestVersion = this.sanitizeForMarkdown(pkg.latestVersion);

        message.appendMarkdown(`## 📦 ${safeName}\n\n`);
        message.appendMarkdown(`**Current:** \`${safeCurrentVersion}\` → **Latest:** \`${safeLatestVersion}\`\n\n`);
        
        // Add update type information
        const updateTypeEmoji = this.getUpdateTypeEmoji(pkg.updateType);
        const updateTypeDescription = this.getUpdateTypeDescription(pkg.updateType);
        message.appendMarkdown(`**Update Type:** ${updateTypeEmoji} ${updateTypeDescription}\n\n`);

        // Add quick actions with validated data
        // Note: pkg.name and pkg.latestVersion have already been validated by packageChecker
        const argsWithPubGet = encodeURIComponent(JSON.stringify({
            packageName: pkg.name, // Already validated by sanitizePackageName
            latestVersion: pkg.latestVersion, // Already validated by isValidVersionString
            range: {
                start: { line: pkg.range.start.line, character: pkg.range.start.character },
                end: { line: pkg.range.end.line, character: pkg.range.end.character }
            },
            keepPrefix: true,
            runPubGet: true
        }));
        const argsNoPubGet = encodeURIComponent(JSON.stringify({
            packageName: pkg.name, // Already validated by sanitizePackageName
            latestVersion: pkg.latestVersion, // Already validated by isValidVersionString
            range: {
                start: { line: pkg.range.start.line, character: pkg.range.start.character },
                end: { line: pkg.range.end.line, character: pkg.range.end.character }
            },
            keepPrefix: true,
            runPubGet: false
        }));

        message.isTrusted = true; // Required for command links
        message.appendMarkdown(
            `[Update to ${safeLatestVersion}](command:flutter-checker.updatePackage?${argsWithPubGet}) | ` +
            `[Update (no pub get)](command:flutter-checker.updatePackageNoInstall?${argsNoPubGet})\n`
        );

        return message;
    }

    private getUpdateTypeEmoji(updateType: UpdateType): string {
        switch (updateType) {
            case UpdateType.PATCH:
                return '🔧';
            case UpdateType.MINOR:
                return '✨';
            case UpdateType.MAJOR:
                return '⚠️';
            default:
                return '📦';
        }
    }

    private getUpdateTypeDescription(updateType: UpdateType): string {
        switch (updateType) {
            case UpdateType.PATCH:
                return 'Patch Update (Bug fixes)';
            case UpdateType.MINOR:
                return 'Minor Update (New features)';
            case UpdateType.MAJOR:
                return 'Major Update (Breaking changes)';
            default:
                return 'Unknown Update';
        }
    }

    clearDecorations() {
        // Clear all active decorations
        for (const decoration of this.activeDecorations) {
            decoration.dispose();
        }
        this.activeDecorations = [];

        // Clear all decoration types
        for (const decorationType of this.decorationTypes.values()) {
            decorationType.dispose();
        }
        this.decorationTypes.clear();

        // Recreate the decoration types for future use
        this.createDecorationTypes();
    }

    dispose() {
        this.clearDecorations();
    }
}