import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import axios from 'axios';
import * as semver from 'semver';
import * as https from 'https';

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
    // Rate limiting: track last request time for each package
    private lastRequestTime: Map<string, number> = new Map();
    private readonly MIN_REQUEST_INTERVAL = 100; // 100ms minimum between requests
    private readonly PACKAGE_NAME_PATTERN = /^[a-z0-9_]+$/; // Dart package naming convention

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

    /**
     * Sanitize and validate package name to prevent injection attacks
     */
    private sanitizePackageName(packageName: string): string | null {
        if (!packageName || typeof packageName !== 'string') {
            return null;
        }

        const trimmed = packageName.trim().toLowerCase();

        // Validate against Dart package naming convention
        // Package names must be lowercase alphanumeric with underscores only
        if (!this.PACKAGE_NAME_PATTERN.test(trimmed)) {
            console.warn(`Invalid package name format: ${packageName}`);
            return null;
        }

        // Additional length check (Dart packages typically < 64 chars)
        if (trimmed.length === 0 || trimmed.length > 64) {
            console.warn(`Package name length invalid: ${packageName}`);
            return null;
        }

        return trimmed;
    }

    /**
     * Validate version string format to prevent injection attacks
     * Must be valid semver: digits.digits.digits with optional pre-release/build metadata
     */
    private isValidVersionString(version: string): boolean {
        if (!version || typeof version !== 'string') {
            return false;
        }

        // Check for dangerous characters that could be used for injection
        // Version should only contain: digits, dots, hyphens, plus, alphanumeric
        const safePattern = /^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
        if (!safePattern.test(version)) {
            return false;
        }

        // Additional validation: must be valid semver
        if (!semver.valid(version)) {
            return false;
        }

        // Length check (versions should be reasonable)
        if (version.length > 100) {
            return false;
        }

        return true;
    }

    /**
     * Rate limiting helper: wait if needed
     */
    private async enforceRateLimit(packageName: string): Promise<void> {
        const lastRequest = this.lastRequestTime.get(packageName);
        if (lastRequest) {
            const timeSinceLastRequest = Date.now() - lastRequest;
            if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
                const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        this.lastRequestTime.set(packageName, Date.now());
    }

    private async getLatestVersion(packageName: string): Promise<string | null> {
        // Skip Flutter SDK packages
        if (packageName === 'flutter' || packageName.startsWith('flutter/')) {
            return null;
        }

        // Sanitize and validate package name
        const cleanPackageName = this.sanitizePackageName(packageName);
        if (!cleanPackageName) {
            return null;
        }

        // Check cache first
        const cached = this.cache.get(cleanPackageName);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.version;
        }

        // Enforce rate limiting
        await this.enforceRateLimit(cleanPackageName);

        try {
            // Create HTTPS agent with strict SSL verification
            const httpsAgent = new https.Agent({
                rejectUnauthorized: true, // Enforce SSL certificate validation
                minVersion: 'TLSv1.2' // Require TLS 1.2 or higher
            });

            const response = await axios.get(
                `https://pub.dev/api/packages/${encodeURIComponent(cleanPackageName)}`,
                {
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Flutter-Checker-VSCode-Extension/1.3.0'
                    },
                    httpsAgent: httpsAgent, // Use strict SSL validation
                    validateStatus: (status) => status < 500,
                    // Additional security headers
                    maxRedirects: 3, // Limit redirects
                    maxContentLength: 1024 * 1024 // 1MB max response size
                }
            );

            if (response.status !== 200) {
                console.warn(`Package ${cleanPackageName} not found on pub.dev (status: ${response.status})`);
                return null;
            }

            if (response.data && response.data.latest) {
                const latestVersion = response.data.latest.version;

                if (!latestVersion || typeof latestVersion !== 'string') {
                    console.warn(`No version information found for package ${cleanPackageName}`);
                    return null;
                }

                // Validate version string format to prevent injection
                if (!this.isValidVersionString(latestVersion)) {
                    console.warn(`Invalid version format from API for ${cleanPackageName}: ${latestVersion}`);
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
