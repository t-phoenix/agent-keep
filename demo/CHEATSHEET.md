# Demo cheatsheet

Two modes. Rehearse in test. Record in record. Same three commands.

| Folder | What you put there |
|---|---|
| `demo/inbox/` | The note, and an optional image, before you save |
| `demo/out/latest.html` | The page the command writes. Open this on camera |
| `demo/.session` | The 15-minute read pass. Created for you. Do not show it |

Default mode is **test**. Each save gets a new key, so you can run it as many times as you need. **record** uses one stable key, `task:<name>`, and overwrites it. That is the take.

From the repo root:

```bash
cd ~/Desktop/AgentKeep
chmod +x demo/save demo/list demo/read
```

## Rehearse

```bash
./demo/save grant-notes demo/inbox/grant.txt apps/web/public/brand/logo.png
./demo/list
./demo/read grant-notes
open demo/out/latest.html
```

`save` pays to store the image and the note. `list` pays to show every key for this wallet. `read` uses the 15-minute pass if it is still valid, and pays for a new pass when it is not. Then it writes the HTML page.

Change the task by renaming the first argument and editing the text file. Example: `./demo/save trip-plan demo/inbox/trip.txt`.

## Record

```bash
DEMO_MODE=record ./demo/save grant-notes demo/inbox/grant.txt apps/web/public/brand/logo.png
```

Close the terminal. Open a new one. This is the other agent. It does not reuse the old pass.

```bash
cd ~/Desktop/AgentKeep
DEMO_MODE=record ./demo/list
DEMO_MODE=record ./demo/read grant-notes
open demo/out/latest.html
```

`read` looks up `task:grant-notes` only in record mode. In test mode it looks up the newest `rehearsal:grant-notes:…` key. Use the same mode for save and read.

A save is about $0.006 USDC when you include the image, and $0.001 for the note alone. List and a expired read are $0.001. The default spend cap is $2 a day.
