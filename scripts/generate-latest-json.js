/**
 * macOS と Windows 用の latest.json を生成する（Linux は自動更新対象外）
 * 実行前に Mac / Windows ビルドが完了し、.sig が存在していること。
 * 使い方: npm run generate-latest-json [出力パス]
 *         出力パス省略時はプロジェクトルートの latest.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const REPO_URL = 'https://github.com/Bokuchi-Editor/bokuchi';

const outputPath = process.argv[2] || path.join(REPO_ROOT, 'latest.json');

const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
const version = pkg.version;
if (!version) {
  console.error('エラー: package.json に version がありません');
  process.exit(1);
}

const macSigPath = path.join(
  REPO_ROOT,
  'src-tauri/target/universal-apple-darwin/release/bundle/macos/Bokuchi.app.tar.gz.sig'
);
const winSigPath = path.join(
  REPO_ROOT,
  `src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/Bokuchi_${version}_x64-setup.exe.sig`
);

if (!fs.existsSync(macSigPath)) {
  console.error('エラー: macOS 用 .sig が見つかりません:', macSigPath);
  console.error('  universal-apple-darwin でビルドしてから実行してください');
  process.exit(1);
}
if (!fs.existsSync(winSigPath)) {
  console.error('エラー: Windows 用 .sig が見つかりません:', winSigPath);
  console.error('  x86_64-pc-windows-gnu でビルドしてから実行してください');
  process.exit(1);
}

const macSig = fs.readFileSync(macSigPath, 'utf8').replace(/\n/g, '');
const winSig = fs.readFileSync(winSigPath, 'utf8').replace(/\n/g, '');

const macUrl = `${REPO_URL}/releases/download/v${version}/Bokuchi.app.tar.gz`;
const winUrl = `${REPO_URL}/releases/download/v${version}/Bokuchi_${version}_x64-setup.exe`;

const pubDate = new Date().toISOString();

const json = {
  version,
  notes: `${REPO_URL}/releases/tag/v${version}`,
  pub_date: pubDate,
  platforms: {
    'darwin-aarch64': { signature: macSig, url: macUrl },
    'darwin-x86_64': { signature: macSig, url: macUrl },
    'windows-x86_64': { signature: winSig, url: winUrl },
  },
};

fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));

console.log('生成しました:', outputPath, '(version:', version + ')');
console.log('  darwin-aarch64 / darwin-x86_64: Bokuchi.app.tar.gz');
console.log('  windows-x86_64: Bokuchi_' + version + '_x64-setup.exe');
