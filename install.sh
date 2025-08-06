#!/bin/bash
#
# The Definitive Setup Script for a Modern GNOME / Zsh Environment
# Installs and configures a complete Layan-themed setup.
#######################################################################################

set -e # Exit immediately if a command exits with a non-zero status.

# --- CONFIGURATION ---
dir=~/dotfiles
files=".zshrc .gitconfig" # Add .p10k.zsh here if you use it

# Set the terminal theme to "Layan" to match the desktop theme.
gogh_theme_name="Layan"

# --- SCRIPT ---

## 1. INSTALL PACKAGES
echo "📦 Installing packages..."
sudo apt-get update -y
sudo apt-get install -y gnome-terminal zsh git wget curl git-lfs psmisc

## 2. INSTALL OH MY ZSH
echo "셸 Installing Oh My Zsh..."
if [ ! -d "$HOME/.oh-my-zsh" ]; then
    sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

## 3. INSTALL A NERD FONT (for shell prompt icons)
echo "🔤 Installing FiraCode Nerd Font..."
FONT_DIR="$HOME/.local/share/fonts"
if [ ! -d "$FONT_DIR/FiraCode" ]; then
    mkdir -p "$FONT_DIR/FiraCode"
    temp_dir=$(mktemp -d)
    (cd "$temp_dir" && wget -qO FiraCode.zip https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/FiraCode.zip && unzip -q FiraCode.zip -d "$FONT_DIR/FiraCode" && fc-cache -f -v)
    rm -rf "$temp_dir"
fi

## 4. INSTALL & APPLY LAYAN DESKTOP THEME
echo "🎨 Installing and applying Layan GTK theme..."
LAYAN_DIR="$HOME/Layan-gtk-theme"
if [ ! -d "$LAYAN_DIR" ]; then
    git clone https://github.com/vinceliuice/Layan-gtk-theme.git "$LAYAN_DIR"
    "$LAYAN_DIR/install.sh"
fi
gsettings set org.gnome.desktop.interface gtk-theme 'Layan-Dark'
gsettings set org.gnome.desktop.interface icon-theme 'Yaru-dark' # As identified earlier

## 5. CONFIGURE GNOME TERMINAL WITH MATCHING THEME
echo "🎨 Applying '$gogh_theme_name' theme to GNOME Terminal..."
# This command downloads and runs the Gogh script to install the Layan theme.
bash -c  "$(wget -qO- https://git.io/vQgMr)" -- "$gogh_theme_name"

## 6. SYMLINK DOTFILES
echo "🔗 Linking dotfiles..."
olddir=~/dotfiles_old; mkdir -p "$olddir"
for file in $files; do
    if [ -e "$HOME/$file" ] && [ ! -L "$HOME/$file" ]; then mv "$HOME/$file" "$olddir/"; fi
    rm -f "$HOME/$file"; ln -s "$dir/$file" "$HOME/$file"
done

## 7. SET ZSH AS DEFAULT SHELL
if [[ "$SHELL" != */zsh ]]; then echo "Changing default shell to Zsh..."; chsh -s "$(which zsh)"; fi

echo ""
echo "✅🚀 You are all set!"
echo "❗ REMINDER: You must manually set the new font and profile in Terminal Preferences:"
echo "   1. Open Terminal > Preferences"
echo "   2. Select the new '$gogh_theme_name' profile and set it as default."
echo "   3. Under 'Custom font', select 'FiraCode Nerd Font Regular'."
