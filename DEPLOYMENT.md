# 🚀 Extension Deployment Guide

This guide shows you how to deploy your VS Code extension in different ways.

## 📦 **Option 1: Package as .vsix file (Recommended)**

### Step 1: Install vsce (if not already installed)
```bash
npm install -g @vscode/vsce
```

### Step 2: Package the extension
```bash
vsce package
```

This creates a `.vsix` file that you can:
- Share with others
- Install locally in VS Code
- Upload to VS Code Marketplace

### Step 3: Install the .vsix file locally
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Click the "..." menu → "Install from VSIX..."
4. Select your `.vsix` file

## 🌐 **Option 2: Publish to VS Code Marketplace**

### Prerequisites
1. Create a Visual Studio Marketplace account at https://marketplace.visualstudio.com/
2. Create a Personal Access Token (PAT) with Marketplace permissions

### Step 1: Login to vsce
```bash
vsce login abdelkhalik
```

### Step 2: Publish the extension
```bash
vsce publish
```

### Step 3: Update the extension
```bash
vsce publish minor  # for minor version updates
vsce publish major  # for major version updates
vsce publish patch  # for patch updates
```

## 🔧 **Option 3: Development Testing**

### Method 1: F5 Debug Mode
1. Open the extension folder in VS Code
2. Press `F5` to launch Extension Development Host
3. Test your extension in the new window

### Method 2: Install from source
```bash
# In the extension directory
npm install
npm run compile
vsce package
code --install-extension flutter-checker-1.0.0.vsix
```

## 📋 **Pre-deployment Checklist**

- [ ] Update version number in `package.json`
- [ ] Update `CHANGELOG.md` (if you have one)
- [ ] Test the extension thoroughly
- [ ] Ensure all dependencies are listed in `package.json`
- [ ] Check that `README.md` is up to date
- [ ] Verify the extension works in both VS Code and Cursor

## 🎯 **For This Extension**

### Current Status
- ✅ Extension is compiled and ready
- ✅ All dependencies are properly configured
- ✅ README is complete
- ✅ Publisher is set to "abdelkhalik"

### Next Steps
1. **Test locally**: Press `F5` to test in Extension Development Host
2. **Package**: Run `vsce package` to create .vsix file
3. **Share**: Distribute the .vsix file or publish to marketplace

## 🔗 **Useful Commands**

```bash
# Package the extension
vsce package

# Check for issues before packaging
vsce ls

# Show extension info
vsce show

# Login to marketplace
vsce login <publisher-name>

# Publish to marketplace
vsce publish

# Unpublish (within 24 hours)
vsce unpublish <extension-id>
```

## 📝 **Notes**

- The extension works in both VS Code and Cursor
- Make sure to test on different platforms if possible
- Keep your Personal Access Token secure
- Consider semantic versioning for updates
