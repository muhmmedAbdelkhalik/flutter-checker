# 📦 Extension Installation Guide

## 🎉 **Your Extension is Ready!**

Your VS Code extension has been successfully packaged as `flutter-checker-1.0.0.vsix`

## 🚀 **How to Install the Extension**

### **Method 1: Install from .vsix file (Recommended)**

1. **Open VS Code or Cursor**
2. **Go to Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. **Click the "..." menu** (three dots) in the Extensions panel
4. **Select "Install from VSIX..."**
5. **Navigate to your extension folder** and select `flutter-checker-1.0.0.vsix`
6. **Click "Install"**

### **Method 2: Command Line Installation**

```bash
# In VS Code
code --install-extension flutter-checker-1.0.0.vsix

# In Cursor (if you have the CLI)
cursor --install-extension flutter-checker-1.0.0.vsix
```

### **Method 3: Development Testing**

1. **Open the extension folder** in VS Code
2. **Press `F5`** to launch Extension Development Host
3. **Test your extension** in the new window

## 🧪 **How to Test the Extension**

1. **Open a pubspec.yaml file** (use the included `sample-pubspec.yaml`)
2. **Run the command**: `Ctrl+Shift+P` → "Flutter Checker: Check for Outdated Packages"
3. **Observe the highlights** on outdated packages
4. **Hover over highlighted packages** to see version information
5. **Click "Open on pub.dev"** to test navigation

## 📋 **What the Extension Does**

- ✅ **Highlights outdated packages** with colored underlines
- ✅ **Shows version comparison** in the editor
- ✅ **Provides hover information** with current → latest versions
- ✅ **Opens pub.dev pages** when you click the link
- ✅ **Works in both VS Code and Cursor**

## 🔧 **Troubleshooting**

### If the extension doesn't work:
1. **Check VS Code version** - requires VS Code 1.74.0 or higher
2. **Reload VS Code** after installation
3. **Check the Output panel** for any error messages
4. **Make sure you're in a pubspec.yaml file** when testing

### If you see errors:
1. **Open Developer Tools** (`Help` → `Toggle Developer Tools`)
2. **Check the Console** for error messages
3. **Try reinstalling** the extension

## 🎯 **Next Steps**

### **For Personal Use:**
- The extension is ready to use!
- Install it and start checking your Flutter projects

### **For Sharing:**
- Share the `flutter-checker-1.0.0.vsix` file with others
- They can install it using Method 1 above

### **For Publishing to Marketplace:**
- You'll need to upgrade Node.js to version 20+ for vsce compatibility
- Or use the manual packaging method we used

## 📁 **File Structure**

```
flutter-extension/
├── flutter-checker-1.0.0.vsix  ← Your installable extension
├── package.json                              ← Extension manifest
├── out/                                      ← Compiled JavaScript
├── src/                                      ← TypeScript source
├── README.md                                 ← Documentation
└── sample-pubspec.yaml                       ← Test file
```

## 🎉 **Congratulations!**

Your VS Code extension is now ready to use! It will help you and others identify outdated packages in Flutter/Dart projects with a clean, simple interface.
