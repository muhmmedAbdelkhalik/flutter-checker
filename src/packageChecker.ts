import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import axios from 'axios';
import * as semver from 'semver';

export interface OutdatedPackage {
    name: string;
    currentVersion: string;
    latestVersion: string;
    lineNumber: number;
    range: vscode.Range;
}

export class PackageChecker {
    private cache: Map<string, { version: string; timestamp: number }> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    async checkOutdatedPackages(document: vscode.TextDocument): Promise<OutdatedPackage[]> {
        const text = document.getText();
        const outdatedPackages: OutdatedPackage[] = [];

        try {
            // Parse the YAML content
            const pubspec = yaml.load(text) as any;
            
            if (!pubspec || !pubspec.dependencies) {
                return outdatedPackages;
            }

            const dependencies = pubspec.dependencies;
            const lines = text.split('\n');

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
                const latestVersion = await this.getLatestVersion(packageName);
                if (!latestVersion) {
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

                    outdatedPackages.push({
                        name: packageName,
                        currentVersion,
                        latestVersion,
                        lineNumber,
                        range
                    });
                }
            }
        } catch (error) {
            console.error('Error parsing pubspec.yaml:', error);
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
        // Check cache first
        const cached = this.cache.get(packageName);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.version;
        }

        try {
            const response = await axios.get(
                `https://pub.dev/api/packages/${packageName}`,
                { timeout: 10000 }
            );

            if (response.data && response.data.latest) {
                const latestVersion = response.data.latest.version;
                
                // Cache the result
                this.cache.set(packageName, {
                    version: latestVersion,
                    timestamp: Date.now()
                });

                return latestVersion;
            }
        } catch (error) {
            console.error(`Failed to fetch latest version for ${packageName}:`, error);
        }

        return null;
    }

    private isOutdated(currentVersion: string, latestVersion: string): boolean {
        try {
            // Use semver to compare versions
            return semver.lt(currentVersion, latestVersion);
        } catch (error) {
            console.error('Error comparing versions:', error);
            return false;
        }
    }

    clearCache(): void {
        this.cache.clear();
    }
}
