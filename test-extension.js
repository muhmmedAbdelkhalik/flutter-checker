// Simple Node.js script to test if the extension loads correctly
const fs = require('fs');
const path = require('path');

console.log('Testing extension structure...');

// Check if main files exist
const mainFile = './out/extension.js';
const packageFile = './package.json';

if (fs.existsSync(mainFile)) {
    console.log('✅ Main extension file exists:', mainFile);
    
    // Try to load the extension
    try {
        const extension = require(mainFile);
        console.log('✅ Extension module loaded successfully');
        console.log('Exports:', Object.keys(extension));
        
        if (extension.activate) {
            console.log('✅ activate function found');
        } else {
            console.log('❌ activate function NOT found');
        }
        
    } catch (error) {
        console.log('❌ Error loading extension:', error.message);
    }
} else {
    console.log('❌ Main extension file missing:', mainFile);
}

if (fs.existsSync(packageFile)) {
    console.log('✅ Package.json exists');
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    console.log('Main entry point:', pkg.main);
    console.log('Activation events:', pkg.activationEvents);
    console.log('Commands:', pkg.contributes?.commands?.map(c => c.command));
} else {
    console.log('❌ Package.json missing');
}
