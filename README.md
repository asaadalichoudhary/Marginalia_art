> This is a plain, standard Markdown file. It's meant to be read on GitHub, in a text
> editor, or in any Markdown viewer — some terminal apps (like Warp) try to render
> Markdown inline and can mangle the formatting. If that happens, open this file in
> TextEdit, Notepad, VS Code, or a browser instead.

# Marginalia

Marginalia is an app for reading novels. Give it a PDF and it reads ahead of you, and
draws a pencil-sketch illustration for scenes as they come up — so by the time you turn
the page to a big moment, the picture is already sitting there waiting for you.

This document walks you through getting it running on your own computer, one step at a
time, assuming you've never done anything like this before. It will take about twenty to
thirty minutes the first time, almost all of it waiting for things to install. You only
have to do it once.

There are three parts to set up, done in this order:

1. A free account with a company called Cloudflare, which is what actually draws the
   pictures.
2. Some free developer tools on your computer, which let the app run.
3. The app itself.

---

## Before you start: two words you'll see a lot

**Terminal.** This is a plain, text-only program already built into your Mac or Windows
computer. Instead of clicking buttons, you type a line of text and press Enter, and it
does the thing. It looks intimidating the first time but every command below is given to
you exactly as you should type it — you're just copying, not writing your own.

- On a Mac: press `Cmd + Space`, type `Terminal`, press Enter.
- On Windows: press the Windows key, type `PowerShell`, press Enter.

**Folder path.** When these instructions say something like `~/Downloads/marginalia`,
that's just an address for a folder on your computer, the same way a street address
points to a house. `~` is a shortcut that means "my home folder." You'll mostly use `cd`
(which means "change directory," i.e. "go into this folder") to move Terminal into the
right folder before running a command.

---

## Part 1 — Set up the free artist (Cloudflare)

The app doesn't draw the pictures itself. It sends a request out to a drawing service,
and gets a picture back. We're using Cloudflare because they offer a very generous free
allowance — no credit card, no trial period that expires.

### 1.1 Make a Cloudflare account

Go to **dash.cloudflare.com** and sign up with an email address. It's free.

### 1.2 Create the Worker

A "Worker" is just Cloudflare's name for a small program that lives on their servers and
does one job — in our case, drawing pictures when asked.

1. Once you're logged in, look in the left-hand sidebar for **Workers & Pages**, and
   click it.
2. Click the button to create something new — it may say **Create**, **Create
   application**, or similar. Choose to create a **Worker**.
3. It will ask you to name it. Type `marginalia-studio` (or any name you like — it
   doesn't have to match this exactly, and it's fine to keep a different name if you
   already created one).
4. It will offer you some starter code ("Hello World"). Click **Deploy** to accept it for
   now; we're about to replace it anyway.

### 1.3 Paste in the actual code

1. From the Worker's page, find the button to **edit the code** (sometimes called
   "Edit code," or it takes you to a code editor automatically).
2. You'll see a text editor full of some placeholder code. Select all of it (Cmd+A or
   Ctrl+A) and delete it.
3. Open the file called `worker.js` that came with this project (inside the `worker`
   folder) in any text editor, select all of its contents, and copy it.
4. Paste that into Cloudflare's code editor, replacing everything.
5. Click **Deploy** (or **Save and Deploy**).

### 1.4 Give it permission to draw

The Worker needs to be connected to Cloudflare's image-drawing models. This is called a
"binding."

1. On your Worker's page, look for a tab or section called **Bindings** (sometimes it's
   inside a **Settings** tab).
2. Click **Add binding** (it might just be a **+** button).
3. From the list of options, choose **Workers AI**.
4. It will ask for a name for this binding. Type exactly: `AI` (just those two capital
   letters).
5. Save.

If you check back here later and see a binding called **Workers AI** with the name `AI`
already sitting there, you don't need to add anything — it's already done.

### 1.5 Set the password

Right now, anyone on the internet who found your Worker's address could use it and burn
through your free allowance. So we lock it with a password. Cloudflare calls this a
"secret."

1. Still on your Worker's page, find **Settings**, then **Variables and Secrets**.
2. Click **Add**.
3. For the type, choose **Secret**.
4. For the name, type exactly: `STUDIO_KEY`
5. For the value, type any long, random phrase — for example
   `pencil-lighthouse-1880-sketchbook`. This is your password. Write it down somewhere
   safe (a notes app is fine); you'll need it again in a minute.
