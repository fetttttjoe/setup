# If you come from bash you might have to change your $PATH.
export PATH="$HOME/bin:$HOME/.local/bin:/usr/local/bin:$PATH"

# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Path to your fzf installation.
export FZF_BASE="$HOME/.fzf"

# Theme — left empty because Starship is the prompt now (initialised below).
# Set this back to a name (e.g. "robbyrussell") to fall back to oh-my-zsh themes.
ZSH_THEME=""

# Shell behavior
ENABLE_CORRECTION="true"
COMPLETION_WAITING_DOTS="true"

# Plugins
plugins=(
  git
  fzf
  z
  zsh-autosuggestions
  zsh-syntax-highlighting
  zsh-lazyload
)

source "$ZSH/oh-my-zsh.sh"

# ---------------------------------------------------------------------------
# User & tool configuration
# ---------------------------------------------------------------------------

# fzf
[ -f "$HOME/.fzf.zsh" ] && source "$HOME/.fzf.zsh"

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"

# Bun
export BUN_INSTALL="$HOME/.bun"
[[ ":$PATH:" != *":$BUN_INSTALL/bin:"* ]] && export PATH="$BUN_INSTALL/bin:$PATH"
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

# Console Ninja
[[ ":$PATH:" != *":$HOME/.console-ninja/.bin:"* ]] && export PATH="$HOME/.console-ninja/.bin:$PATH"

# Angular CLI completion
if command -v ng >/dev/null 2>&1; then
  source <(ng completion script)
fi

# Android / Capacitor
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
[[ -d "$ANDROID_SDK_ROOT/emulator" ]] && export PATH="$PATH:$ANDROID_SDK_ROOT/emulator"
[[ -d "$ANDROID_SDK_ROOT/platform-tools" ]] && export PATH="$PATH:$ANDROID_SDK_ROOT/platform-tools"
[[ -d "$ANDROID_SDK_ROOT/tools" ]] && export PATH="$PATH:$ANDROID_SDK_ROOT/tools"
[[ -d "$ANDROID_SDK_ROOT/tools/bin" ]] && export PATH="$PATH:$ANDROID_SDK_ROOT/tools/bin"

# pyenv
export PYENV_ROOT="$HOME/.pyenv"
[[ -d "$PYENV_ROOT/bin" ]] && export PATH="$PYENV_ROOT/bin:$PATH"
if command -v pyenv >/dev/null 2>&1; then
  eval "$(pyenv init - zsh)"
fi

# ---------------------------------------------------------------------------
# Modern terminal toolbox — icons, prompts, smarter defaults.
# All binaries live in ~/.local/bin (already on PATH at the top of this file).
# ---------------------------------------------------------------------------

# Starship prompt — config: ~/.config/starship.toml
if command -v starship >/dev/null 2>&1; then
  eval "$(starship init zsh)"
fi

# zoxide — smarter `cd`. `z foo` jumps to the most-frecent dir matching foo,
# `zi foo` opens an fzf picker. Replaces `cd` for everyday use.
if command -v zoxide >/dev/null 2>&1; then
  eval "$(zoxide init zsh --cmd cd)"
fi

# eza — modern `ls` with icons + git status.
if command -v eza >/dev/null 2>&1; then
  alias ls='eza --icons --group-directories-first'
  alias ll='eza --icons --group-directories-first -lh --git'
  alias la='eza --icons --group-directories-first -lha --git'
  alias lt='eza --icons --tree --level=2 --group-directories-first'
  alias lT='eza --icons --tree --level=4 --group-directories-first'
fi

# bat — `cat` with syntax highlighting + paging. Keep raw `cat` available
# as `\cat` if any script needs the literal binary.
if command -v bat >/dev/null 2>&1; then
  alias cat='bat --paging=never --style=plain'
  alias less='bat --paging=always'
  export BAT_THEME="Catppuccin-mocha"
  # Tell `man` to render through bat for colourised man pages.
  export MANPAGER="sh -c 'col -bx | bat -l man -p'"
  export MANROFFOPT="-c"
fi

# fastfetch — system info splash on new interactive shells.
# Comment the line below if it ever feels too much.
if command -v fastfetch >/dev/null 2>&1 && [[ $- == *i* ]] && [[ -z "$FASTFETCH_SHOWN" ]]; then
  export FASTFETCH_SHOWN=1
  fastfetch
fi
