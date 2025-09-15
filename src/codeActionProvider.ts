import * as vscode from 'vscode';
import { OutdatedPackage } from './packageChecker';

export class UpdateDependencyCodeActionProvider implements vscode.CodeActionProvider {
    constructor(
        private readonly getOutdatedForDocument: (doc: vscode.TextDocument) => OutdatedPackage[]
    ) {}

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection
    ): vscode.CodeAction[] | undefined {
        const outdated = this.getOutdatedForDocument(document);
        if (!outdated || outdated.length === 0) {
            return;
        }

        const hits = outdated.filter(p => p.range.intersection(range) || p.range.contains(range.start));
        if (hits.length === 0) {
            return;
        }

        const actions: vscode.CodeAction[] = [];

        for (const pkg of hits) {
            // Action 1: Update and run flutter pub get
            const updateAndInstall = new vscode.CodeAction(
                `Update ${pkg.name} to ${pkg.latestVersion}`,
                vscode.CodeActionKind.QuickFix
            );
            updateAndInstall.command = {
                title: 'Update dependency and run flutter pub get',
                command: 'flutter-checker.updatePackage',
                arguments: [
                    {
                        packageName: pkg.name,
                        latestVersion: pkg.latestVersion,
                        range: this.serializeRange(pkg.range),
                        keepPrefix: true,
                        runPubGet: true
                    }
                ]
            };
            updateAndInstall.isPreferred = true;
            actions.push(updateAndInstall);

            // Action 2: Update without running flutter pub get
            const updateNoInstall = new vscode.CodeAction(
                `Update ${pkg.name} to ${pkg.latestVersion} (no pub get)`,
                vscode.CodeActionKind.QuickFix
            );
            updateNoInstall.command = {
                title: 'Update dependency without running flutter pub get',
                command: 'flutter-checker.updatePackageNoInstall',
                arguments: [
                    {
                        packageName: pkg.name,
                        latestVersion: pkg.latestVersion,
                        range: this.serializeRange(pkg.range),
                        keepPrefix: true,
                        runPubGet: false
                    }
                ]
            };
            actions.push(updateNoInstall);
        }

        return actions;
    }

    private serializeRange(range: vscode.Range) {
        return {
            start: { line: range.start.line, character: range.start.character },
            end: { line: range.end.line, character: range.end.character }
        };
    }
}


