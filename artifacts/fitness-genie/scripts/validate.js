const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const exportRoot = path.join(projectRoot, '.expo-validation');

const checks = [
  {
    label: 'Expo dependency alignment',
    command: 'pnpm',
    args: ['exec', 'expo', 'install', '--check'],
    env: { CI: '1' },
  },
  {
    label: 'Expo Doctor',
    command: 'pnpm',
    args: ['exec', 'expo-doctor'],
  },
  {
    label: 'TypeScript',
    command: 'pnpm',
    args: ['run', 'typecheck'],
  },
  {
    label: 'Tests',
    command: 'pnpm',
    args: ['run', 'test'],
  },
  {
    label: 'iOS export',
    command: 'pnpm',
    args: [
      'exec',
      'expo',
      'export',
      '--platform',
      'ios',
      '--output-dir',
      path.join(exportRoot, 'ios'),
    ],
  },
  {
    label: 'Android export',
    command: 'pnpm',
    args: [
      'exec',
      'expo',
      'export',
      '--platform',
      'android',
      '--output-dir',
      path.join(exportRoot, 'android'),
    ],
  },
];

function formatCommand(check) {
  return [check.command, ...check.args].join(' ');
}

function runCheck(check, index) {
  console.log(`\n[${index}/${checks.length}] ${check.label}`);
  console.log(`$ ${formatCommand(check)}`);

  const result = spawnSync(check.command, check.args, {
    cwd: projectRoot,
    env: { ...process.env, ...check.env },
    stdio: 'inherit',
  });

  if (result.error) {
    throw new Error(`${check.label} could not start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const reason =
      result.status === null
        ? `terminated by signal ${result.signal}`
        : `exited with code ${result.status}`;
    throw new Error(`${check.label} failed: ${reason}`);
  }
}

try {
  fs.rmSync(exportRoot, { recursive: true, force: true });

  for (let index = 0; index < checks.length; index += 1) {
    runCheck(checks[index], index + 1);
  }

  console.log('\nExpo compatibility validation passed.');
} catch (error) {
  console.error(`\nExpo compatibility validation stopped: ${error.message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(exportRoot, { recursive: true, force: true });
}