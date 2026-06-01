## AL Object ID Ninja Task

Azure DevOps pipeline task for [AL Object ID Ninja Task](https://marketplace.visualstudio.com/items?itemName=vjeko.vjeko-al-objid). Detects untracked AL object IDs by comparing your repository against the Ninja backend.

### What it does

- Discovers all AL apps (`app.json`) in your repository
- Parses all `.al` files and extracts object IDs, table field IDs, and enum value IDs
- Compares them against the Ninja backend
- Fails the pipeline if any untracked IDs are found

### Usage

```yaml
steps:
  - task: al-objid-ninja@1
```

When your pipeline checks the repository out to a custom location, point the task at it with `workingDirectory`:

```yaml
steps:
  - checkout: self
    path: s/my-repo
  - task: al-objid-ninja@1
    inputs:
      workingDirectory: s/my-repo
```

### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `workingDirectory` | _(empty)_ | Directory to scan for AL apps (`app.json`). Leave empty to use the default sources directory (`Build.SourcesDirectory`). If your pipeline checks the repository out to a custom location via the `checkout` step's `path` parameter, set this to the same value. Relative paths are resolved against `Agent.BuildDirectory`; absolute paths are used as-is. |
| `excludeFieldIds` | `false` | Skip checking table/table extension field IDs |
| `excludeEnumValueIds` | `false` | Skip checking enum/enum extension value IDs |

### Prerequisites

Your repository must be using [AL Object ID Ninja](https://marketplace.visualstudio.com/items?itemName=vjeko.vjeko-al-objid) VS Code extension with a committed `.objidconfig` file.
