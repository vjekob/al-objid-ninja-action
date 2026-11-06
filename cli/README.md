# AL Object ID Ninja CLI

Catch object ID problems before they reach your repository. Set this CLI up as a git hook, and a commit with a manually assigned object ID stops right there, on the developer's machine, instead of failing a build later. It works from any terminal and doesn't need VS Code.

It checks your AL apps against [AL Object ID Ninja](https://alid.ninja) for two kinds of problems:

- **Untracked IDs:** object, field, or enum value IDs the backend doesn't know about, such as an ID someone typed by hand. These always fail the check.
- **Collisions:** the same object type and ID declared in two files of one app or app pool. These warn, and `--fail-on-collision` makes them fail.

## Install

The CLI runs on **Node.js**, a separate program that AL development doesn't need otherwise, so you may not have it yet. Every developer who uses the CLI needs both on their own machine. Nothing gets added to your AL repository.

### 1. Check for Node.js

```bash
node --version
```

If it prints `v18.3.0` or a higher version, go to step 3. If the command isn't recognized, or the version is lower, continue with step 2.

### 2. Install Node.js

On Windows:

```powershell
winget install OpenJS.NodeJS.LTS
```

On macOS with [Homebrew](https://brew.sh):

```bash
brew install node
```

Or, on any system, download the LTS installer from [nodejs.org](https://nodejs.org).

Then close your terminal and open a new one, so it can find Node.js. If you use the terminal inside VS Code, restart VS Code.

### 3. Install the CLI

```bash
npm install --global @vjeko.com/al-object-id-ninja-cli
```

### 4. Check that it works

```bash
al-object-id-ninja-cli --help
```

You should see the usage text. On Windows, if the CLI later reports that it can't load the parser, also install the [Visual C++ runtime](https://aka.ms/vs/17/release/vc_redist.x64.exe). Most machines already have it.

To update, run the install command again. To remove the CLI, run `npm uninstall --global @vjeko.com/al-object-id-ninja-cli`.

To try it once without installing, if you have Node.js: `npx @vjeko.com/al-object-id-ninja-cli --help`.

## Run a check

From your repository, run the command. It finds every `app.json` under the current folder:

```bash
al-object-id-ninja-cli
```

To check a different folder, give its path:

```bash
al-object-id-ninja-cli C:\Source\MyApp
```

The backend has to know your app. If nobody has used Ninja on it yet, synchronize it once from VS Code.

## Read the results

When everything is fine:

```text
Discovered 1 AL app(s)
App "MyApp": parsed 12 file(s), 12 object(s)
All object IDs are tracked. No issues found.
```

With a manually assigned ID, the check fails:

```text
warning: app\Sales.Codeunit.al:1: codeunit 50050 "Sales Mgt." is not tracked by AL Object ID Ninja
error: 1 untracked object(s) found. Run sync or assign IDs using AL Object ID Ninja.
```

To fix it, use the **Store ID assignment** quick fix in VS Code, delete the ID and let Ninja assign a new one, or synchronize the app.

With a collision, you get a warning, and a failure only with `--fail-on-collision`:

```text
warning: app\A.Codeunit.al:1: codeunit 50000 "A" is also declared in app/B.Codeunit.al.
warning: app\B.Codeunit.al:1: codeunit 50000 "B" is also declared in app/A.Codeunit.al.
error: 1 object ID collision(s) found. Give each object its own ID.
```

A collision under `#if` always only warns, because the declarations may never be compiled together.

## Block bad commits with a git hook

Create a file named `pre-commit` in your repository's `.git/hooks` folder, with no file extension. This works on Windows too, because Git for Windows runs it:

```sh
#!/bin/sh
al-object-id-ninja-cli --staged --fail-on-collision
```

On macOS and Linux, also make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

Now a commit with a problem is cancelled. `--staged` reports only problems involving the AL files you are committing, so existing problems elsewhere don't block you. It reads your files from disk, so if you changed a file after staging it, it checks the newer content.

To skip the hook once, use `git commit --no-verify`.

### Share the hook with your team

Files in `.git/hooks` aren't committed. To share the hook, keep it in a committed folder:

1. Create `.githooks/pre-commit` with the same content.
2. Mark it as executable and commit it:

   ```bash
   git add .githooks/pre-commit
   git update-index --chmod=+x .githooks/pre-commit
   git commit -m "Add object ID pre-commit hook"
   ```

3. Each developer installs the CLI and runs this once in their clone:

   ```bash
   git config core.hooksPath .githooks
   ```

## Use it in a build pipeline

GitHub and Azure DevOps have a ready-made [action and task](https://alid.ninja/help/extension/ci-cd-integration). For anything else:

```bash
npm install --global @vjeko.com/al-object-id-ninja-cli
git config user.name "Build Agent"
git config user.email "build@example.com"
al-object-id-ninja-cli --fail-on-collision --fail-when-offline
```

Use an email your organization allows. `--fail-when-offline` makes the build fail rather than pass unchecked when the backend can't be reached.

## Get the result as JSON

```bash
al-object-id-ninja-cli --json > ninja-report.json
```

The JSON goes to standard output and progress messages go to standard error. It never contains your authorization key:

```json
{
  "success": false,
  "offline": false,
  "untracked": [
    {
      "app": "MyApp",
      "category": "object",
      "objectType": "codeunit",
      "objectId": 50050,
      "objectName": "Sales Mgt.",
      "file": "app/Sales.Codeunit.al",
      "line": 1
    }
  ],
  "collisions": [
    {
      "objectType": "codeunit",
      "objectId": 50000,
      "conditional": false,
      "locations": [
        { "app": "MyApp", "objectName": "A", "file": "app/A.Codeunit.al", "line": 1, "conditional": false },
        { "app": "MyApp", "objectName": "B", "file": "app/B.Codeunit.al", "line": 1, "conditional": false }
      ]
    }
  ],
  "errors": []
}
```

## All options

| Option | What it does |
|---|---|
| `--staged` | Report only problems involving AL files staged in git |
| `--json` | Print the result as JSON on standard output |
| `--fail-on-collision` | Fail on a collision instead of only warning |
| `--fail-when-offline` | Fail when the backend can't be reached instead of only warning |
| `--exclude-field-ids` | Skip table and table extension field IDs |
| `--exclude-enum-value-ids` | Skip enum and enum extension value IDs |
| `--help` | Show the usage text |

## Exit codes

| Code | Meaning | Example |
|---|---|---|
| 0 | No problems found | All IDs are tracked, or a collision that only warns |
| 1 | Problems found | An untracked ID, or a collision with `--fail-on-collision` |
| 2 | The check couldn't run | A rejected authorization key, or an app the backend doesn't know |

## Troubleshooting

- **"Backend returned HTTP 404: App not found":** the backend doesn't know this app yet. Synchronize it once from VS Code.
- **"Authentication failed (401)":** the app is authorized, but `.objidconfig` has no valid key. Pull the latest `.objidconfig`.
- **"Backend unreachable":** you are offline. The CLI warns and doesn't fail, unless you use `--fail-when-offline`. It still checks for collisions.
- **"No AL apps (app.json) found":** there's no `app.json` in or below this folder. Go to your repository, or give its path.
- **The hook says "command not found":** make sure `al-object-id-ninja-cli --help` works in a terminal. If it does, restart VS Code or your git tool, so it can find newly installed programs.

More details are in the [help article](https://alid.ninja/help/extension/command-line).
