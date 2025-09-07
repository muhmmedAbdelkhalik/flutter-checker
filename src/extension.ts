import * as vscode from 'vscode';
import { PackageChecker } from './packageChecker';
import { DecorationProvider } from './decorationProvider';

let packageChecker: PackageChecker;
let decorationProvider: DecorationProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Flutter Checker extension is now active!');

    // Initialize the package checker and decoration provider
    packageChecker = new PackageChecker();
    decorationProvider = new DecorationProvider();

    // Register commands
    const checkOutdatedCommand = vscode.commands.registerCommand(
        'flutter-checker.checkOutdated',
        async () => {
            await checkOutdatedPackages();
        }
    );

    const clearHighlightsCommand = vscode.commands.registerCommand(
        'flutter-checker.clearHighlights',
        () => {
            decorationProvider.clearDecorations();
        }
    );

    const openPubDevCommand = vscode.commands.registerCommand(
        'flutter-checker.openPubDev',
        (packageName: string) => {
            if (packageName) {
                const url = `https://pub.dev/packages/${packageName}`;
                vscode.env.openExternal(vscode.Uri.parse(url));
            }
        }
    );


    // Register file watcher for pubspec.yaml files
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/pubspec.yaml');
    
    fileWatcher.onDidChange(async (uri) => {
        if (shouldAutoCheck()) {
            await checkOutdatedPackages();
        }
    });

    fileWatcher.onDidCreate(async (uri) => {
        if (shouldAutoCheck()) {
            await checkOutdatedPackages();
        }
    });

    // Check for outdated packages when a pubspec.yaml file is opened
    vscode.workspace.onDidOpenTextDocument(async (document) => {
        if (document.fileName.endsWith('pubspec.yaml') && shouldAutoCheck()) {
            await checkOutdatedPackages();
        }
    });

    // Add to subscriptions
    context.subscriptions.push(
        checkOutdatedCommand,
        clearHighlightsCommand,
        openPubDevCommand,
        fileWatcher,
        decorationProvider
    );

    // Initial check if a pubspec.yaml file is already open
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.fileName.endsWith('pubspec.yaml')) {
        if (shouldAutoCheck()) {
            checkOutdatedPackages();
        }
    }
}

async function checkOutdatedPackages() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || !activeEditor.document.fileName.endsWith('pubspec.yaml')) {
        vscode.window.showWarningMessage('Please open a pubspec.yaml file first.');
        return;
    }

    const document = activeEditor.document;
    
    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Checking for outdated packages...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Parsing pubspec.yaml..." });
            
            const outdatedPackages = await packageChecker.checkOutdatedPackages(document);
            
            progress.report({ increment: 50, message: "Applying highlights..." });
            
            decorationProvider.updateDecorations(activeEditor, outdatedPackages);
            
            progress.report({ increment: 100, message: "Complete!" });
            
            if (outdatedPackages.length > 0) {
                vscode.window.showInformationMessage(
                    `Found ${outdatedPackages.length} outdated package(s). Check the highlights in your pubspec.yaml file.`
                );
            } else {
                vscode.window.showInformationMessage('All packages are up to date!');
            }
        });
    } catch (error) {
        console.error('Error checking outdated packages:', error);
        vscode.window.showErrorMessage('Failed to check for outdated packages. Please try again.');
    }
}

function shouldAutoCheck(): boolean {
    const config = vscode.workspace.getConfiguration('flutterChecker');
    return config.get('enabled', true) && config.get('autoCheck', true);
}

export function deactivate() {
    if (decorationProvider) {
        decorationProvider.dispose();
    }
}
