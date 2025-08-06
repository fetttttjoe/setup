# If you come from bash you might have to change your $PATH.
# This is a common and recommended practice.
export PATH="$HOME/bin:$HOME/.local/bin:/usr/local/bin:$PATH"

# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Path to your fzf installation.
export FZF_BASE="$HOME/.fzf"

# Set the name of the Oh My Zsh theme to load.
# "robbyrussell" is the default. Find more at https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
ZSH_THEME="robbyrussell"

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# HYPHEN_INSENSITIVE="true"

# Uncomment to change the auto-update behavior.
# zstyle ':omz:update' mode disabled  # disable automatic updates
# zstyle ':omz:update' mode auto      # update automatically without asking
# zstyle ':omz:update' mode reminder  # just remind me to update when it's time

# Uncomment to change how often to auto-update (in days).
# zstyle ':omz:update' frequency 13

# Uncomment the following line to enable command auto-correction.
ENABLE_CORRECTION="true"

# Uncomment to display red dots whilst waiting for completion.
COMPLETION_WAITING_DOTS="true"

# Set history timestamp format.
# HIST_STAMPS="yyyy-mm-dd"

# Which plugins would you like to load?
# Note: Plugins like zsh-autosuggestions and zsh-syntax-highlighting need to be
# installed separately. They are not bundled with Oh My Zsh.
# e.g., git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
plugins=(
  git
  fzf
  z
  zsh-autosuggestions
  zsh-syntax-highlighting
  zsh-lazyload
)

source "$ZSH/oh-my-zsh.sh"

# --------------------------------------------------------------------------- #
# --                        USER & TOOL CONFIGURATION                        -- #
# --------------------------------------------------------------------------- #
# Place your personal configurations, aliases, and functions below this line.

# To customize aliases, create a file like ~/.zsh_aliases and source it here.
# if [ -f ~/.zsh_aliases ]; then
#    source ~/.zsh_aliases
# fi

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='nvim'
# fi

## -----------------
## fzf (Fuzzy Finder)
## -----------------
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

## -----------------
## nvm (Node Version Manager)
## -----------------
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" # This loads nvm bash_completion

## -----------------
## Bun
## -----------------
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
# Bun completions
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

## -----------------
## Console Ninja
## -----------------
export PATH="$HOME/.console-ninja/.bin:$PATH"

## -----------------
## Angular CLI
## -----------------
# Load Angular CLI autocompletion if the 'ng' command is available.
if command -v ng &> /dev/null; then
  source <(ng completion script)
fi

## -----------------
## Android & Capacitor
## -----------------
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_SDK_ROOT/emulator"
export PATH="$PATH:$ANDROID_SDK_ROOT/platform-tools"
export PATH="$PATH:$ANDROID_SDK_ROOT/tools"
export PATH="$PATH:$ANDROID_SDK_ROOT/tools/bin"

# You may need to set this to the location of your Android Studio installation.
# The path can vary depending on your OS and installation method (e.g., Snap, JetBrains Toolbox).
# Example for Linux (manual install):
# export CAPACITOR_ANDROID_STUDIO_PATH="$HOME/android-studio/bin/studio.sh"
# Example for macOS:
# export CAPACITOR_ANDROID_STUDIO_PATH="/Applications/Android Studio.app"

## -----------------
## Hardware Specific (Optional)
## -----------------
# This is for Intel VA-API drivers. Uncomment and set if needed for your hardware.
# export LIBVA_DRIVER_NAME=iHD