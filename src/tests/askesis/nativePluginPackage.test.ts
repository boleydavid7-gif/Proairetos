import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Askesis native plugin package', () => {
  const appPackage = JSON.parse(read('package.json')) as {
    dependencies: Record<string, string>;
  };
  const pluginPackage = JSON.parse(read('packages/capacitor-askesis-bridge/package.json')) as {
    name: string;
    capacitor: {
      ios: { src: string };
      android: { src: string };
    };
  };

  it('is installed as a local dependency and exposes both Capacitor platforms', () => {
    expect(appPackage.dependencies['@proairetos/capacitor-askesis-bridge']).toBe(
      'file:packages/capacitor-askesis-bridge',
    );
    expect(pluginPackage.name).toBe('@proairetos/capacitor-askesis-bridge');
    expect(pluginPackage.capacitor).toEqual({
      ios: { src: 'ios' },
      android: { src: 'android' },
    });
  });

  it('keeps the JavaScript registration name aligned with both native implementations', () => {
    const capabilities = read('src/askesis/app/capabilities.ts');
    const swift = read('packages/capacitor-askesis-bridge/ios/Sources/AskesisBridgePlugin/AskesisBridgePlugin.swift');
    const android = read('packages/capacitor-askesis-bridge/android/src/main/java/com/proairetos/askesisbridge/AskesisBridgePlugin.java');
    expect(capabilities).toContain("registerPlugin<NativeBridgePlugin>('AskesisBridge')");
    expect(swift).toContain('public let jsName = "AskesisBridge"');
    expect(android).toContain('@CapacitorPlugin(name = "AskesisBridge")');
  });

  it('ships an explicit protocol-v1 handshake without claiming unfinished capabilities', () => {
    const swift = read('packages/capacitor-askesis-bridge/ios/Sources/AskesisBridgePlugin/AskesisBridgePlugin.swift');
    const android = read('packages/capacitor-askesis-bridge/android/src/main/java/com/proairetos/askesisbridge/AskesisBridgePlugin.java');
    for (const [source, platform] of [[swift, 'ios'], [android, 'android']] as const) {
      for (const capability of ['healthWorkouts', 'heartRate', 'backgroundGps', 'haptics', 'lockScreenControls', 'watchSync']) {
        expect(source).toMatch(new RegExp(platform === 'ios'
          ? `"${capability}"\\s*:\\s*false`
          : `put\\("${capability}",\\s*false\\)`));
      }
      expect(source).toMatch(platform === 'ios'
        ? /"protocolVersion": 1/
        : /put\("protocolVersion", 1\)/);
    }
  });
});
