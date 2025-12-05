import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { OutdatedPackage, UpdateType } from './packageChecker';

export interface BulkUpdateOptions {
    packages: OutdatedPackage[];
    runPubGet: boolean;
    showPreview: boolean;
}

export interface BulkUpdateResult {
    success: boolean;
    updatedCount: number;
    failedCount: number;
    failedPackages: string[];
}

export class BulkUpdateProvider {
    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Update all safe packages (PATCH + MINOR versions)
     */
    async updateAllSafe(document: vscode.TextDocument, packages: OutdatedPackage[]): Promise<BulkUpdateResult> {
        const safePackages = packages.filter(pkg =>
            pkg.updateType === UpdateType.PATCH || pkg.updateType === UpdateType.MINOR
        );

        if (safePackages.length === 0) {
            vscode.window.showInformationMessage('No safe updates available.');
            return { success: true, updatedCount: 0, failedCount: 0, failedPackages: [] };
        }

        const patchCount = safePackages.filter(p => p.updateType === UpdateType.PATCH).length;
        const minorCount = safePackages.filter(p => p.updateType === UpdateType.MINOR).length;

        const confirmed = await vscode.window.showInformationMessage(
            `Update ${safePackages.length} safe packages? (${patchCount} patch, ${minorCount} minor)`,
            { modal: true },
            'Update All',
            'Cancel'
        );

        if (confirmed !== 'Update All') {
            return { success: false, updatedCount: 0, failedCount: 0, failedPackages: [] };
        }

        return this.applyBulkUpdate({
            packages: safePackages,
            runPubGet: true,
            showPreview: false
        }, document);
    }

    /**
     * Update all PATCH versions only (safest)
     */
    async updateAllPatch(document: vscode.TextDocument, packages: OutdatedPackage[]): Promise<BulkUpdateResult> {
        const patchPackages = packages.filter(pkg => pkg.updateType === UpdateType.PATCH);

        if (patchPackages.length === 0) {
            vscode.window.showInformationMessage('No patch updates available.');
            return { success: true, updatedCount: 0, failedCount: 0, failedPackages: [] };
        }

        const confirmed = await vscode.window.showInformationMessage(
            `Update ${patchPackages.length} patch versions? (Safest - no breaking changes)`,
            { modal: true },
            'Update All',
            'Cancel'
        );

        if (confirmed !== 'Update All') {
            return { success: false, updatedCount: 0, failedCount: 0, failedPackages: [] };
        }

        return this.applyBulkUpdate({
            packages: patchPackages,
            runPubGet: true,
            showPreview: false
        }, document);
    }

    /**
     * Interactive bulk update with package selection
     */
    async interactiveBulkUpdate(document: vscode.TextDocument, packages: OutdatedPackage[]): Promise<BulkUpdateResult> {
        if (packages.length === 0) {
            vscode.window.showInformationMessage('No updates available.');
            return { success: true, updatedCount: 0, failedCount: 0, failedPackages: [] };
        }

        // Step 1: Show preset options
        const preset = await vscode.window.showQuickPick([
            {
                label: '$(rocket) Update All Safe Packages',
                description: 'Patch + Minor versions only',
                value: 'safe',
                detail: `${packages.filter(p => p.updateType === UpdateType.PATCH || p.updateType === UpdateType.MINOR).length} packages`
            },
            {
                label: '$(check) Update Patch Versions Only',
                description: 'Safest - no breaking changes',
                value: 'patch',
                detail: `${packages.filter(p => p.updateType === UpdateType.PATCH).length} packages`
            },
            {
                label: '$(list-selection) Custom Selection',
                description: 'Choose specific packages',
                value: 'custom'
            },
            {
                label: '$(warning) Update Everything',
                description: 'Including major versions',
                value: 'all',
                detail: `${packages.length} packages (⚠️ may include breaking changes)`
            }
        ], {
            placeHolder: 'Choose update strategy',
            title: 'Bulk Package Update'
        });

        if (!preset) {
            return { success: false, updatedCount: 0, failedCount: 0, failedPackages: [] };
        }

        let selectedPackages: OutdatedPackage[] = [];

        switch (preset.value) {
            case 'safe':
                selectedPackages = packages.filter(p => p.updateType === UpdateType.PATCH || p.updateType === UpdateType.MINOR);
                break;
            case 'patch':
                selectedPackages = packages.filter(p => p.updateType === UpdateType.PATCH);
                break;
            case 'all':
                selectedPackages = packages;
                break;
            case 'custom':
                selectedPackages = await this.showPackageSelector(packages);
                break;
        }

        if (selectedPackages.length === 0) {
            return { success: false, updatedCount: 0, failedCount: 0, failedPackages: [] };
        }

        // Step 2: Show preview and confirm
        const confirmed = await this.showUpdatePreview(selectedPackages);
        if (!confirmed) {
            return { success: false, updatedCount: 0, failedCount: 0, failedPackages: [] };
        }

        return this.applyBulkUpdate({
            packages: selectedPackages,
            runPubGet: true,
            showPreview: false
        }, document);
    }

