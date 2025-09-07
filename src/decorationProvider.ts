import * as vscode from 'vscode';
import { OutdatedPackage } from './packageChecker';

export class DecorationProvider {
    private decorationType!: vscode.TextEditorDecorationType;
    private activeDecorations: vscode.TextEditorDecorationType[] = [];

    constructor() {
        this.createDecorationType();
    }

    private createDecorationType() {
        const config = vscode.workspace.getConfiguration('flutterChecker');
        const highlightColor = config.get('highlightColor', '#ff6b6b');
        
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: `${highlightColor}20`, // 20% opacity
            border: `1px solid ${highlightColor}`,
            borderStyle: 'solid',
            borderWidth: '0 0 2px 0',
            overviewRulerColor: highlightColor,
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                contentText: ' (outdated)',
                color: highlightColor,
                fontWeight: 'bold',
                margin: '0 0 0 1em'
            }
        });
    }

    updateDecorations(editor: vscode.TextEditor, outdatedPackages: OutdatedPackage[]) {
        // Clear existing decorations
        this.clearDecorations();

        if (outdatedPackages.length === 0) {
            return;
        }

        // Create decorations for each outdated package
        const decorations: vscode.DecorationOptions[] = [];

        for (const pkg of outdatedPackages) {
            const decoration: vscode.DecorationOptions = {
                range: pkg.range,
                hoverMessage: this.createHoverMessage(pkg),
                renderOptions: {
                    after: {
                        contentText: ` → ${pkg.latestVersion}`,
                        color: '#ff6b6b',
                        fontWeight: 'bold',
                        margin: '0 0 0 1em'
                    }
                }
            };

            decorations.push(decoration);
        }

        // Apply decorations
        editor.setDecorations(this.decorationType, decorations);
        this.activeDecorations.push(this.decorationType);
    }

    private createHoverMessage(pkg: OutdatedPackage): vscode.MarkdownString {
        const message = new vscode.MarkdownString();
        message.appendMarkdown(`## 📦 ${pkg.name}\n\n`);
        message.appendMarkdown(`**Current:** \`${pkg.currentVersion}\` → **Latest:** \`${pkg.latestVersion}\`\n\n`);
        message.appendMarkdown(`[Open on pub.dev](command:flutter-checker.openPubDev?${encodeURIComponent(JSON.stringify(pkg.name))})`);
        
        message.isTrusted = true;
        return message;
    }

    clearDecorations() {
        // Clear all active decorations
        for (const decoration of this.activeDecorations) {
            decoration.dispose();
        }
        this.activeDecorations = [];

        // Recreate the decoration type for future use
        this.createDecorationType();
    }

    dispose() {
        this.clearDecorations();
    }
}
