import * as vscode from 'vscode';
import { PackageChecker } from './packageChecker';
import { DecorationProvider } from './decorationProvider';

let packageChecker: PackageChecker;
let decorationProvider: DecorationProvider;

export function activate(context: vscode.ExtensionContext) {
    try {
        console.log('Flutter Checker extension is now active!');
        console.log('Extension mode:', context.extensionMode);
        console.log('Extension path:', context.extensionPath);
        console.log('Extension URI:', context.extensionUri.toString());
        console.log('Registering commands...');

        // Initialize the package checker and decoration provider
        packageChecker = new PackageChecker();
        decorationProvider = new DecorationProvider();
        
        console.log('Package checker and decoration provider initialized');

        // Register commands
        const checkOutdatedCommand = vscode.commands.registerCommand(
            'flutter-checker.checkOutdated',
            async () => {
                console.log('Check outdated command triggered');
                await checkOutdatedPackages();
            }
        );
        console.log('Registered checkOutdated command');

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

        // Add to subscriptions
        context.subscriptions.push(
            checkOutdatedCommand,
            clearHighlightsCommand,
            openPubDevCommand,
            decorationProvider
        );

        console.log('All commands registered successfully!');
        console.log('Context subscriptions count:', context.subscriptions.length);
        
        // Show a notification that the extension is ready (only in development)
        if (context.extensionMode === vscode.ExtensionMode.Development) {
            vscode.window.showInformationMessage('Flutter Checker extension is ready!');
        }
        
        // Test if commands are actually registered
        vscode.commands.getCommands(true).then(commands => {
            const ourCommands = commands.filter(cmd => cmd.startsWith('flutter-checker.'));
            console.log('Our registered commands:', ourCommands);
            if (ourCommands.length === 0) {
                console.error('ERROR: No flutter-checker commands found in registered commands!');
            }
        });
        
    } catch (error) {
        console.error('Error activating Flutter Checker extension:', error);
        vscode.window.showErrorMessage(`Failed to activate Flutter Checker: ${error}`);
        throw error;
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


export function deactivate() {
    if (decorationProvider) {
        decorationProvider.dispose();
    }
}
