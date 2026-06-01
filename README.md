# AL Object ID Ninja - Azure DevOps Task

> **Work in Progress** — This task is under active development and not yet ready for production use.

Azure DevOps pipeline task for [AL Object ID Ninja](https://marketplace.visualstudio.com/items?itemName=vjeko.vjeko-al-objid) CI/CD integration. Detects untracked AL object IDs by comparing your repository against the Ninja backend during builds.

## Usage

```yaml
steps:
  - task: al-objid-ninja@1
```

By default the task scans `Build.SourcesDirectory`. When your pipeline checks the repository out to a custom location via the `checkout` step's `path` parameter, `Build.SourcesDirectory` no longer points at the repository, so set the `workingDirectory` input to the same path:

```yaml
steps:
  - checkout: self
    path: s/my-repo
  - task: al-objid-ninja@1
    inputs:
      workingDirectory: s/my-repo
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `workingDirectory` | _(empty)_ | Directory to scan for AL apps (`app.json`). Leave empty to use the default sources directory (`Build.SourcesDirectory`). If your pipeline checks the repository out to a custom location via the `checkout` step's `path` parameter, set this to the same value. Relative paths are resolved against `Agent.BuildDirectory`; absolute paths are used as-is. |
| `excludeFieldIds` | `false` | Skip checking table/table extension field IDs |
| `excludeEnumValueIds` | `false` | Skip checking enum/enum extension value IDs |

## Features

- Discovers all AL apps (`app.json`) in the repository automatically
- Tracks object IDs, table field IDs, and enum value IDs
- Supports app pools — pooled apps share consumption
- Native AL parser for fast, accurate parsing
- Fails the pipeline if any untracked IDs are found

## Prerequisites

Your repository must be using the [AL Object ID Ninja](https://marketplace.visualstudio.com/items?itemName=vjeko.vjeko-al-objid) VS Code extension with a committed `.objidconfig` file.

## Building

```bash
npm install
npm run build   # compiles TypeScript, bundles dist-azdo/, prepares azdo-task/, and packages the VSIX
```

The bundled output (`dist-azdo/` and `azdo-task/`) must be committed — it is what the pipeline agents execute.
