import * as vscode from 'vscode';
import { OutdatedPackage, UpdateType } from './packageChecker';

export interface UpdatePreviewItem {
    packageName: string;
    currentVersion: string;
    newVersion: string;
    updateType: UpdateType;
    lineNumber: number;
    currentLine: string;
    newLine: string;
}

export class UpdatePreviewProvider {
    private panel: vscode.WebviewPanel | undefined;

    /**
     * Shows a preview of the updates that will be made to the pubspec.yaml file
     */
    async showUpdatePreview(outdatedPackages: OutdatedPackage[], document: vscode.TextDocument): Promise<void> {
        // Check if preview is enabled
        const config = vscode.workspace.getConfiguration('flutterChecker');
        const previewEnabled = config.get<boolean>('previewEnabled', true);

        if (!previewEnabled) {
            vscode.window.showInformationMessage('Update preview is disabled. You can enable it in settings.');
            return;
        }

        if (outdatedPackages.length === 0) {
            vscode.window.showInformationMessage('No outdated packages found to preview.');
            return;
        }

        // Check auto-apply setting
        const autoApplyUpdates = config.get<boolean>('autoApplyUpdates', false);
        if (autoApplyUpdates) {
            const confirm = await vscode.window.showWarningMessage(
                `Auto-apply is enabled. This will update ${outdatedPackages.length} package(s) without confirmation. Continue?`,
                { modal: true },
                'Yes',
                'Cancel'
            );

            if (confirm === 'Yes') {
                await this.applyUpdatesDirectly(outdatedPackages, document);
                return;
            } else {
                return;
            }
        }

        // Filter packages based on previewUpdateTypes setting
        const previewUpdateTypes = config.get<string[]>('previewUpdateTypes', ['patch', 'minor', 'major']);
        const filteredPackages = outdatedPackages.filter(pkg =>
            previewUpdateTypes.includes(pkg.updateType)
        );

        if (filteredPackages.length === 0) {
            vscode.window.showInformationMessage('No packages match the configured update types for preview.');
            return;
        }

        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'flutterCheckerUpdatePreview',
            'Update Preview',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: []
            }
        );

        // Generate preview data
        const previewItems = await this.generatePreviewItems(filteredPackages, document);

        // Set the webview content
        this.panel.webview.html = this.getWebviewContent(previewItems, document.fileName);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'applyUpdates':
                        await this.applyUpdates(previewItems, document);
                        this.panel?.dispose();
                        break;
                    case 'cancel':
                        this.panel?.dispose();
                        break;
                }
            },
            undefined,
            []
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private async generatePreviewItems(outdatedPackages: OutdatedPackage[], document: vscode.TextDocument): Promise<UpdatePreviewItem[]> {
        const lines = document.getText().split('\n');
        const previewItems: UpdatePreviewItem[] = [];

        for (const pkg of outdatedPackages) {
            const currentLine = lines[pkg.lineNumber];
            const newLine = this.generateUpdatedLine(currentLine, pkg.currentVersion, pkg.latestVersion);

            previewItems.push({
                packageName: pkg.name,
                currentVersion: pkg.currentVersion,
                newVersion: pkg.latestVersion,
                updateType: pkg.updateType,
                lineNumber: pkg.lineNumber,
                currentLine: currentLine,
                newLine: newLine
            });
        }

        return previewItems;
    }

    private generateUpdatedLine(currentLine: string, currentVersion: string, newVersion: string): string {
        // Replace the version in the line
        return currentLine.replace(currentVersion, newVersion);
    }

    private getWebviewContent(previewItems: UpdatePreviewItem[], fileName: string): string {
        const itemsHtml = previewItems.map(item => `
            <div class="update-item ${this.getUpdateTypeClass(item.updateType)}">
                <div class="package-header">
                    <span class="package-name">${item.packageName}</span>
                    <span class="update-badge ${this.getUpdateTypeClass(item.updateType)}">
                        ${this.getUpdateTypeLabel(item.updateType)}
                    </span>
                </div>
                <div class="version-info">
                    <div class="version-change">
                        <span class="current-version">${item.currentVersion}</span>
                        <span class="arrow">→</span>
                        <span class="new-version">${item.newVersion}</span>
                    </div>
                </div>
                <div class="line-preview">
                    <div class="current-line">
                        <span class="line-number">${item.lineNumber + 1}</span>
                        <code class="line-content">${this.escapeHtml(item.currentLine)}</code>
                    </div>
                    <div class="new-line">
                        <span class="line-number">${item.lineNumber + 1}</span>
                        <code class="line-content">${this.escapeHtml(item.newLine)}</code>
                    </div>
                </div>
            </div>
        `).join('');

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Update Preview</title>
                <style>
                    ${this.getWebviewStyles()}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📦 Update Preview</h1>
                        <p class="file-info">File: <code>${fileName}</code></p>
                        <p class="summary">Found ${previewItems.length} package(s) to update</p>
                    </div>

                    <div class="preview-content">
                        ${itemsHtml}
                    </div>

                    <div class="actions">
                        <button class="btn btn-primary" onclick="applyUpdates()">
                            ✅ Apply Updates
                        </button>
                        <button class="btn btn-secondary" onclick="cancel()">
                            ❌ Cancel
                        </button>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    function applyUpdates() {
                        vscode.postMessage({ type: 'applyUpdates' });
                    }

                    function cancel() {
                        vscode.postMessage({ type: 'cancel' });
                    }
                </script>
            </body>
            </html>
        `;
    }

    private getWebviewStyles(): string {
        return `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                padding: 20px;
            }

            .container {
                max-width: 800px;
                margin: 0 auto;
            }

            .header {
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }

            .header h1 {
                color: var(--vscode-textLink-foreground);
                margin-bottom: 10px;
            }

            .file-info {
                color: var(--vscode-descriptionForeground);
                margin-bottom: 5px;
            }

            .summary {
                color: var(--vscode-descriptionForeground);
                font-style: italic;
            }

            .preview-content {
                margin-bottom: 30px;
            }

            .update-item {
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                padding: 16px;
                margin-bottom: 16px;
                background-color: var(--vscode-editor-background);
            }

            .update-item.patch {
                border-left: 4px solid #4ecdc4;
            }

            .update-item.minor {
                border-left: 4px solid #ffa726;
            }

            .update-item.major {
                border-left: 4px solid #ff6b6b;
            }

            .package-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .package-name {
                font-weight: bold;
                font-size: 1.1em;
                color: var(--vscode-textLink-foreground);
            }

            .update-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.8em;
                font-weight: bold;
                text-transform: uppercase;
            }

            .update-badge.patch {
                background-color: #4ecdc420;
                color: #4ecdc4;
            }

            .update-badge.minor {
                background-color: #ffa72620;
                color: #ffa726;
            }

            .update-badge.major {
                background-color: #ff6b6b20;
                color: #ff6b6b;
            }

            .version-info {
                margin-bottom: 12px;
            }

            .version-change {
                display: flex;
                align-items: center;
                gap: 8px;
                font-family: 'Courier New', monospace;
            }

            .current-version {
                color: var(--vscode-descriptionForeground);
                text-decoration: line-through;
            }

            .arrow {
                color: var(--vscode-textLink-foreground);
            }

            .new-version {
                color: var(--vscode-textLink-foreground);
                font-weight: bold;
            }

            .line-preview {
                background-color: var(--vscode-textCodeBlock-background);
                border: 1px solid var(--vscode-textBlockQuote-border);
                border-radius: 4px;
                overflow: hidden;
            }

            .current-line, .new-line {
                display: flex;
                align-items: center;
                padding: 8px 12px;
            }

            .current-line {
                background-color: var(--vscode-diffEditor-removedTextBackground);
                border-bottom: 1px solid var(--vscode-textBlockQuote-border);
            }

            .new-line {
                background-color: var(--vscode-diffEditor-insertedTextBackground);
            }

            .line-number {
                color: var(--vscode-descriptionForeground);
                font-family: 'Courier New', monospace;
                margin-right: 12px;
                min-width: 40px;
                text-align: right;
            }

            .line-content {
                font-family: 'Courier New', monospace;
                color: var(--vscode-editor-foreground);
                flex: 1;
            }

            .actions {
                display: flex;
                gap: 12px;
                justify-content: center;
                padding-top: 20px;
                border-top: 1px solid var(--vscode-panel-border);
            }

            .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            }

            .btn-primary {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }

            .btn-primary:hover {
                background-color: var(--vscode-button-hoverBackground);
            }

            .btn-secondary {
                background-color: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }

            .btn-secondary:hover {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }

            .btn:focus {
                outline: 1px solid var(--vscode-focusBorder);
                outline-offset: 2px;
            }
        `;
    }

    private getUpdateTypeClass(updateType: UpdateType): string {
        switch (updateType) {
            case UpdateType.PATCH:
                return 'patch';
            case UpdateType.MINOR:
                return 'minor';
            case UpdateType.MAJOR:
                return 'major';
            default:
                return 'unknown';
        }
    }

    private getUpdateTypeLabel(updateType: UpdateType): string {
        switch (updateType) {
            case UpdateType.PATCH:
                return 'Patch';
            case UpdateType.MINOR:
                return 'Minor';
            case UpdateType.MAJOR:
                return 'Major';
            default:
                return 'Unknown';
        }
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private async applyUpdates(previewItems: UpdatePreviewItem[], document: vscode.TextDocument): Promise<void> {
        const workspaceEdit = new vscode.WorkspaceEdit();

        // Sort by line number in descending order to avoid offset issues
        const sortedItems = [...previewItems].sort((a, b) => b.lineNumber - a.lineNumber);

        for (const item of sortedItems) {
            const line = document.lineAt(item.lineNumber);
            const range = line.range;

            // Replace the entire line with the updated line
            workspaceEdit.replace(document.uri, range, item.newLine);
        }

        // Apply the workspace edit
        const success = await vscode.workspace.applyEdit(workspaceEdit);

        if (success) {
            vscode.window.showInformationMessage(
                `Successfully updated ${previewItems.length} package(s) in pubspec.yaml`
            );

            // Refresh the decorations after applying updates
            vscode.commands.executeCommand('flutter-checker.checkOutdated');
        } else {
            vscode.window.showErrorMessage('Failed to apply updates to pubspec.yaml');
        }
    }

    private async applyUpdatesDirectly(outdatedPackages: OutdatedPackage[], document: vscode.TextDocument): Promise<void> {
        const previewItems = await this.generatePreviewItems(outdatedPackages, document);
        await this.applyUpdates(previewItems, document);
    }

    dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }
}
