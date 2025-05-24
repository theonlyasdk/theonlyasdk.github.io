---
layout: post
title: "SSH into Termux over USB"
date: 2025-05-24 17:01:43
categories: ["SerenityOS", "Termux", "SSH", "OS Development"]
tags: ["serenityos", "termux", "ssh", "os-development", "android", "arch-linux", "experimental"]
---
In this tutorial, I'm going to provide a step-by-step tutorial on connecting to a Termux shell through SSH by a USB connection.

## Prerequisites
- An Android phone running Termux
- A Linux system
- OpenSSH, android-tools/adb installed in the Linux system

## Termux setup
- Install `openssh` in your Termux enviornment by running `pkg install openssh`
- Verify it works by running `sshd`. If it does not show any particular errors then it's working.
- Stop `sshd` with `killall sshd` so we can edit it's configuration file.
- In `$PREFIX/etc/ssh/sshd_config`, make sure you have the following keys set to their respective values.
```hosts
Port 8022
PubkeyAuthentication no
PasswordAuthentication yes
PermitEmptyPasswords yes
KbdInteractiveAuthentication no
```
> Or if you have the `sshd_config.patch` file (get it from [here](https://raw.githubusercontent.com/theonlyasdk/blog-bits/refs/heads/main/blog-bits/ssh-into-termux-over-usb/sshd_config.patch)) you can patch it with `patch $PREFIX/etc/ssh/sshd_config < sshd_config.patch`
- After saving the file, we need to set the user password. To do this, run `passwd` and set a password. If you already have a password set up, skip this step.
- Finally, run `sshd`

## Client setup
- Connect your phone to your Linux machine through a USB cable.
- Make sure you have enabled USB debugging in your phone.
- Run `adb devices` to make sure it is connected and is being detected properly.
- Run `adb forward tcp:8022 tcp:8022` to forward the ssh port from your phone to your Linux system
- Finally, run `ssh localhost -p 8022` to ssh into your system.
- If it asks for a password, enter the password you previously created in the Termux setup step.

## Troubleshooting
- If you're getting any errors related to man-in-the-middle attacks then you should edit or delete the file at `~/.ssh/known_hosts`

## Security
For the sake of simplicity, I'm not using any certificate based login here. But as we're connecting over a local network between our phone and the Linux system, it should be okay. But again, I'm not guaranteeing it to be very secure.