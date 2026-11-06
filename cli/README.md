# AL Object ID Ninja CLI

Stop object ID problems before they are committed. This CLI checks your AL apps against
[AL Object ID Ninja](https://alid.ninja) without VS Code: it reports object, field, and enum value
IDs the backend doesn't track, and object IDs declared in more than one file of an app or app pool.

## Use it in a pre-commit hook

Install it, then add this to `.git/hooks/pre-commit`:

```sh
#!/bin/sh
npx al-object-id-ninja-cli --staged --fail-on-collision
```

`--staged` reports only problems involving the AL files you are committing. A commit is blocked when
the command exits with anything other than 0.

## Options

| Option | What it does |
|---|---|
| `--staged` | Report only problems involving AL files staged in git |
| `--json` | Print the result as JSON on stdout |
| `--fail-on-collision` | Exit 1 on a collision. By default collisions only warn |
| `--fail-when-offline` | Exit 2 when the backend can't be reached. By default this only warns |
| `--exclude-field-ids` | Skip table and table extension field IDs |
| `--exclude-enum-value-ids` | Skip enum and enum extension value IDs |

The path to check is the first argument, and defaults to the current folder.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | No problems found |
| 1 | Problems found |
| 2 | The check could not run, for example a rejected auth key or an app the backend doesn't know yet |

## Things to know

- A collision under `#if` always warns and never fails, because the declarations may never be compiled together.
- The CLI reads files from your working folder, so with `--staged` it checks their current content, not the staged version.
- It identifies you from your local git `user.name` and `user.email`.
- On Windows, the parser needs the [Visual C++ runtime](https://aka.ms/vs/17/release/vc_redist.x64.exe).
