/**
 * AntiBridge-AutoAccept Extension
 * 
 * Extension độc lập - 2 nhiệm vụ:
 * 1. Đăng ký keyboard shortcuts (cho CDP remote trigger)
 * 2. Chế độ Auto Accept với delay người dùng tùy chỉnh
 * 
 * Settings (File > Preferences > Settings > AntiBridge):
 * - antibridge.autoAcceptDelay: Delay (ms), mặc định 2000
 * - antibridge.autoStartEnabled: Tự động bật khi khởi động
 * 
 * Keyboard Shortcuts:
 * - Ctrl+Alt+Shift+T: Toggle Auto Accept
 * - Ctrl+Alt+Shift+A: Manual Accept
 * - Ctrl+Alt+Shift+R: Manual Reject
 * - Ctrl+Alt+Shift+Up/Down: Tăng/Giảm delay
 * 
 * Author: Linh Ban Banh Bao
 * Version: 1.0.0
 */

const vscode = require('vscode');

// ============ STATE ============
let autoAcceptEnabled = false;
let autoAcceptInterval = null;
let statusBarItem = null;
let currentDelay = 2000;

const MIN_DELAY = 500;
const MAX_DELAY = 10000;
const DELAY_STEP = 500;

// ============ ACTIVATION ============
function activate(context) {
    console.log('🚀 AntiBridge-AutoAccept activated!');

    // Load settings
    loadSettings();

    // Watch for settings changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('antibridge')) {
                loadSettings();
                if (autoAcceptEnabled) startAutoAccept();
                updateStatusBar();
            }
        })
    );

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    statusBarItem.command = 'antibridge.toggleAutoAccept';
    context.subscriptions.push(statusBarItem);
    updateStatusBar();
    statusBarItem.show();

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('antibridge.toggleAutoAccept', toggleAutoAccept),
        vscode.commands.registerCommand('antibridge.manualAccept', manualAccept),
        vscode.commands.registerCommand('antibridge.manualReject', manualReject),
        vscode.commands.registerCommand('antibridge.increaseDelay', increaseDelay),
        vscode.commands.registerCommand('antibridge.decreaseDelay', decreaseDelay)
    );

    // Auto-start if enabled in settings
    const config = vscode.workspace.getConfiguration('antibridge');
    if (config.get('autoStartEnabled')) {
        autoAcceptEnabled = true;
        startAutoAccept();
        updateStatusBar();
        vscode.window.showInformationMessage(`🤖 Auto Accept: Started (${currentDelay}ms)`);
    } else {
        vscode.window.showInformationMessage(`📱 AntiBridge: Manual mode (${currentDelay}ms)`);
    }
}

// ============ SETTINGS ============
function loadSettings() {
    const config = vscode.workspace.getConfiguration('antibridge');
    currentDelay = config.get('autoAcceptDelay') || 2000;

    // Clamp to valid range
    currentDelay = Math.max(MIN_DELAY, Math.min(MAX_DELAY, currentDelay));
}

function saveDelay(newDelay) {
    const config = vscode.workspace.getConfiguration('antibridge');
    config.update('autoAcceptDelay', newDelay, vscode.ConfigurationTarget.Global);
}

// ============ STATUS BAR ============
function updateStatusBar() {
    if (!statusBarItem) return;

    if (autoAcceptEnabled) {
        statusBarItem.text = `🤖 Auto (${currentDelay}ms)`;
        statusBarItem.tooltip = `Auto Accept: ON\nDelay: ${currentDelay}ms\nClick to pause`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
        statusBarItem.text = `📱 Manual`;
        statusBarItem.tooltip = `Manual mode\nDelay: ${currentDelay}ms\nCtrl+Alt+Shift+A = Accept\nCtrl+Alt+Shift+R = Reject`;
        statusBarItem.backgroundColor = undefined;
    }
}

// ============ AUTO ACCEPT ============
function toggleAutoAccept() {
    autoAcceptEnabled = !autoAcceptEnabled;
    updateStatusBar();

    if (autoAcceptEnabled) {
        startAutoAccept();
        vscode.window.showInformationMessage(`🤖 Auto Accept: ON (${currentDelay}ms)`);
    } else {
        stopAutoAccept();
        vscode.window.showInformationMessage('📱 Manual Mode');
    }
}

function startAutoAccept() {
    stopAutoAccept();

    autoAcceptInterval = setInterval(async () => {
        if (!autoAcceptEnabled) return;

        try { await vscode.commands.executeCommand('antigravity.agent.acceptAgentStep'); } catch (e) { }
        try { await vscode.commands.executeCommand('antigravity.terminal.accept'); } catch (e) { }
        try { await vscode.commands.executeCommand('antigravity.terminalCommand.accept'); } catch (e) { }
    }, currentDelay);
}

function stopAutoAccept() {
    if (autoAcceptInterval) {
        clearInterval(autoAcceptInterval);
        autoAcceptInterval = null;
    }
}

// ============ DELAY ADJUSTMENT ============
function increaseDelay() {
    if (currentDelay < MAX_DELAY) {
        currentDelay += DELAY_STEP;
        saveDelay(currentDelay);
        updateStatusBar();
        if (autoAcceptEnabled) startAutoAccept();
        vscode.window.setStatusBarMessage(`⏱️ Delay: ${currentDelay}ms`, 2000);
    }
}

function decreaseDelay() {
    if (currentDelay > MIN_DELAY) {
        currentDelay -= DELAY_STEP;
        saveDelay(currentDelay);
        updateStatusBar();
        if (autoAcceptEnabled) startAutoAccept();
        vscode.window.setStatusBarMessage(`⏱️ Delay: ${currentDelay}ms`, 2000);
    }
}

// ============ MANUAL ACCEPT/REJECT ============
async function manualAccept() {
    try { await vscode.commands.executeCommand('antigravity.agent.acceptAgentStep'); } catch (e) { }
    try { await vscode.commands.executeCommand('antigravity.terminal.accept'); } catch (e) { }
    try { await vscode.commands.executeCommand('antigravity.terminalCommand.accept'); } catch (e) { }
    vscode.window.setStatusBarMessage('✅ Accepted!', 2000);
}

async function manualReject() {
    try { await vscode.commands.executeCommand('antigravity.agent.rejectAgentStep'); } catch (e) { }
    try { await vscode.commands.executeCommand('antigravity.terminalCommand.reject'); } catch (e) { }
    vscode.window.setStatusBarMessage('❌ Rejected!', 2000);
}

// ============ DEACTIVATION ============
function deactivate() {
    stopAutoAccept();
}

module.exports = { activate, deactivate };
