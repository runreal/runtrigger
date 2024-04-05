#!/bin/sh
set -e

if [ "$(whoami)" != "perforce" ]; then
	echo "This script must be run by the 'perforce' user."
	exit 1
fi

if ! command -v p4 >/dev/null; then
	echo "Perforce p4 cli is not installed. Please install it and try again."
	exit 1
fi

if ! p4 -s info >/dev/null 2>&1; then
	echo "No Perforce connection detected. Check your Perforce configuration before installing runtrigger."
	exit 1
fi

if ! command -v git >/dev/null; then
	echo "git is not installed. Please install it and try again."
	exit 1
fi

if ! command -v curl >/dev/null; then
	echo "curl is not installed. Please install it and try again."
	exit 1
fi

source $HOME/.bashrc
if ! command -v deno >/dev/null; then
	echo "Installing Deno..."
	curl -fsSL https://deno.land/install.sh | sh

	echo "Configuring Deno..."
	echo "export DENO_INSTALL=\"$HOME/.deno\"" >> $HOME/.bashrc
	echo "export PATH=\"\$DENO_INSTALL/bin:\$PATH\"" >> $HOME/.bashrc

	source $HOME/.bashrc
	deno --version
fi

echo "Installing runtrigger from source..."
mkdir -p $HOME/runtrigger
cd $HOME/runtrigger
git clone https://github.com/runreal/runtrigger .
deno install --global --name runtrigger --force -A src/index.ts
runtrigger --version

echo "Installation complete."
echo "Run source $HOME/.bashrc to make the runtrigger command available in your shell."
echo "Run runtrigger --help to see the available commands."