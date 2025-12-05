import * as vscode from 'vscode';

export enum StatusBarState {
    IDLE = 'idle',
    CHECKING = 'checking',
    COMPLETE = 'complete',
    ERROR = 'error'
}

export interface StatusUpdate {
    state: StatusBarState;
    message: string;
    count?: number;
    tooltip?: string;
}

export class StatusBarProvider {
    private statusBarItem: vscode.StatusBarItem;
    private currentState: StatusBarState = StatusBarState.IDLE;
    private lastUpdateCount: number = 0;

    constructor() {
        const config = vscode.workspace.getConfiguration('flutterChecker');
        const priority = config.get<number>('statusBarPriority', 100);

        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            priority
        );
        this.statusBarItem.command = 'flutter-checker.statusBarClicked';

        this.updateStatus({
            state: StatusBarState.IDLE,
            message: 'Flutter Checker',
            tooltip: 'Click to check for outdated packages'
        });

        // Check if status bar should be shown
        const showStatusBar = config.get<boolean>('showStatusBar', true);
        if (showStatusBar) {
            this.statusBarItem.show();
        }

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('flutterChecker.showStatusBar')) {
                const newShowStatusBar = vscode.workspace.getConfiguration('flutterChecker').get<boolean>('showStatusBar', true);
                if (newShowStatusBar) {
                    this.statusBarItem.show();
                } else {
                    this.statusBarItem.hide();
                }
            }

            if (event.affectsConfiguration('flutterChecker.statusBarPriority')) {
                // Recreate status bar item with new priority
                const newPriority = vscode.workspace.getConfiguration('flutterChecker').get<number>('statusBarPriority', 100);
                this.statusBarItem.dispose();
                this.statusBarItem = vscode.window.createStatusBarItem(
                    vscode.StatusBarAlignment.Right,
                    newPriority
                );
                this.statusBarItem.command = 'flutter-checker.statusBarClicked';

                // Restore current state
                this.updateStatus({
                    state: this.currentState,
                    message: this.getCurrentMessage(),
                    count: this.lastUpdateCount,
                    tooltip: this.getCurrentTooltip()
                });

                const showStatusBar = vscode.workspace.getConfiguration('flutterChecker').get<boolean>('showStatusBar', true);
                if (showStatusBar) {
                    this.statusBarItem.show();
                }
            }
        });
    }

    private getCurrentMessage(): string {
        switch (this.currentState) {
            case StatusBarState.CHECKING:
                return 'Checking packages...';
            case StatusBarState.COMPLETE:
                return this.lastUpdateCount === 0 ? 'Up to date' : `${this.lastUpdateCount} outdated`;
            case StatusBarState.ERROR:
                return 'Check failed';
            default:
                return 'Flutter Checker';
        }
    }

    private getCurrentTooltip(): string {
        switch (this.currentState) {
            case StatusBarState.CHECKING:
                return 'Checking for outdated packages...';
            case StatusBarState.COMPLETE:
                return this.lastUpdateCount === 0
                    ? 'All packages are up to date'
                    : `${this.lastUpdateCount} package${this.lastUpdateCount === 1 ? '' : 's'} can be updated. Click to re-check.`;
            case StatusBarState.ERROR:
                return 'Failed to check for outdated packages. Click to retry.';
            default:
                return 'Click to check for outdated packages';
        }
    }

    updateStatus(update: StatusUpdate) {
        this.currentState = update.state;

        switch (update.state) {
            case StatusBarState.IDLE:
                this.statusBarItem.text = '$(package) Flutter Checker';
                this.statusBarItem.tooltip = update.tooltip || 'Click to check for outdated packages';
                this.statusBarItem.backgroundColor = undefined;
                break;

            case StatusBarState.CHECKING:
                this.statusBarItem.text = '$(sync~spin) Checking...';
                this.statusBarItem.tooltip = update.tooltip || 'Checking for outdated packages...';
                this.statusBarItem.backgroundColor = undefined;
                break;

            case StatusBarState.COMPLETE:
                if (update.count !== undefined) {
                    this.lastUpdateCount = update.count;
                    if (update.count === 0) {
                        this.statusBarItem.text = '$(check) Up to date';
                        this.statusBarItem.tooltip = 'All packages are up to date';
                        this.statusBarItem.backgroundColor = undefined;
                    } else {
                        this.statusBarItem.text = `$(warning) ${update.count} outdated`;
                        this.statusBarItem.tooltip = `${update.count} package${update.count === 1 ? '' : 's'} can be updated. Click to re-check.`;
                        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                    }
                }
                break;

            case StatusBarState.ERROR:
                this.statusBarItem.text = '$(error) Check failed';
                this.statusBarItem.tooltip = update.tooltip || 'Failed to check for outdated packages. Click to retry.';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
        }
    }

    getCurrentState(): StatusBarState {
        return this.currentState;
    }

    getLastUpdateCount(): number {
        return this.lastUpdateCount;
    }

    setChecking(message?: string) {
        this.updateStatus({
            state: StatusBarState.CHECKING,
            message: message || 'Checking packages...',
            tooltip: message || 'Checking for outdated packages...'
        });
    }

    setComplete(count: number, message?: string) {
        this.updateStatus({
            state: StatusBarState.COMPLETE,
            message: message || `Found ${count} outdated packages`,
            count: count,
            tooltip: count === 0
                ? 'All packages are up to date'
                : `${count} package${count === 1 ? '' : 's'} can be updated. Click to re-check.`
        });
    }

    setError(errorMessage?: string) {
        this.updateStatus({
            state: StatusBarState.ERROR,
            message: 'Check failed',
            tooltip: errorMessage || 'Failed to check for outdated packages. Click to retry.'
        });
    }

    setIdle() {
        this.updateStatus({
            state: StatusBarState.IDLE,
            message: 'Flutter Checker',
            tooltip: 'Click to check for outdated packages'
        });
    }

    setNoProjectsFound() {
        this.updateStatus({
            state: StatusBarState.IDLE,
            message: 'No Flutter projects',
            tooltip: 'No pubspec.yaml files found in workspace. Open a Flutter/Dart project to enable package checking.'
        });
    }

    hide() {
        this.statusBarItem.hide();
    }

    show() {
        this.statusBarItem.show();
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}
