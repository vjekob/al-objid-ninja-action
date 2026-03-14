# AL Object ID Ninja - GitHub Action

> **Work in Progress** — This action is under active development and not yet ready for production use.

GitHub Action for [AL Object ID Ninja](https://marketplace.visualstudio.com/items?itemName=vjeko.vjeko-al-objid) CI/CD integration. Detects untracked AL object IDs or synchronizes consumption with the Ninja backend during pull requests and builds.

## Modes

- **`warn`** (default) — Parses all AL files in the repository, compares object IDs against the Ninja backend, and emits inline warnings for any untracked IDs. Fails the workflow if untracked IDs are found.
- **`sync`** — Merges the repository's current object ID consumption into the Ninja backend.

## Usage

```yaml
- uses: vjekob/al-objid-ninja-action@main
  with:
    mode: 'warn'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `mode` | No | `warn` | `warn` or `sync` |
| `exclude-field-ids` | No | `false` | Skip checking table/table extension field IDs |
| `exclude-enum-value-ids` | No | `false` | Skip checking enum/enum extension value IDs |

## Features

- Discovers all AL apps (`app.json`) in the repository automatically
- Tracks object IDs, table field IDs, and enum value IDs
- Supports app pools — pooled apps share consumption
- Native AL parser for fast, accurate parsing

## Building

```bash
npm install
npm run build   # compiles TypeScript and bundles into dist/index.js
```

`dist/index.js` must be committed — it is what GitHub runners execute.
