#!/usr/bin/env bash
#
# Setup script for a modern GNOME / Ghostty / Zsh terminal environment.
# Installs and configures the normal terminal stack used on this machine:
# Ghostty, Zsh + Oh My Zsh, Starship, FiraCode Nerd Font, and modern CLI tools.
################################################################################

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
local_bin="$HOME/.local/bin"
backup_root="$HOME/dotfiles_old"
backup_dir="$backup_root/$(date +%Y%m%d-%H%M%S)"
zsh_custom="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}"

export PATH="$local_bin:$HOME/.fzf/bin:$PATH"

install_optional_apt_package() {
    local package="$1"
    if apt-cache show "$package" >/dev/null 2>&1; then
        sudo apt-get install -y "$package"
    else
        echo "↪ Optional package '$package' is not available from configured apt sources; skipping."
    fi
}

clone_plugin_if_missing() {
    local name="$1"
    local url="$2"
    local target="$zsh_custom/plugins/$name"

    if [ -d "$target/.git" ]; then
        return
    fi

    if [ -e "$target" ]; then
        echo "↪ $target exists but is not a git checkout; skipping plugin install."
        return
    fi

    git clone --depth 1 "$url" "$target"
}

link_file() {
    local relative_path="$1"
    local source_path="$repo_dir/$relative_path"
    local target_path="$HOME/$relative_path"

    if [ ! -e "$source_path" ]; then
        echo "↪ Missing $source_path; skipping."
        return
    fi

    mkdir -p "$(dirname "$target_path")"

    if [ -e "$target_path" ] || [ -L "$target_path" ]; then
        if [ "$(readlink -f "$target_path" 2>/dev/null || true)" = "$(readlink -f "$source_path")" ]; then
            return
        fi

        mkdir -p "$backup_dir/$(dirname "$relative_path")"
        mv "$target_path" "$backup_dir/$relative_path"
    fi

    ln -s "$source_path" "$target_path"
}

# ── Base packages ──────────────────────────────────────────────────────────
echo "📦 Installing base packages..."
sudo apt-get update -y
sudo apt-get install -y \
    zsh \
    git \
    wget \
    curl \
    git-lfs \
    psmisc \
    unzip \
    fontconfig

# Ubuntu 24.04 has these in universe on many installs. Keep them optional so a
# minimal apt source setup does not break the whole bootstrap.
echo "📦 Installing optional terminal tools from apt when available..."
install_optional_apt_package eza
install_optional_apt_package bat
install_optional_apt_package fastfetch
install_optional_apt_package ghostty

# Ubuntu's bat package may expose `batcat`; the shell config expects `bat`.
mkdir -p "$local_bin"
if ! command -v bat >/dev/null 2>&1 && command -v batcat >/dev/null 2>&1; then
    ln -sf "$(command -v batcat)" "$local_bin/bat"
fi

# ── Oh My Zsh + plugins ────────────────────────────────────────────────────
echo "🐚 Installing Oh My Zsh..."
if [ ! -d "$HOME/.oh-my-zsh" ]; then
    RUNZSH=no CHSH=no KEEP_ZSHRC=yes \
        sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

mkdir -p "$zsh_custom/plugins"
echo "🔌 Installing Oh My Zsh plugins..."
clone_plugin_if_missing zsh-autosuggestions https://github.com/zsh-users/zsh-autosuggestions.git
clone_plugin_if_missing zsh-syntax-highlighting https://github.com/zsh-users/zsh-syntax-highlighting.git
clone_plugin_if_missing zsh-lazyload https://github.com/qoomon/zsh-lazyload.git

# ── fzf ────────────────────────────────────────────────────────────────────
echo "🔎 Installing fzf..."
if [ -d "$HOME/.fzf/.git" ]; then
    :
elif [ -e "$HOME/.fzf" ]; then
    echo "↪ $HOME/.fzf exists but is not a git checkout; skipping fzf install."
else
    git clone --depth 1 https://github.com/junegunn/fzf.git "$HOME/.fzf"
    "$HOME/.fzf/install" --key-bindings --completion --no-update-rc
fi

# ── Prompt/navigation tools ────────────────────────────────────────────────
echo "🚀 Installing Starship..."
if ! command -v starship >/dev/null 2>&1; then
    curl -sS https://starship.rs/install.sh | sh -s -- -y -b "$local_bin"
fi

echo "📁 Installing zoxide..."
if ! command -v zoxide >/dev/null 2>&1; then
    curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
fi

# ── Font ───────────────────────────────────────────────────────────────────
echo "🔤 Installing FiraCode Nerd Font..."
font_dir="$HOME/.local/share/fonts/FiraCode"
if [ ! -d "$font_dir" ]; then
    mkdir -p "$font_dir"
    temp_dir="$(mktemp -d)"
    (
        cd "$temp_dir"
        wget -qO FiraCode.zip https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/FiraCode.zip
        unzip -q FiraCode.zip -d "$font_dir"
    )
    rm -rf "$temp_dir"
    fc-cache -f
fi

# ── Desktop theme ──────────────────────────────────────────────────────────
echo "🎨 Installing and applying Layan GTK theme..."
layan_dir="$HOME/Layan-gtk-theme"
if [ ! -d "$layan_dir" ]; then
    git clone https://github.com/vinceliuice/Layan-gtk-theme.git "$layan_dir"
    "$layan_dir/install.sh"
fi

if command -v gsettings >/dev/null 2>&1; then
    gsettings set org.gnome.desktop.interface gtk-theme 'Layan-Dark'
    gsettings set org.gnome.desktop.interface icon-theme 'Yaru-dark'
fi

# ── Dotfiles ───────────────────────────────────────────────────────────────
echo "🔗 Linking dotfiles..."
link_file .zshrc
link_file .gitconfig
link_file .config/starship.toml
link_file .config/ghostty/config

# ── Default shell ──────────────────────────────────────────────────────────
if [[ "$SHELL" != */zsh ]]; then
    echo "Changing default shell to Zsh..."
    chsh -s "$(command -v zsh)"
fi

if ! command -v ghostty >/dev/null 2>&1; then
    echo ""
    echo "⚠️  Ghostty is not installed. Install it manually, then this repo's"
    echo "   ~/.config/ghostty/config symlink will be used automatically."
fi

echo ""
echo "✅🚀 Setup complete. Open a new Ghostty/Zsh session to use the linked config."