    /**
     * Show package selector with checkboxes
     */
    private async showPackageSelector(packages: OutdatedPackage[]): Promise<OutdatedPackage[]> {
        const items = packages.map(pkg => ({
            label: pkg.name,
            description: `${pkg.currentVersion} → ${pkg.latestVersion}`,
            detail: `${this.getUpdateTypeEmoji(pkg.updateType)} ${pkg.updateType}`,
            picked: pkg.updateType === UpdateType.PATCH || pkg.updateType === UpdateType.MINOR, // Pre-select safe updates
            package: pkg
        }));

        const selected = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: 'Select packages to update (safe updates pre-selected)',
            title: 'Select Packages'
        });

        return selected ? selected.map(item => item.package) : [];
    }

    /**
     * Show preview of changes before applying
     */
    private async showUpdatePreview(packages: OutdatedPackage[]): Promise<boolean> {
        const patchCount = packages.filter(p => p.updateType === UpdateType.PATCH).length;
        const minorCount = packages.filter(p => p.updateType === UpdateType.MINOR).length;
        const majorCount = packages.filter(p => p.updateType === UpdateType.MAJOR).length;

        let message = `Update ${packages.length} package(s)?`;
        const details: string[] = [];

        if (patchCount > 0) details.push(`${patchCount} patch`);
        if (minorCount > 0) details.push(`${minorCount} minor`);
        if (majorCount > 0) details.push(`${majorCount} major ⚠️`);

        if (details.length > 0) {
            message += ` (${details.join(', ')})`;
        }

        const packageList = packages.map(pkg =>
            `  ${pkg.name}: ${pkg.currentVersion} → ${pkg.latestVersion}`
        ).join('\n');

        const choice = await vscode.window.showInformationMessage(
            message,
            { modal: true, detail: packageList },
            'Update',
            'Cancel'
        );

        return choice === 'Update';
    }

    /**
     * Apply bulk update to document
     */
    private async applyBulkUpdate(options: BulkUpdateOptions, document: vscode.TextDocument): Promise<BulkUpdateResult> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Updating packages',
            cancellable: false
        }, async (progress) => {
            const edit = new vscode.WorkspaceEdit();
            const failedPackages: string[] = [];
            let updatedCount = 0;

            // Read the document content
            const text = document.getText();
            const lines = text.split('\n');

            for (let i = 0; i < options.packages.length; i++) {
                const pkg = options.packages[i];

                progress.report({
                    message: `Updating ${pkg.name} (${i + 1}/${options.packages.length})`,
                    increment: (100 / options.packages.length)
                });

                try {
                    // Find the line with this package
                    const lineIndex = lines.findIndex(line => {
                        const match = line.match(/^\s*([a-z0-9_]+):\s*(.+)$/);
                        return match && match[1] === pkg.name;
                    });

                    if (lineIndex === -1) {
                        failedPackages.push(pkg.name);
                        continue;
                    }

                    const line = lines[lineIndex];
                    const versionMatch = line.match(/^(\s*[a-z0-9_]+:\s*)(.+)$/);

                    if (!versionMatch) {
                        failedPackages.push(pkg.name);
                        continue;
                    }

                    const prefix = versionMatch[1];
                    const newVersion = this.formatVersion(pkg.latestVersion);
                    const newLine = `${prefix}${newVersion}`;

                    const range = new vscode.Range(
                        new vscode.Position(lineIndex, 0),
                        new vscode.Position(lineIndex, line.length)
                    );

                    edit.replace(document.uri, range, newLine);
                    updatedCount++;
                } catch (error) {
                    failedPackages.push(pkg.name);
                }
            }

            // Apply all edits
            const applied = await vscode.workspace.applyEdit(edit);

            if (!applied) {
                vscode.window.showErrorMessage('Failed to apply package updates');
                return { success: false, updatedCount: 0, failedCount: options.packages.length, failedPackages: options.packages.map(p => p.name) };
            }

            // Save the document
            await document.save();

            // Run flutter pub get if requested
            if (options.runPubGet) {
                progress.report({ message: 'Running flutter pub get...' });
                await this.runFlutterPubGet(document);
            }

            // Show result
            this.showResult({ success: true, updatedCount, failedCount: failedPackages.length, failedPackages });

            return { success: true, updatedCount, failedCount: failedPackages.length, failedPackages };
        });
    }

    /**
     * Format version string (preserves ^, ~, or exact version style)
     */
    private formatVersion(version: string): string {
        // Default to caret (^) for version constraints
        if (!version.startsWith('^') && !version.startsWith('~')) {
            return `^${version}`;
        }
        return version;
    }

    /**
     * Run flutter pub get
     */
    private async runFlutterPubGet(document: vscode.TextDocument): Promise<void> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            return;
        }

        const terminal = vscode.window.createTerminal({
            name: 'Flutter Pub Get',
            cwd: workspaceFolder.uri.fsPath
        });

        terminal.sendText('flutter pub get');
        terminal.show();
    }

    /**
     * Show result notification
     */
    private showResult(result: BulkUpdateResult): void {
        if (result.updatedCount === 0 && result.failedCount === 0) {
            return;
        }

        if (result.failedCount === 0) {
            vscode.window.showInformationMessage(
                `✅ Successfully updated ${result.updatedCount} package(s)!`
            );
        } else if (result.updatedCount === 0) {
            vscode.window.showErrorMessage(
                `❌ Failed to update ${result.failedCount} package(s): ${result.failedPackages.join(', ')}`
            );
        } else {
            vscode.window.showWarningMessage(
                `⚠️ Updated ${result.updatedCount} package(s), ${result.failedCount} failed: ${result.failedPackages.join(', ')}`
            );
        }
    }

    /**
     * Get emoji for update type
     */
    private getUpdateTypeEmoji(updateType: UpdateType): string {
        switch (updateType) {
            case UpdateType.PATCH: return '🟢';
            case UpdateType.MINOR: return '🟡';
            case UpdateType.MAJOR: return '🔴';
            default: return '📦';
        }
    }
}
