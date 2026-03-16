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

### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `excludeFieldIds` | `false` | Skip checking table/table extension field IDs |
| `excludeEnumValueIds` | `false` | Skip checking enum/enum extension value IDs |

### Prerequisites

Your repository must be using [AL Object ID Ninja](https://marketplace.visualstudio.com/items?itemName=vjeko.vjeko-al-objid) VS Code extension with a committed `.objidconfig` file.