6. Save.

### 1.6 Copy your Worker's address

Every Worker gets its own web address. Find it on the Worker's overview page — it's
usually shown near the top, and it looks like:

```
https://marginalia-studio.your-name.workers.dev
```

(Yours will have your own Cloudflare account name in the middle instead of
"your-name.") Copy this whole address somewhere you can find it again — you'll paste it
into the app shortly. There is also a toggle nearby that mentions "Enable Access" —
leave that turned off; it's a different kind of lock meant for company tools, and turning
it on would stop the app from reaching your Worker. The `STUDIO_KEY` password from the
step above is the only lock you need.

That's the entire Cloudflare side. You won't need to visit it again unless something goes
wrong.

---

## Part 2 — Install the developer tools

The app is built with a toolkit called Tauri, which needs two things installed on your
computer first: **Node.js** and **Rust**. Both are free, both are standard, well-known
developer tools, and both are safe to install.

Open Terminal and go through these one at a time.

### 2.1 Check whether you already have Node.js

Type:

```
node -v
```

and press Enter.

- If you see something like `v20.11.0`, you already have it — skip to 2.2.
- If you see something like "command not found," you need to install it: go to
  **nodejs.org** in your browser, download the installer for your computer (choose the
  version marked **LTS**), open the downloaded file, and click through the installer
  using all the default options. Once it's finished, close Terminal completely and open
  a fresh window, then run `node -v` again to confirm it worked.

### 2.2 Check whether you already have Rust

Type:

```
rustc --version
```

- If you see something like `rustc 1.82.0`, you're set — skip to 2.3.
- If you see "command not found":
  - **On a Mac or Linux:** paste this into Terminal and press Enter:
    ```
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    ```
    It will print some information and ask a question — just press Enter to accept the
    default option. Wait for it to finish, then close and reopen Terminal, and check
    again with `rustc --version`.
  - **On Windows:** go to **rustup.rs**, download `rustup-init.exe`, and run it. When it
    asks, choose the default installation option. It may also ask you to install
    "Microsoft C++ Build Tools" first — if so, follow the link it gives you, install
    those, then come back and run the Rust installer again. Once it's done, close and
    reopen PowerShell and check with `rustc --version`.

### 2.3 One more thing, only if you're on a Mac

Type:

```
xcode-select --install
```

A window will pop up asking to install Apple's command line developer tools. Click
**Install** and wait a few minutes. If it tells you they're already installed, that's
fine — you're done with this step.

### 2.4 One more thing, only if you're on Windows

Tauri needs a piece of Windows called "WebView2" to display the app — almost every
Windows 10 or 11 computer already has this built in, so you likely don't need to do
anything. If the app later fails to open with a message mentioning WebView2, download it
from Microsoft directly by searching "WebView2 Runtime download."

---

## Part 3 — Run the app

### 3.1 Find the project folder

Unzip the file this project came in if you haven't already (double-click it). Note where
it ends up — for example, if it lands in your Downloads folder, the app's folder might be
at `~/Downloads/marginalia`.

In Terminal, move into that folder. For example:

```
cd ~/Downloads/marginalia
```

