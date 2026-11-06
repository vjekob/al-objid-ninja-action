# AL Object ID Ninja - GitHub Action

> **Work in Progress** — This action is under active development and not yet ready for production use.

GitHub Action for [AL Object ID Ninja](https://marketplace.visualstudio.com/items?itemName=vjeko.vjeko-al-objid) CI/CD integration. It parses all AL files in the repository and compares them against the Ninja backend during pull requests and builds:

- **Untracked IDs** get inline warnings and fail the workflow.
- **Collisions**, the same object type and ID declared in more than one file of one app or app pool, get inline warnings. Set `fail-on-collision` to fail the workflow on them too. A collision under `#if` always only warns, because the declarations may never be compiled together.

## Usage

```yaml
- uses: vjekob/al-objid-ninja-action@main
  with:
    fail-on-collision: 'true'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `exclude-field-ids` | No | `false` | Skip checking table/table extension field IDs |
| `exclude-enum-value-ids` | No | `false` | Skip checking enum/enum extension value IDs |
| `fail-on-collision` | No | `false` | Fail the workflow on a collision instead of only warning |

## Outputs

| Output | Description |
|--------|-------------|
| `result` | The full result as JSON: `success`, `untracked`, `collisions`, and `errors` |
| `untracked-count` | Number of untracked IDs found |
| `collision-count` | Number of collisions found |

## Features

- Discovers all AL apps (`app.json`) in the repository automatically
- Tracks object IDs, table field IDs, and enum value IDs
- Supports app pools — pooled apps share consumption
- Native AL parser for fast, accurate parsing

## Command line and git hooks

The same checks are available without GitHub through the CLI. See [cli/README.md](cli/README.md).

## Building

```bash
npm install
npm test
npm run build       # compiles TypeScript and bundles the action into dist/index.js
npm run pack:cli    # builds the CLI and packs its npm package
```

`dist/index.js` must be committed — it is what GitHub runners execute.
