import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const fail = (message) => {
  console.error(`Askesis native bridge verification failed: ${message}`);
  process.exitCode = 1;
};

const appPackage = readJson('package.json');
if (appPackage.dependencies?.['@proairetos/askesis-bridge'] !== 'file:packages/askesis-bridge') {
  fail('package.json must install the bridge from packages/askesis-bridge.');
}

const bridgePackage = readJson('packages/askesis-bridge/package.json');
if (bridgePackage.name !== '@proairetos/askesis-bridge') fail('The bridge package name is incorrect.');
if (bridgePackage.capacitor?.ios?.src !== 'ios') fail('Capacitor iOS source metadata is missing.');
if (bridgePackage.capacitor?.android?.src !== 'android') fail('Capacitor Android source metadata is missing.');

const requiredFiles = [
  'packages/askesis-bridge/Package.swift',
  'packages/askesis-bridge/AskesisBridge.podspec',
  'packages/askesis-bridge/ios/Sources/AskesisBridgePlugin/AskesisBridgePlugin.swift',
  'packages/askesis-bridge/src/definitions.ts',
  'packages/askesis-bridge/src/index.ts',
  'packages/askesis-bridge/android/build.gradle',
  'packages/askesis-bridge/android/src/main/AndroidManifest.xml',
  'packages/askesis-bridge/android/src/main/java/com/proairetos/askesisbridge/AskesisBridgePlugin.kt'
];

for (const path of requiredFiles) {
  if (!existsSync(resolve(root, path))) fail(`Missing tracked source: ${path}`);
}

const swift = readFileSync(resolve(root, 'packages/askesis-bridge/ios/Sources/AskesisBridgePlugin/AskesisBridgePlugin.swift'), 'utf8');
const kotlin = readFileSync(resolve(root, 'packages/askesis-bridge/android/src/main/java/com/proairetos/askesisbridge/AskesisBridgePlugin.kt'), 'utf8');
const manifest = readFileSync(resolve(root, 'packages/askesis-bridge/android/src/main/AndroidManifest.xml'), 'utf8');

if (!swift.includes('CAPBridgedPlugin') || !swift.includes('getCapabilities')) fail('The iOS protocol-v1 plugin implementation is incomplete.');
if (!kotlin.includes('@CapacitorPlugin(name = "AskesisBridge")') || !kotlin.includes('getCapabilities')) fail('The Android protocol-v1 plugin implementation is incomplete.');
if (manifest.includes('<uses-permission')) fail('Phase 7A must not add native permissions.');

if (process.exitCode) process.exit(process.exitCode);
console.log('Askesis native bridge source is present and ready for Capacitor sync.');
