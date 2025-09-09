import * as vscode from 'vscode';
import { PackageChecker } from './packageChecker';
import { DecorationProvider } from './decorationProvider';

// Extension module loaded

let packageChecker: PackageChecker;
let decorationProvider: DecorationProvider;

export function activate(context: vscode.ExtensionContext) {
    try {
        console.log('Flutter Checker extension is now active!');
        console.log('Extension mode:', context.extensionMode);

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

        // Register event listeners for automatic detection
        const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(async (document) => {
            try {
                if (document.fileName.endsWith('pubspec.yaml')) {
                    const config = vscode.workspace.getConfiguration('flutterChecker');
                    const autoCheck = config.get<boolean>('autoCheck', true);
                    
                    if (autoCheck) {
                        console.log('pubspec.yaml file opened, automatically checking for outdated packages');
                        const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
                        if (editor) {
                            await checkOutdatedPackagesForDocument(document, editor, false); // silent mode
                        }
                    }
                }
            } catch (error) {
                console.error('Error in onDidOpenTextDocument:', error);
            }
        });

        const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(async (event) => {
            try {
                if (event.document.fileName.endsWith('pubspec.yaml')) {
                    const config = vscode.workspace.getConfiguration('flutterChecker');
                    const autoCheck = config.get<boolean>('autoCheck', true);
                    
                    if (autoCheck) {
                        console.log('pubspec.yaml file modified, automatically checking for outdated packages');
                        const editor = vscode.window.visibleTextEditors.find(e => e.document === event.document);
                        if (editor) {
                            // Debounce the change detection to avoid too many API calls
                            clearTimeout((global as any).pubspecChangeTimeout);
                            (global as any).pubspecChangeTimeout = setTimeout(async () => {
                                try {
                                    await checkOutdatedPackagesForDocument(event.document, editor, false); // silent mode
                                } catch (error) {
                                    console.error('Error in debounced package check:', error);
                                }
                            }, 2000); // 2 second delay
                        }
                    }
                }
            } catch (error) {
                console.error('Error in onDidChangeTextDocument:', error);
            }
        });

        const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument(async (document) => {
            try {
                if (document.fileName.endsWith('pubspec.yaml')) {
                    const config = vscode.workspace.getConfiguration('flutterChecker');
                    const autoCheck = config.get<boolean>('autoCheck', true);
                    
                    if (autoCheck) {
                        console.log('pubspec.yaml file saved, automatically checking for outdated packages');
                        const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
                        if (editor) {
                            await checkOutdatedPackagesForDocument(document, editor, false); // silent mode
                        }
                    }
                }
            } catch (error) {
                console.error('Error in onDidSaveTextDocument:', error);
            }
        });

        const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            try {
                if (editor && editor.document.fileName.endsWith('pubspec.yaml')) {
                    const config = vscode.workspace.getConfiguration('flutterChecker');
                    const autoCheck = config.get<boolean>('autoCheck', true);
                    
                    if (autoCheck) {
                        console.log('Switched to pubspec.yaml file, automatically checking for outdated packages');
                        await checkOutdatedPackagesForDocument(editor.document, editor, false); // silent mode
                    }
                }
            } catch (error) {
                console.error('Error in onDidChangeActiveTextEditor:', error);
            }
        });

        // Add to subscriptions
        context.subscriptions.push(
            checkOutdatedCommand,
            clearHighlightsCommand,
            openPubDevCommand,
            decorationProvider,
            onDidOpenTextDocument,
            onDidChangeTextDocument,
            onDidSaveTextDocument,
            onDidChangeActiveTextEditor
        );

        console.log('All commands and event listeners registered successfully!');
        
        // Check already open documents for pubspec.yaml files
        const checkAlreadyOpenDocuments = async () => {
            try {
                const config = vscode.workspace.getConfiguration('flutterChecker');
                const autoCheck = config.get<boolean>('autoCheck', true);
                
                if (autoCheck) {
                    for (const editor of vscode.window.visibleTextEditors) {
                        if (editor.document.fileName.endsWith('pubspec.yaml')) {
                            console.log('Found already open pubspec.yaml file, automatically checking for outdated packages');
                            try {
                                await checkOutdatedPackagesForDocument(editor.document, editor, false); // silent mode
                            } catch (error) {
                                console.error(`Error checking already open pubspec.yaml (${editor.document.fileName}):`, error);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error in checkAlreadyOpenDocuments:', error);
            }
        };
        
        // Run the check after a short delay to ensure everything is initialized
        setTimeout(checkAlreadyOpenDocuments, 1000);
        
        // Commands registered successfully - only show in development mode
        if (context.extensionMode === vscode.ExtensionMode.Development) {
            vscode.window.showInformationMessage('Flutter Checker extension is ready!');
        }
        
        // Verify commands are registered
        vscode.commands.getCommands(true).then(commands => {
            const ourCommands = commands.filter(cmd => cmd.startsWith('flutter-checker.'));
            if (ourCommands.length === 0) {
                console.error('CRITICAL ERROR: No flutter-checker commands found in registered commands!');
                vscode.window.showErrorMessage('Flutter Checker: Commands failed to register. Please reload VS Code.');
            }
        }, (error: any) => {
            console.error('Error verifying command registration:', error);
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

    await checkOutdatedPackagesForDocument(activeEditor.document, activeEditor, true);
}

async function checkOutdatedPackagesForDocument(document: vscode.TextDocument, editor: vscode.TextEditor, showProgress: boolean = true) {
    // Check if automatic detection is enabled
    const config = vscode.workspace.getConfiguration('flutterChecker');
    const isEnabled = config.get<boolean>('enabled', true);
    
    if (!isEnabled) {
        console.log('Flutter Checker is disabled, skipping package check');
        return;
    }

    try {
        const checkPackages = async (progress?: vscode.Progress<{increment?: number, message?: string}>) => {
            if (progress) progress.report({ increment: 0, message: "Parsing pubspec.yaml..." });
            
            const outdatedPackages = await packageChecker.checkOutdatedPackages(document);
            
            if (progress) progress.report({ increment: 50, message: "Applying highlights..." });
            
            decorationProvider.updateDecorations(editor, outdatedPackages);
            
            if (progress) progress.report({ increment: 100, message: "Complete!" });
            
            // Show notifications based on settings
            if (showProgress) {
                // Manual check - always show notifications
                if (outdatedPackages.length > 0) {
                    vscode.window.showInformationMessage(
                        `Found ${outdatedPackages.length} outdated package(s). Check the highlights in your pubspec.yaml file.`
                    );
                } else {
                    vscode.window.showInformationMessage('All packages are up to date!');
                }
            } else {
                // Automatic check - only show notifications if enabled
                const currentConfig = vscode.workspace.getConfiguration('flutterChecker');
                const showAutoNotifications = currentConfig.get<boolean>('showAutoCheckNotifications', false);
                if (showAutoNotifications && outdatedPackages.length > 0) {
                    vscode.window.showInformationMessage(
                        `Auto-check found ${outdatedPackages.length} outdated package(s). Check the highlights in your pubspec.yaml file.`
                    );
                }
                // Always log to console for debugging
                console.log(`Automatic check completed: ${outdatedPackages.length} outdated packages found`);
            }
        };

        if (showProgress) {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Checking for outdated packages...",
                cancellable: false
            }, checkPackages);
        } else {
            await checkPackages();
        }
    } catch (error) {
        console.error('Error checking outdated packages:', error);
        if (showProgress) {
            vscode.window.showErrorMessage('Failed to check for outdated packages. Please try again.');
        }
    }
}


export function deactivate() {
    try {
        console.log('Flutter Checker extension is being deactivated');
        
        // Clear any pending timeouts
        if ((global as any).pubspecChangeTimeout) {
            clearTimeout((global as any).pubspecChangeTimeout);
            (global as any).pubspecChangeTimeout = undefined;
        }
        
        // Dispose of decoration provider
        if (decorationProvider) {
            decorationProvider.dispose();
            decorationProvider = undefined as any;
        }
        
        // Clear cache
        if (packageChecker) {
            packageChecker.clearCache();
            packageChecker = undefined as any;
        }
        
        console.log('Flutter Checker extension deactivated successfully');
    } catch (error) {
        console.error('Error during extension deactivation:', error);
    }
}
