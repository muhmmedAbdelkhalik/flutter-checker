import * as vscode from 'vscode';
import { OutdatedPackage, UpdateType } from './packageChecker';

export class BulkUpdateCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    constructor(private getOutdatedPackages: (doc: vscode.TextDocument) => OutdatedPackage[]) {}

    /**
     * Refresh CodeLens display
     */
    refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        if (!document.fileName.endsWith('pubspec.yaml')) {
            return [];
        }

        const outdated = this.getOutdatedPackages(document);
        if (outdated.length === 0) {
            return [];
        }

        // Find the 'dependencies:' line
        const text = document.getText();
        const lines = text.split('\n');
        let dependenciesLine = -1;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^dependencies:\s*$/)) {
                dependenciesLine = i;
                break;
            }
        }

        // If no dependencies section found, show at top
        const lineNumber = dependenciesLine !== -1 ? dependenciesLine : 0;
        const range = new vscode.Range(lineNumber, 0, lineNumber, 0);

        const codeLenses: vscode.CodeLens[] = [];

        // Count packages by type
        const safePackages = outdated.filter(p => p.updateType === UpdateType.PATCH || p.updateType === UpdateType.MINOR);
        const patchPackages = outdated.filter(p => p.updateType === UpdateType.PATCH);

        // CodeLens 1: Update All Safe
        if (safePackages.length > 0) {
            codeLenses.push(new vscode.CodeLens(range, {
                title: `$(rocket) Update All Safe (${safePackages.length})`,
                command: 'flutter-checker.updateAllSafe',
                tooltip: 'Update all patch and minor versions',
                arguments: [document.uri]
            }));
        }

        // CodeLens 2: Update Patches Only
        if (patchPackages.length > 0 && patchPackages.length !== safePackages.length) {
            codeLenses.push(new vscode.CodeLens(range, {
                title: `$(check) Patches Only (${patchPackages.length})`,
                command: 'flutter-checker.updateAllPatch',
                tooltip: 'Update only patch versions (safest)',
                arguments: [document.uri]
            }));
        }

        // CodeLens 3: Select Packages
        codeLenses.push(new vscode.CodeLens(range, {
            title: `$(list-selection) Select Packages... (${outdated.length} available)`,
            command: 'flutter-checker.bulkUpdate',
            tooltip: 'Choose which packages to update',
            arguments: [document.uri]
        }));

        return codeLenses;
    }
}
