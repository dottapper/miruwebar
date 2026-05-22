/**
 * テスト用GLB生成スクリプト
 *
 * 公開リリース（小容量モデル）のテスト用に、約2MBのUV球体GLBを生成する。
 * 依存パッケージなし（Node標準のみ）。glTF 2.0 バイナリ(GLB)を直接組み立てる。
 *
 * 使い方:
 *   node scripts/generate-test-glb.js [出力パス] [分割数]
 * 例:
 *   node scripts/generate-test-glb.js public/assets/test-sphere.glb 205
 */

import fs from 'fs';
import path from 'path';

const outPath = process.argv[2] || 'public/assets/test-sphere.glb';
// 分割数。205 でバイナリ約1.9MB（24*(N+1)^2 + 24*N^2 バイト）になる。
const bands = parseInt(process.argv[3] || '205', 10);
const RADIUS = 0.5;

const latBands = bands;
const lonBands = bands;

// --- 1. UV球体のジオメトリを生成 -----------------------------------------
const vertexCount = (latBands + 1) * (lonBands + 1);
const positions = new Float32Array(vertexCount * 3);
const normals = new Float32Array(vertexCount * 3);

let v = 0;
for (let lat = 0; lat <= latBands; lat++) {
  const theta = (lat * Math.PI) / latBands;
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);
  for (let lon = 0; lon <= lonBands; lon++) {
    const phi = (lon * 2 * Math.PI) / lonBands;
    const x = Math.cos(phi) * sinT;
    const y = cosT;
    const z = Math.sin(phi) * sinT;
    positions[v * 3] = x * RADIUS;
    positions[v * 3 + 1] = y * RADIUS;
    positions[v * 3 + 2] = z * RADIUS;
    normals[v * 3] = x;
    normals[v * 3 + 1] = y;
    normals[v * 3 + 2] = z;
    v++;
  }
}

const indexCount = latBands * lonBands * 6;
const indices = new Uint32Array(indexCount);
let i = 0;
for (let lat = 0; lat < latBands; lat++) {
  for (let lon = 0; lon < lonBands; lon++) {
    const first = lat * (lonBands + 1) + lon;
    const second = first + lonBands + 1;
    indices[i++] = first;
    indices[i++] = second;
    indices[i++] = first + 1;
    indices[i++] = second;
    indices[i++] = second + 1;
    indices[i++] = first + 1;
  }
}

// --- 2. バイナリバッファを組み立て（pos → normal → indices の順） --------
const posBytes = positions.byteLength;
const normBytes = normals.byteLength;
const idxBytes = indices.byteLength;
const binLength = posBytes + normBytes + idxBytes; // すべて4バイト境界

const bin = Buffer.alloc(binLength);
Buffer.from(positions.buffer).copy(bin, 0);
Buffer.from(normals.buffer).copy(bin, posBytes);
Buffer.from(indices.buffer).copy(bin, posBytes + normBytes);

// --- 3. glTF JSON を構築 --------------------------------------------------
const gltf = {
  asset: { version: '2.0', generator: 'miruwebar generate-test-glb.js' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'TestSphere' }],
  meshes: [{
    name: 'TestSphere',
    primitives: [{
      attributes: { POSITION: 0, NORMAL: 1 },
      indices: 2,
      material: 0
    }]
  }],
  materials: [{
    name: 'TestMaterial',
    pbrMetallicRoughness: {
      baseColorFactor: [0.4, 0.6, 0.95, 1.0],
      metallicFactor: 0.1,
      roughnessFactor: 0.6
    }
  }],
  buffers: [{ byteLength: binLength }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBytes, target: 34962 },
    { buffer: 0, byteOffset: posBytes, byteLength: normBytes, target: 34962 },
    { buffer: 0, byteOffset: posBytes + normBytes, byteLength: idxBytes, target: 34963 }
  ],
  accessors: [
    {
      bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3',
      min: [-RADIUS, -RADIUS, -RADIUS], max: [RADIUS, RADIUS, RADIUS]
    },
    { bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3' },
    { bufferView: 2, componentType: 5125, count: indexCount, type: 'SCALAR' }
  ]
};

// --- 4. GLBコンテナにパック ----------------------------------------------
const pad4 = (n) => (n + 3) & ~3;

let jsonBuf = Buffer.from(JSON.stringify(gltf), 'utf8');
const jsonPadded = pad4(jsonBuf.length);
if (jsonPadded > jsonBuf.length) {
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPadded - jsonBuf.length, 0x20)]); // スペース埋め
}
// binLength は4の倍数のためパディング不要

const totalLength = 12 + 8 + jsonBuf.length + 8 + bin.length;
const glb = Buffer.alloc(totalLength);
let off = 0;
glb.writeUInt32LE(0x46546c67, off); off += 4; // magic "glTF"
glb.writeUInt32LE(2, off); off += 4;          // version
glb.writeUInt32LE(totalLength, off); off += 4;
glb.writeUInt32LE(jsonBuf.length, off); off += 4;
glb.writeUInt32LE(0x4e4f534a, off); off += 4; // "JSON"
jsonBuf.copy(glb, off); off += jsonBuf.length;
glb.writeUInt32LE(bin.length, off); off += 4;
glb.writeUInt32LE(0x004e4942, off); off += 4; // "BIN\0"
bin.copy(glb, off);

// --- 5. 書き出し ----------------------------------------------------------
const absOut = path.resolve(outPath);
fs.mkdirSync(path.dirname(absOut), { recursive: true });
fs.writeFileSync(absOut, glb);

console.log(`✅ GLB生成完了: ${outPath}`);
console.log(`   頂点数: ${vertexCount.toLocaleString()} / 三角形数: ${(indexCount / 3).toLocaleString()}`);
console.log(`   ファイルサイズ: ${(glb.length / 1024 / 1024).toFixed(2)} MB (${glb.length.toLocaleString()} bytes)`);
