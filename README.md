# setup

Personal Ubuntu terminal setup.

This repo targets Ubuntu desktop installs. It installs Ghostty explicitly and degrades gracefully only for desktop extras such as GNOME theme settings.

It tracks the normal terminal environment used on this machine:

- Ghostty with FiraCode Nerd Font, TokyoNight, high scrollback, splits/tabs, and copy-on-select
- Zsh + Oh My Zsh
- Starship prompt with a readable two-line TokyoNight-aligned layout
- Modern CLI helpers: `eza`, `bat`, `zoxide`, `fzf`, and TokyoNight-aligned `fastfetch`
- Layan-Dark GTK desktop theme when GNOME settings are available
- [pi coding agent](https://github.com/badlogic/pi-mono) with plan-mode extension, skills, and custom theme

## Install

```bash
git clone git@github.com:fetttttjoe/setup.git ~/setup
cd ~/setup
./install.sh
```

The installer links:

- `~/.zshrc`
- `~/.config/starship.toml`
- `~/.config/ghostty/config`
- `~/.config/ghostty/themes/tokyonight`
- `~/.config/fastfetch/config.jsonc`
- `~/.pi/agent/` — extensions, skills, settings for pi coding agent

Existing files are moved into `~/dotfiles_old/<timestamp>/` before linking.

For Git, the installer is deliberately conservative:

- Existing `~/.gitconfig` files are preserved.
- If no `~/.gitconfig` exists, the repo links a generic config with safe defaults only.
- Personal Git identity, company remotes, access tokens, and other secrets are not tracked here.

## Pi coding agent

The installer sets up [pi](https://github.com/badlogic/pi-mono) via bun (`bun install -g`).
Pi config is symlinked from the repo into `~/.pi/agent/`.

Included extensions:
- **plan-mode** — plan/build mode toggle with interactive Q&A (`/plan`, `/build`, `Ctrl+Alt+P`)
- **claude-auth** — Claude OAuth authentication
- **stats-line** — per-turn token/throughput footer

The [pi-theme](https://github.com/fetttttjoe/pi-theme) is installed as a git package.
After install, authenticate with `pi` then `/login` or set `ANTHROPIC_API_KEY`.

## Notes

Ghostty is installed by the script. If the package is not available from Ubuntu's default apt sources, the script adds `ppa:mkasberg/ghostty-ubuntu` and installs it from there.

`fastfetch` is installed from Ubuntu apt when available. If apt does not provide it, the script downloads the latest `.deb` release from `fastfetch-cli/fastfetch` for `amd64` or `arm64`.

The prompt avoids hidden path substitutions and blank runtime symbols, so it should stay readable on any machine.
