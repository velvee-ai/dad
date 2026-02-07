/**
 * Quick smoke test for ProjectScanner.
 * Run with: npx ts-node scripts/test-scanner.ts
 */
import * as path from 'path';

// Use relative import since we're outside the webpack context
const { ProjectScanner } = require('../apps/vscode-extension/src/extension/utils/projectScanner');

const mockRoot = path.resolve(__dirname, '../examples/mock-microservices');

console.log(`\nScanning: ${mockRoot}\n`);

const skeleton = ProjectScanner.scan(mockRoot);

console.log(`Total nodes: ${skeleton.nodes.length}\n`);

// Count by level
const byLevel: Record<string, number> = {};
for (const node of skeleton.nodes) {
  byLevel[node.c4Level] = (byLevel[node.c4Level] || 0) + 1;
}

console.log('Nodes by C4 level:');
for (const [level, count] of Object.entries(byLevel)) {
  console.log(`  ${level}: ${count}`);
}

console.log('\nFull tree:');
console.log(ProjectScanner.printSkeleton(skeleton));

// Validate hierarchy
let issues = 0;
for (const node of skeleton.nodes) {
  if (node.parentId && !skeleton.nodes.find((n: any) => n.id === node.parentId)) {
    console.error(`  BROKEN: node "${node.id}" references missing parent "${node.parentId}"`);
    issues++;
  }
  for (const childId of node.childIds) {
    if (!skeleton.nodes.find((n: any) => n.id === childId)) {
      console.error(`  BROKEN: node "${node.id}" references missing child "${childId}"`);
      issues++;
    }
  }
}

if (issues === 0) {
  console.log('\nHierarchy integrity: OK');
} else {
  console.log(`\nHierarchy integrity: ${issues} issues found`);
}
