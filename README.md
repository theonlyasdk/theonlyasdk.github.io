# theonlyasdk.github.io
[![Deploy Jekyll site to Pages](https://github.com/theonlyasdk/theonlyasdk.github.io/actions/workflows/jekyll.yml/badge.svg)](https://github.com/theonlyasdk/theonlyasdk.github.io/actions/workflows/jekyll.yml)

This repository contains source code for [theonlyasdk.github.io](theonlyasdk.github.io). The site is based on [Chirpy theme for Jekyll](https://github.com/cotes2020/jekyll-theme-chirpy)

## Running
- If you're on Fedora, install the prerequisites with
```bash
sudo dnf install ruby ruby-devel openssl-devel redhat-rpm-config gcc-c++ @development-tools
```

- And if you're on Ubuntu, run the following command:
```bash
sudo apt update && sudo apt install -y ruby ruby-dev libssl-dev build-essential autoconf automake libtool pkg-config make g++ dpkg-dev rpm-dev
```

For other systems, refer to <https://jekyllrb.com/docs/installation/>
- Run `bundle` to install necessary packages
- Run `bundle exec jekyll s` to serve the page

