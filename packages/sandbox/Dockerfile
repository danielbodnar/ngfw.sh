FROM docker.io/cloudflare/sandbox:0.7.1

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    curl \
    fd-find \
    fzf \
    git \
    jq \
    lua5.1 \
    luarocks \
    ncurses-term \
    neovim \
    openssh-client \
    pkg-config \
    python3 \
    python3-pip \
    ripgrep \
    shellcheck \
    tmux \
    tree \
    unzip \
    wget \
    zsh \
    && rm -rf /var/lib/apt/lists/*

# Install zellij
RUN ARCH=$(uname -m) && \
    curl -fsSL "https://github.com/zellij-org/zellij/releases/latest/download/zellij-${ARCH}-unknown-linux-musl.tar.gz" \
    | tar -xz -C /usr/local/bin && \
    chmod +x /usr/local/bin/zellij

# Install ghostty terminfo so the PTY renders correctly when connecting
# from a Ghostty terminal or when TERM=xterm-ghostty is set
COPY ghostty.terminfo /tmp/ghostty.terminfo
RUN tic -x /tmp/ghostty.terminfo && rm -f /tmp/ghostty.terminfo

# Install Rust toolchain (needed for this repo)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    --default-toolchain stable \
    --profile minimal \
    --component rust-src,rust-analyzer && \
    . "$HOME/.cargo/env" && \
    rustup target add wasm32-unknown-unknown && \
    rustup target add aarch64-unknown-linux-gnu

# Install Bun (this repo's package manager)
RUN curl -fsSL https://bun.sh/install | bash

# Make cargo and bun available in PATH
ENV PATH="/root/.cargo/bin:/root/.bun/bin:${PATH}"

# Install global Node.js tooling used by this project
RUN npm install -g wrangler cross-env

# Zellij default layout for development
RUN mkdir -p /root/.config/zellij/layouts && \
    cat > /root/.config/zellij/layouts/dev.kdl << 'KDL'
layout {
    default_tab_template {
        pane size=1 borderless=true {
            plugin location="compact-bar"
        }
        children
    }
    tab name="editor" focus=true {
        pane command="nvim" {
            args "."
        }
    }
    tab name="terminal" {
        pane split_direction="vertical" {
            pane size="60%"
            pane size="40%" split_direction="horizontal" {
                pane
                pane
            }
        }
    }
    tab name="services" {
        pane split_direction="horizontal" {
            pane name="schema-api" size="50%"
            pane name="portal" size="50%"
        }
    }
}
KDL

# Zellij configuration
RUN cat > /root/.config/zellij/config.kdl << 'KDL'
theme "catppuccin-mocha"
default_layout "dev"
pane_frames false
default_shell "zsh"
scrollback_editor "/usr/bin/nvim"
KDL

# Neovim base configuration (kickstart-style minimal config)
RUN mkdir -p /root/.config/nvim && \
    cat > /root/.config/nvim/init.lua << 'LUA'
-- ngfw.sh sandbox neovim configuration
vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- Core options
vim.opt.number = true
vim.opt.relativenumber = true
vim.opt.mouse = "a"
vim.opt.showmode = false
vim.opt.clipboard = "unnamedplus"
vim.opt.breakindent = true
vim.opt.undofile = true
vim.opt.ignorecase = true
vim.opt.smartcase = true
vim.opt.signcolumn = "yes"
vim.opt.updatetime = 250
vim.opt.timeoutlen = 300
vim.opt.splitright = true
vim.opt.splitbelow = true
vim.opt.list = true
vim.opt.listchars = { tab = "» ", trail = "·", nbsp = "␣" }
vim.opt.inccommand = "split"
vim.opt.cursorline = true
vim.opt.scrolloff = 10
vim.opt.tabstop = 4
vim.opt.shiftwidth = 4

-- Bootstrap lazy.nvim
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git", "clone", "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  { "catppuccin/nvim", name = "catppuccin", priority = 1000, config = function()
    vim.cmd.colorscheme("catppuccin-mocha")
  end },
  { "nvim-treesitter/nvim-treesitter", build = ":TSUpdate", config = function()
    require("nvim-treesitter.configs").setup({
      ensure_installed = { "lua", "typescript", "tsx", "javascript", "rust", "toml", "json", "yaml", "html", "css", "bash", "markdown", "vue", "astro" },
      highlight = { enable = true },
      indent = { enable = true },
    })
  end },
  { "neovim/nvim-lspconfig", dependencies = { "williamboman/mason.nvim", "williamboman/mason-lspconfig.nvim" }, config = function()
    require("mason").setup()
    require("mason-lspconfig").setup({
      ensure_installed = { "ts_ls", "rust_analyzer", "lua_ls", "astro" },
    })
    local lspconfig = require("lspconfig")
    local on_attach = function(_, bufnr)
      local map = function(keys, func, desc)
        vim.keymap.set("n", keys, func, { buffer = bufnr, desc = desc })
      end
      map("gd", vim.lsp.buf.definition, "Go to definition")
      map("gr", vim.lsp.buf.references, "Go to references")
      map("K", vim.lsp.buf.hover, "Hover")
      map("<leader>rn", vim.lsp.buf.rename, "Rename")
      map("<leader>ca", vim.lsp.buf.code_action, "Code action")
    end
    for _, server in ipairs({ "ts_ls", "rust_analyzer", "lua_ls", "astro" }) do
      lspconfig[server].setup({ on_attach = on_attach })
    end
  end },
  { "hrsh7th/nvim-cmp", dependencies = { "hrsh7th/cmp-nvim-lsp", "hrsh7th/cmp-buffer", "hrsh7th/cmp-path", "L3MON4D3/LuaSnip", "saadparwaiz1/cmp_luasnip" }, config = function()
    local cmp = require("cmp")
    local luasnip = require("luasnip")
    cmp.setup({
      snippet = { expand = function(args) luasnip.lsp_expand(args.body) end },
      mapping = cmp.mapping.preset.insert({
        ["<C-n>"] = cmp.mapping.select_next_item(),
        ["<C-p>"] = cmp.mapping.select_prev_item(),
        ["<C-d>"] = cmp.mapping.scroll_docs(-4),
        ["<C-f>"] = cmp.mapping.scroll_docs(4),
        ["<CR>"] = cmp.mapping.confirm({ select = true }),
        ["<C-Space>"] = cmp.mapping.complete(),
      }),
      sources = { { name = "nvim_lsp" }, { name = "luasnip" }, { name = "buffer" }, { name = "path" } },
    })
  end },
  { "nvim-telescope/telescope.nvim", branch = "0.1.x", dependencies = { "nvim-lua/plenary.nvim" }, config = function()
    local builtin = require("telescope.builtin")
    vim.keymap.set("n", "<leader>ff", builtin.find_files, { desc = "Find files" })
    vim.keymap.set("n", "<leader>fg", builtin.live_grep, { desc = "Live grep" })
    vim.keymap.set("n", "<leader>fb", builtin.buffers, { desc = "Buffers" })
  end },
  { "lewis6991/gitsigns.nvim", config = true },
  { "nvim-lualine/lualine.nvim", config = function()
    require("lualine").setup({ options = { theme = "catppuccin" } })
  end },
  { "windwp/nvim-autopairs", event = "InsertEnter", config = true },
  { "numToStr/Comment.nvim", config = true },
}, { ui = { border = "rounded" } })
LUA

# Shell configuration
RUN cat > /root/.zshrc << 'ZSHRC'
export TERM=xterm-256color
export EDITOR=nvim
export VISUAL=nvim
export PATH="/root/.cargo/bin:/root/.bun/bin:/root/.local/bin:$PATH"

# Aliases
alias vim="nvim"
alias vi="nvim"
alias ll="ls -alh --color=auto"
alias la="ls -A --color=auto"
alias gs="git status"
alias gd="git diff"
alias gl="git log --oneline -20"
alias dev="zellij --layout dev"
alias zj="zellij"

# fd-find is installed as fdfind on Debian/Ubuntu
alias fd="fdfind"

# Prompt
PROMPT='%F{blue}%~%f %F{green}❯%f '

# If running inside a sandbox PTY and zellij is not already active, start it
if [ -z "$ZELLIJ" ] && [ -n "$SANDBOX_PTY" ]; then
  exec zellij --layout dev attach --create ngfw
fi
ZSHRC

WORKDIR /workspace

ENTRYPOINT ["/sandbox"]
CMD ["zsh"]
