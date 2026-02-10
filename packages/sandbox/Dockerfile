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
RUN mkdir -p /tmp/ghostty-terminfo && \
    cat > /tmp/ghostty-terminfo/ghostty.terminfo << 'TERMINFO' && \
xterm-ghostty|ghostty terminal emulator, \
    am, bce, ccc, km, mc5i, mir, msgr, npc, xenl, \
    colors#256, cols#80, it#8, lines#24, pairs#32767, \
    acsc=``aaffggiijjkkllmmnnooppqqrrssttuuvvwwxxyyzz{{||}}~~, \
    bel=^G, blink=\E[5m, bold=\E[1m, cbt=\E[Z, \
    civis=\E[?25l, clear=\E[H\E[2J, cnorm=\E[?12l\E[?25h, \
    cr=\r, csr=\E[%i%p1%d;%p2%dr, cub=\E[%p1%dD, cub1=^H, \
    cud=\E[%p1%dB, cud1=\n, cuf=\E[%p1%dC, cuf1=\E[C, \
    cup=\E[%i%p1%d;%p2%dH, cuu=\E[%p1%dA, cuu1=\E[A, \
    cvvis=\E[?12;25h, dch=\E[%p1%dP, dch1=\E[P, \
    dim=\E[2m, dl=\E[%p1%dM, dl1=\E[M, ech=\E[%p1%dX, \
    ed=\E[J, el=\E[K, el1=\E[1K, flash=\E[?5h$<100/>\E[?5l, \
    home=\E[H, hpa=\E[%i%p1%dG, ht=^I, hts=\EH, \
    ich=\E[%p1%d@, il=\E[%p1%dL, il1=\E[L, ind=\n, \
    indn=\E[%p1%dS, \
    initc=\E]4;%p1%d;rgb\:%p2%{255}%*%{1000}%/%2.2X/%p3%{255}%*%{1000}%/%2.2X/%p4%{255}%*%{1000}%/%2.2X\E\\, \
    invis=\E[8m, is2=\E[!p\E[?3;4l\E[4l\E>, \
    kDC=\E[3;2~, kEND=\E[1;2F, kHOM=\E[1;2H, kIC=\E[2;2~, \
    kLFT=\E[1;2D, kNXT=\E[6;2~, kPRV=\E[5;2~, kRIT=\E[1;2C, \
    ka1=\E[1~, ka3=\E[5~, kb2=\E[E, kbs=^?, kc1=\E[4~, \
    kc3=\E[6~, kcbt=\E[Z, kcub1=\EOD, kcud1=\EOB, \
    kcuf1=\EOC, kcuu1=\EOA, kdch1=\E[3~, kend=\EOF, \
    kent=\EOM, kf1=\EOP, kf10=\E[21~, kf11=\E[23~, \
    kf12=\E[24~, kf13=\E[1;2P, kf14=\E[1;2Q, kf15=\E[1;2R, \
    kf16=\E[1;2S, kf17=\E[15;2~, kf18=\E[17;2~, \
    kf19=\E[18;2~, kf2=\EOQ, kf20=\E[19;2~, kf21=\E[20;2~, \
    kf22=\E[21;2~, kf23=\E[23;2~, kf24=\E[24;2~, \
    kf25=\E[1;5P, kf26=\E[1;5Q, kf27=\E[1;5R, \
    kf28=\E[1;5S, kf29=\E[15;5~, kf3=\EOR, kf30=\E[17;5~, \
    kf31=\E[18;5~, kf32=\E[19;5~, kf33=\E[20;5~, \
    kf34=\E[21;5~, kf35=\E[23;5~, kf36=\E[24;5~, \
    kf37=\E[1;6P, kf38=\E[1;6Q, kf39=\E[1;6R, kf4=\EOS, \
    kf40=\E[1;6S, kf41=\E[15;6~, kf42=\E[17;6~, \
    kf43=\E[18;6~, kf44=\E[19;6~, kf45=\E[20;6~, \
    kf46=\E[21;6~, kf47=\E[23;6~, kf48=\E[24;6~, kf5=\E[15~, \
    kf6=\E[17~, kf7=\E[18~, kf8=\E[19~, kf9=\E[20~, \
    khome=\EOH, kich1=\E[2~, kmous=\E[<, knp=\E[6~, \
    kpp=\E[5~, mc0=\E[i, mc4=\E[4i, mc5=\E[5i, \
    meml=\El, memu=\Em, mgc=\E[?69l, \
    op=\E[39;49m, rc=\E8, rep=%p1%c\E[%p2%{1}%-%db, \
    rev=\E[7m, ri=\EM, rin=\E[%p1%dT, ritm=\E[23m, \
    rmacs=\E(B, rmam=\E[?7l, rmcup=\E[?1049l\E[23;0;0t, \
    rmir=\E[4l, rmkx=\E[?1l\E>, rmso=\E[27m, rmul=\E[24m, \
    rs1=\Ec\E]104\007, rs2=\E[!p\E[?3;4l\E[4l\E>, sc=\E7, \
    setab=\E[%?%p1%{8}%<%t4%p1%d%e%p1%{16}%<%t10%p1%{8}%-%d%e48;5;%p1%d%;m, \
    setaf=\E[%?%p1%{8}%<%t3%p1%d%e%p1%{16}%<%t9%p1%{8}%-%d%e38;5;%p1%d%;m, \
    sgr=%?%p9%t\E(0%e\E(B%;\E[0%?%p6%t;1%;%?%p5%t;2%;%?%p2%t;4%;%?%p1%p3%|%t;7%;%?%p4%t;5%;%?%p7%t;8%;m, \
    sgr0=\E(B\E[m, sitm=\E[3m, smacs=\E(0, smam=\E[?7h, \
    smcup=\E[?1049h\E[22;0;0t, smir=\E[4h, smkx=\E[?1h\E=, \
    smso=\E[7m, smul=\E[4m, smxx=\E[9m, \
    tbc=\E[3g, u6=\E[%i%d;%dR, u7=\E[6n, u8=\E[?%[;0123456789]c, \
    u9=\E[c, vpa=\E[%i%p1%dd,
TERMINFO
    tic -x /tmp/ghostty-terminfo/ghostty.terminfo && \
    rm -rf /tmp/ghostty-terminfo

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
