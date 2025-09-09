import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import axios from 'axios';
import * as semver from 'semver';

export enum UpdateType {
    PATCH = 'patch',
    MINOR = 'minor',
    MAJOR = 'major'
}

export interface OutdatedPackage {
    name: string;
    currentVersion: string;
    latestVersion: string;
    lineNumber: number;
    range: vscode.Range;
    updateType: UpdateType;
}

export class PackageChecker {
    private cache: Map<string, { version: string; timestamp: number }> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private statusCallback?: (message: string, progress?: number) => void;

    setStatusCallback(callback: (message: string, progress?: number) => void) {
        this.statusCallback = callback;
    }

    async checkOutdatedPackages(document: vscode.TextDocument): Promise<OutdatedPackage[]> {
        const text = document.getText();
        const outdatedPackages: OutdatedPackage[] = [];

        try {
            // Parse the YAML content
            this.statusCallback?.('Parsing pubspec.yaml...', 0);
            const pubspec = yaml.load(text) as any;

            if (!pubspec || !pubspec.dependencies) {
                this.statusCallback?.('No dependencies found', 100);
                return outdatedPackages;
            }

            const dependencies = pubspec.dependencies;
            const lines = text.split('\n');
            const totalPackages = Object.keys(dependencies).length;

            this.statusCallback?.(`Checking ${totalPackages} packages...`, 10);

            let processedCount = 0;

            // Check each dependency
            for (const [packageName, versionSpec] of Object.entries(dependencies)) {
                if (typeof versionSpec !== 'string') {
                    continue;
                }

                // Find the line number for this package
                const lineNumber = this.findPackageLineNumber(lines, packageName);
                if (lineNumber === -1) {
                    continue;
                }

                // Extract version from version spec
                const currentVersion = this.extractVersionFromSpec(versionSpec);
                if (!currentVersion) {
                    continue;
                }

                // Get the latest version from pub.dev
                this.statusCallback?.(`Checking ${packageName}...`, Math.round((processedCount / totalPackages) * 80) + 10);
                const latestVersion = await this.getLatestVersion(packageName);
                if (!latestVersion) {
                    processedCount++;
                    continue;
                }

                // Check if the package is outdated
                if (this.isOutdated(currentVersion, latestVersion)) {
                    const line = lines[lineNumber];
                    const versionStart = line.indexOf(versionSpec);
                    const versionEnd = versionStart + versionSpec.length;
                    
                    const range = new vscode.Range(
                        lineNumber,
                        versionStart,
                        lineNumber,
                        versionEnd
                    );

                    const updateType = this.getUpdateType(currentVersion, latestVersion);

                    outdatedPackages.push({
                        name: packageName,
                        currentVersion,
                        latestVersion,
                        lineNumber,
                        range,
                        updateType
                    });
                }

                processedCount++;
            }

            this.statusCallback?.(`Completed! Found ${outdatedPackages.length} outdated packages`, 100);
        } catch (error) {
            console.error('Error parsing pubspec.yaml:', error);
            this.statusCallback?.('Error checking packages', 100);
            throw new Error('Failed to parse pubspec.yaml file');
        }

        return outdatedPackages;
    }

    private findPackageLineNumber(lines: string[], packageName: string): number {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith(packageName + ':')) {
                return i;
            }
        }
        return -1;
    }

    private extractVersionFromSpec(versionSpec: string): string | null {
        // Remove common prefixes and suffixes
        const cleanVersion = versionSpec
            .replace(/^[\^~>=<]/, '') // Remove version operators
            .replace(/\s*#.*$/, '') // Remove comments
            .trim();

        // Check if it's a valid semver
        if (semver.valid(cleanVersion)) {
            return cleanVersion;
        }

        // Handle version ranges like ">=1.0.0 <2.0.0"
        const rangeMatch = cleanVersion.match(/(\d+\.\d+\.\d+)/);
        if (rangeMatch) {
            return rangeMatch[1];
        }

        return null;
    }

    private async getLatestVersion(packageName: string): Promise<string | null> {
        // Skip Flutter SDK packages
        if (packageName === 'flutter' || packageName.startsWith('flutter/')) {
            return null;
        }

        // Validate package name
        if (!packageName || typeof packageName !== 'string' || packageName.trim().length === 0) {
            console.warn(`Invalid package name: ${packageName}`);
            return null;
        }

        const cleanPackageName = packageName.trim();

        // Check cache first
        const cached = this.cache.get(cleanPackageName);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.version;
        }

        try {
            const response = await axios.get(
                `https://pub.dev/api/packages/${encodeURIComponent(cleanPackageName)}`,
                { 
                    timeout: 15000, // Increased timeout for production
                    headers: {
                        'User-Agent': 'Flutter-Checker-VSCode-Extension/1.1.2'
                    },
                    validateStatus: (status) => status < 500 // Don't throw for 4xx errors
                }
            );

            if (response.status !== 200) {
                console.warn(`Package ${cleanPackageName} not found on pub.dev (status: ${response.status})`);
                return null;
            }

            if (response.data && response.data.latest) {
                const latestVersion = response.data.latest.version;
                
                if (!latestVersion) {
                    console.warn(`No version information found for package ${cleanPackageName}`);
                    return null;
                }
                
                // Cache the result
                this.cache.set(cleanPackageName, {
                    version: latestVersion,
                    timestamp: Date.now()
                });

                return latestVersion;
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                    console.error(`Network error fetching ${cleanPackageName}: No internet connection`);
                } else if (error.response?.status === 404) {
                    console.warn(`Package ${cleanPackageName} not found on pub.dev`);
                } else {
                    console.error(`HTTP error fetching ${cleanPackageName}:`, error.response?.status, error.message);
                }
            } else {
                console.error(`Failed to fetch latest version for ${cleanPackageName}:`, error);
            }
        }

        return null;
    }

    private isOutdated(currentVersion: string, latestVersion: string): boolean {
        try {
            if (!currentVersion || !latestVersion) {
                return false;
            }
            
            // Validate versions before comparison
            if (!semver.valid(currentVersion) || !semver.valid(latestVersion)) {
                console.warn(`Invalid version format: current=${currentVersion}, latest=${latestVersion}`);
                return false;
            }
            
            // Use semver to compare versions
            return semver.lt(currentVersion, latestVersion);
        } catch (error) {
            console.error(`Error comparing versions ${currentVersion} vs ${latestVersion}:`, error);
            return false;
        }
    }

    private getUpdateType(currentVersion: string, latestVersion: string): UpdateType {
        try {
            if (!currentVersion || !latestVersion) {
                return UpdateType.MAJOR;
            }
            
            // Validate versions before comparison
            if (!semver.valid(currentVersion) || !semver.valid(latestVersion)) {
                console.warn(`Invalid version format for update type: current=${currentVersion}, latest=${latestVersion}`);
                return UpdateType.MAJOR;
            }
            
            // Use semver to determine the type of update
            if (semver.major(currentVersion) !== semver.major(latestVersion)) {
                return UpdateType.MAJOR;
            } else if (semver.minor(currentVersion) !== semver.minor(latestVersion)) {
                return UpdateType.MINOR;
            } else {
                return UpdateType.PATCH;
            }
        } catch (error) {
            console.error(`Error determining update type for ${currentVersion} -> ${latestVersion}:`, error);
            // Default to major if we can't determine the type
            return UpdateType.MAJOR;
        }
    }

    clearCache(): void {
        this.cache.clear();
    }
}
