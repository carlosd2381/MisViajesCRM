import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseDocument } from 'yaml';

function workflowRelativePath(fileName) {
  return `.github/workflows/${fileName}`;
}

export function validateWorkflowYaml(rootDir = process.cwd()) {
  const errors = [];
  const workflowsDir = join(rootDir, '.github', 'workflows');

  let workflowFiles = [];
  try {
    workflowFiles = readdirSync(workflowsDir)
      .filter((fileName) => fileName.endsWith('.yml') || fileName.endsWith('.yaml'))
      .sort();
  } catch {
    errors.push('❌ Workflows directory is missing: .github/workflows');
    return errors;
  }

  if (workflowFiles.length === 0) {
    errors.push('❌ No workflow files found in .github/workflows');
    return errors;
  }

  for (const fileName of workflowFiles) {
    const absolutePath = join(workflowsDir, fileName);
    const source = readFileSync(absolutePath, 'utf8');
    const document = parseDocument(source);

    if (document.errors.length > 0) {
      errors.push(`❌ YAML parse errors in ${workflowRelativePath(fileName)}:`);
      for (const error of document.errors) {
        errors.push(`- ${error.message}`);
      }
      continue;
    }

    const data = document.toJS();
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      errors.push(`❌ Invalid workflow root object in ${workflowRelativePath(fileName)}`);
      continue;
    }

    if (!('on' in data)) {
      errors.push(`❌ Missing required key "on" in ${workflowRelativePath(fileName)}`);
    }

    const jobs = data.jobs;
    if (!jobs || typeof jobs !== 'object' || Array.isArray(jobs) || Object.keys(jobs).length === 0) {
      errors.push(`❌ Missing or empty "jobs" map in ${workflowRelativePath(fileName)}`);
    }
  }

  return errors;
}

export function runWorkflowYamlValidationCli(rootDir = process.cwd()) {
  const errors = validateWorkflowYaml(rootDir);

  if (errors.length > 0) {
    for (const message of errors) {
      console.error(`\n${message}`);
    }
    return 1;
  }

  console.log('✅ Workflow YAML check passed.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runWorkflowYamlValidationCli());
}
