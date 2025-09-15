import * as vscode from 'vscode';
import { PackageChecker, OutdatedPackage } from './packageChecker';
import { DecorationProvider } from './decorationProvider';
import { StatusBarProvider, StatusBarState } from './statusBarProvider';
import { UpdateDependencyCodeActionProvider } from './codeActionProvider';

// Extension module loaded

let packageChecker: PackageChecker;
let decorationProvider: DecorationProvider;
let statusBarProvider: StatusBarProvider;
const outdatedByDoc = new Map<string, OutdatedPackage[]>();

export async function activate(context: vscode.ExtensionContext) {
    try {
        console.log('Flutter Checker extension is now active!');
        console.log('Extension mode:', context.extensionMode);

        // Initialize the package checker, decoration provider, and status bar provider
        packageChecker = new PackageChecker();
        decorationProvider = new DecorationProvider();
        statusBarProvider = new StatusBarProvider();

        // Connect status bar provider to package checker
        packageChecker.setStatusCallback((message: string, progress?: number) => {
            if (progress !== undefined) {
                statusBarProvider.setChecking(message);
            }
        });

        console.log('Package checker, decoration provider, and status bar provider initialized');

        // Initialize status bar with workspace state
        await initializeStatusBarState();

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

        // Update commands: apply version update and optionally run flutter pub get
        // These are internal commands used by CodeActions and hover links, not exposed in Command Palette
        vscode.commands.registerCommand(
            'flutter-checker.updatePackage',
            async (args?: any) => {
                try {
                    await handleUpdatePackageCommand(args, /*defaultRunPubGet*/ true);
                } catch (error) {
                    console.error('Error in updatePackage command:', error);
                    vscode.window.showErrorMessage('Flutter Checker: Failed to update package');
                }
            }
        );

        vscode.commands.registerCommand(
            'flutter-checker.updatePackageNoInstall',
            async (args?: any) => {
                try {
                    await handleUpdatePackageCommand(args, /*defaultRunPubGet*/ false);
                } catch (error) {
                    console.error('Error in updatePackageNoInstall command:', error);
                    vscode.window.showErrorMessage('Flutter Checker: Failed to update package');
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

        // Listen for workspace folder changes
        const onDidChangeWorkspaceFolders = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            await initializeStatusBarState();
        });

        // Add to subscriptions
        context.subscriptions.push(
            checkOutdatedCommand,
            clearHighlightsCommand,
            decorationProvider,
            statusBarProvider,
            onDidOpenTextDocument,
            onDidChangeTextDocument,
            onDidSaveTextDocument,
            onDidChangeActiveTextEditor,
            onDidChangeWorkspaceFolders
        );

        // Register CodeAction provider for pubspec.yaml
        context.subscriptions.push(
            vscode.languages.registerCodeActionsProvider(
                { language: 'yaml', pattern: '**/pubspec.yaml' },
                new UpdateDependencyCodeActionProvider(doc => outdatedByDoc.get(doc.uri.toString()) ?? []),
                { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
            )
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

async function findPubspecFiles(): Promise<vscode.Uri[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return [];
    }

    const pubspecFiles: vscode.Uri[] = [];

    for (const folder of workspaceFolders) {
        try {
            const pattern = new vscode.RelativePattern(folder, '**/pubspec.yaml');
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 10);
            pubspecFiles.push(...files);
        } catch (error) {
            console.warn(`Error searching for pubspec.yaml in ${folder.uri.fsPath}:`, error);
        }
    }

    return pubspecFiles;
}

async function handleUpdatePackageCommand(args: any, defaultRunPubGet: boolean) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document.fileName.endsWith('pubspec.yaml')) {
        vscode.window.showWarningMessage('Open a pubspec.yaml to update a package.');
        return;
    }

    const document = editor.document;
    const workspaceEdit = new vscode.WorkspaceEdit();

    // Expect args: { packageName, latestVersion, range: {start:{line,character}, end:{line,character}}, keepPrefix?: boolean, runPubGet?: boolean }
    if (!args || !args.latestVersion || !args.range) {
        // Fallback: do nothing
        return;
    }

    const range = new vscode.Range(
        new vscode.Position(args.range.start.line, args.range.start.character),
        new vscode.Position(args.range.end.line, args.range.end.character)
    );

    const originalSpec = document.getText(range);
    const prefixMatch = originalSpec.match(/^[\^~><=\s]*/)?.[0] ?? '';
    const keepPrefix = args.keepPrefix === true;
    const replacement = keepPrefix ? `${prefixMatch.trim()}${args.latestVersion}` : args.latestVersion;

    workspaceEdit.replace(document.uri, range, replacement);
    const applied = await vscode.workspace.applyEdit(workspaceEdit);
    if (!applied) {
        vscode.window.showErrorMessage('Flutter Checker: Failed to apply version edit.');
        return;
    }

    await document.save();

    const runPubGet = typeof args.runPubGet === 'boolean' ? args.runPubGet : defaultRunPubGet;
    if (runPubGet) {
        await runFlutterPubGet(document.uri);
    }
}

async function runFlutterPubGet(uri: vscode.Uri) {
    try {
        const cwd = vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath;
        if (!cwd) return;
        const terminal = vscode.window.createTerminal({ name: 'Flutter Checker', cwd });
        terminal.show(true);
        terminal.sendText('flutter pub get');
    } catch (error) {
        console.error('Failed to run flutter pub get:', error);
    }
}

async function initializeStatusBarState() {
    try {
        // Check if we have a workspace
        if (!vscode.workspace.workspaceFolders) {
            statusBarProvider.setError('No workspace opened');
            return;
        }

        // Check for pubspec.yaml files
        const pubspecFiles = await findPubspecFiles();

        if (pubspecFiles.length === 0) {
            // No pubspec.yaml files found
            statusBarProvider.setNoProjectsFound();
        } else {
            // Pubspec.yaml files found, ready to check
            statusBarProvider.setIdle();
        }
    } catch (error) {
        console.error('Error initializing status bar state:', error);
        statusBarProvider.setError('Initialization failed');
    }
}

async function checkOutdatedPackages() {
    const activeEditor = vscode.window.activeTextEditor;

    // If active editor is already a pubspec.yaml file, use it
    if (activeEditor && activeEditor.document.fileName.endsWith('pubspec.yaml')) {
        await checkOutdatedPackagesForDocument(activeEditor.document, activeEditor, true);
        return;
    }

    // Try to find pubspec.yaml files in workspace
    const pubspecFiles = await findPubspecFiles();

    if (pubspecFiles.length === 0) {
        vscode.window.showWarningMessage(
            'No pubspec.yaml files found in workspace. Please open a Flutter/Dart project.'
        );
        statusBarProvider.setNoProjectsFound();
        return;
    }

    if (pubspecFiles.length === 1) {
        // Open the single pubspec.yaml file
        try {
            const document = await vscode.workspace.openTextDocument(pubspecFiles[0]);
            const editor = await vscode.window.showTextDocument(document);
            await checkOutdatedPackagesForDocument(document, editor, true);
        } catch (error) {
            console.error('Error opening pubspec.yaml file:', error);
            vscode.window.showErrorMessage('Failed to open pubspec.yaml file.');
            statusBarProvider.setError('Failed to open pubspec.yaml');
        }
    } else {
        // Multiple pubspec.yaml files found, let user choose
        const items = pubspecFiles.map(file => ({
            label: vscode.workspace.asRelativePath(file),
            description: file.fsPath,
            uri: file
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a pubspec.yaml file to check'
        });

        if (selected) {
            try {
                const document = await vscode.workspace.openTextDocument(selected.uri);
                const editor = await vscode.window.showTextDocument(document);
                await checkOutdatedPackagesForDocument(document, editor, true);
            } catch (error) {
                console.error('Error opening selected pubspec.yaml file:', error);
                vscode.window.showErrorMessage('Failed to open selected pubspec.yaml file.');
                statusBarProvider.setError('Failed to open pubspec.yaml');
            }
        }
    }
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
        // Set status bar to checking state
        statusBarProvider.setChecking('Checking packages...');

        const checkPackages = async (progress?: vscode.Progress<{increment?: number, message?: string}>) => {
            if (progress) progress.report({ increment: 0, message: "Parsing pubspec.yaml..." });

            const outdatedPackages = await packageChecker.checkOutdatedPackages(document);

            // Save results for CodeAction provider
            outdatedByDoc.set(document.uri.toString(), outdatedPackages);

            if (progress) progress.report({ increment: 50, message: "Applying highlights..." });

            decorationProvider.updateDecorations(editor, outdatedPackages);

            if (progress) progress.report({ increment: 100, message: "Complete!" });

            // Update status bar with final count
            statusBarProvider.setComplete(outdatedPackages.length, `Found ${outdatedPackages.length} outdated packages`);
            
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
        // Set status bar to error state
        statusBarProvider.setError('Failed to check for outdated packages');

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

        // Dispose of status bar provider
        if (statusBarProvider) {
            statusBarProvider.dispose();
            statusBarProvider = undefined as any;
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
