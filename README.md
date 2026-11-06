# AL Object ID Ninja - GitHub Action

> **Work in Progress** — This action is under active development and not yet ready for production use.

GitHub Action for [AL Object ID Ninja](https://marketplace.visualstudio.com/items?itemName=vjeko.vjeko-al-objid) CI/CD integration. It parses all AL files in the repository and compares them against the Ninja backend during pull requests and builds:

- **Untracked IDs** get inline warnings and fail the workflow.
- **Collisions**, the same object type and ID declared in more than one file of one app or app pool, get inline warnings. Set `fail-on-collision` to fail the workflow on them too. A collision under `#if` always only warns, because the declarations may never be compiled together.

## Usage

Create `.github/workflows/ninja-check.yml` in your repository. Change `main` if your main branch has a different name:

```yaml
name: AL Object ID Ninja Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: vjekob/al-objid-ninja-action@main
```

The action finds every `app.json` in your repository by itself. The backend has to know your app, so someone must have used Ninja on it or synchronized it. If your app is authorized, commit `.objidconfig`, because the action reads the authorization key from there.

To also fail on collisions:

```yaml
- uses: vjekob/al-objid-ninja-action@main
  with:
    fail-on-collision: 'true'
```

To use the result in a later step, give the step an `id`. Use `if: always()`, because later steps otherwise don't run after a failure:

```yaml
- id: ninja
  uses: vjekob/al-objid-ninja-action@main
- if: always()
  shell: bash
  run: |
    echo "Untracked IDs: ${{ steps.ninja.outputs.untracked-count }}" >> "$GITHUB_STEP_SUMMARY"
    echo "Collisions: ${{ steps.ninja.outputs.collision-count }}" >> "$GITHUB_STEP_SUMMARY"
```

The full guide is in the [help article](https://alid.ninja/help/extension/ci-cd-integration).

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