Adjust the path to wherever your folder actually is. If you're not sure, you can type
`cd ` (with a trailing space, don't press Enter yet), then drag the folder from Finder
or File Explorer directly into the Terminal window — it will fill in the correct path
for you automatically. Then press Enter.

**Tip:** if you get an error like `no such file or directory` or
`Could not read package.json`, it almost always means you're in the wrong folder. Type
`ls` (Mac) or `dir` (Windows) and press Enter to see what's actually inside your current
folder — you should see a file named `package.json` in the list. If you don't, you're one
level too high or too low; use `cd` followed by the next folder's name to go deeper, or
`cd ..` to go back up one level, until `ls` shows you `package.json`.

### 3.2 Install the app's small helper packages

Once you're in the right folder, type:

```
npm install
```

This downloads a handful of small, standard packages the project depends on. It should
take under a minute and will print some text as it works.

### 3.3 Start the app

Type:

```
npm run dev
```

**The very first time you do this, it will be slow — five to fifteen minutes** — because
it's compiling the app's native shell from scratch, and your screen will fill with
scrolling technical text. This is completely normal; just let it run. Every time after
this first one, it will start in a few seconds.

When it's done, a window titled **Marginalia** will open on your screen.

---

## Part 4 — Connect the app to your free artist

The app is open, but it doesn't know about the Cloudflare Worker you set up in Part 1
yet.

1. Click **Set up the studio** (or, if you're already inside a book, open **Settings**
   and then **Studio: who draws the plates**).
2. Make sure **Cloudflare** is selected.
3. In **Worker address**, paste the address you copied in step 1.6 — it should look like
   `https://marginalia-studio.your-name.workers.dev`
4. In **Studio secret**, type the exact same password you set in step 1.5 (the
   `STUDIO_KEY` value).
5. Click **Draw a test plate**. Wait a moment — the first drawing can take up to a
   minute. If a pencil-sketch picture appears, everything is connected correctly.

If it fails instead, see the Troubleshooting section below.

### 4.1 Open a book

Close the studio dialog, click **Open a PDF novel**, and choose a novel saved as a PDF
file on your computer. It needs to be a real, selectable-text PDF (not a photo or scan of
a book) — most ebooks purchased or downloaded as PDF will work fine.

Give it a minute or two after you start reading. The app deliberately reads ahead of you
by about sixteen pages, so the first picture won't appear instantly on page one — it's
being drawn in the background while you read the opening pages.

---

## Troubleshooting

**"command not found" for `node`, `npm`, or `rustc`, even after installing.** Close
Terminal completely (Cmd+Q on a Mac, or just close the window on Windows) and open a
brand new window. Installers often need a fresh Terminal window to be recognized.

**`npm install` or `npm run dev` says something about `package.json` not being found.**
You're in the wrong folder. See the tip in step 3.1.

**The test plate fails with "rejected the key" or a 401 error.** The password you typed
in the app doesn't match the `STUDIO_KEY` secret you set on Cloudflare. Go back to your
Worker's Settings > Variables and Secrets, check the value (or set a new one), and
re-enter it in the app.

**The test plate fails with anything mentioning "Add a Workers AI binding" or similar.**
Go back to step 1.4 — the binding named `AI` is either missing or misspelled.

**The test plate just spins for a very long time and then fails.** This usually means
Cloudflare's free image models are temporarily busy. Wait a minute and try again.

**Nothing happens when you click "Open a PDF novel."** Make sure the file you're
choosing actually ends in `.pdf`. If it's an image-only scan of a book with no real text
behind it, the app will tell you it found no readable text — that PDF would need to be
run through an OCR tool first, which is outside what this app does.

**The app window opens but looks broken or blank.** Quit the app, go back to Terminal,
and run `npm run dev` again — read whatever red text appears; it usually names the exact
problem. Feel free to paste that text back for help figuring it out.

---

## A note on privacy

Your PDF and your place in the book never leave your computer. To decide what to draw,
short passages of the text (a few thousand words at a time) are sent to whichever
drawing service you've connected — with the free setup above, that's your own private
Cloudflare account, not a public one. Your studio password is stored only in the app on
your own device.

Only open books you have the right to use this way.

---

## For anyone technical who picks this up later

- `src/` — the whole app: plain HTML, CSS and JavaScript, no build step. pdf.js and the
  fonts are bundled locally, so it works offline apart from the actual drawing requests.
- `src-tauri/` — the native shell (Rust, via Tauri 2). It only opens the window and lends
  the page a native HTTP client as a fallback for services that refuse browser-style
  (CORS) requests.
- `worker/` — the free studio: a Cloudflare Worker that plans scenes and draws plates on
  Workers AI.
- `npm run build` produces the installers (`.dmg` / `.app` on a Mac, `.msi` / `.exe` on
  Windows) in `src-tauri/target/release/bundle/`. A Mac build has to be made on a Mac and
  a Windows build on Windows; `.github/workflows/build.yml` builds both via GitHub
  Actions if you only have one machine.
- Android: see Tauri's Android prerequisites, then `npm run android:init` once, followed
  by `npm run android:dev` or `npm run android:apk`.
- The studio dialog also supports Pollinations (free, no setup, a shared community
  service), and Gemini or OpenAI (paid, your own key, sharper plates) — the code for
  those is in `src/app.js` under `Providers`.
- Not verified in the environment this was built in: compiling the Tauri shell itself,
  and running on WebView2, WKWebView, or Android WebView, since no Rust toolchain or
  physical devices were available there. The front end was tested end to end in headless
  Chromium instead. If Mac page layout looks off, check `placePlates` and `measureCols`
  in `src/app.js` first — pagination uses CSS multi-column, and WKWebView is the
  strictest engine about it.
