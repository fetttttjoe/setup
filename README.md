# setup

Personal Ubuntu/GNOME terminal setup.

This repo tracks the normal terminal environment used on this machine:

- Ghostty with FiraCode Nerd Font, Catppuccin Mocha, high scrollback, splits/tabs, and copy-on-select
- Zsh + Oh My Zsh
- Starship prompt with a readable two-line Catppuccin-aligned layout
- Modern CLI helpers when available: `eza`, `bat`, `zoxide`, `fzf`, `fastfetch`
- Layan-Dark GTK desktop theme

## Install

```bash
git clone git@github.com:fetttttjoe/setup.git ~/setup
cd ~/setup
./install.sh
```

The installer links:

- `~/.zshrc`
- `~/.gitconfig`
- `~/.config/starship.toml`
- `~/.config/ghostty/config`

Existing files are moved into `~/dotfiles_old/<timestamp>/` before linking.

## Notes

Ghostty is linked/configured by this repo, but the package may not be available from the default Ubuntu apt sources. If the installer reports that Ghostty was skipped, install Ghostty manually and then open a new terminal window.
