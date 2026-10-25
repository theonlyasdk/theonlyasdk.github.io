---
title: "SSH into Termux over USB"
date: 2025-05-24
categories: ["Android"]
tags: ["termux", "ssh", "os-development", "android", "arch-linux", "experimental"]
description: "Connect to a Termux shell over USB using ADB port forwarding and SSH, with secure host-key verification and cleanup."
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
```
Port 8022
ListenAddress 127.0.0.1
PubkeyAuthentication yes
PasswordAuthentication yes
PermitEmptyPasswords no
KbdInteractiveAuthentication no
```
> `ListenAddress 127.0.0.1` binds SSH to localhost so it is only reachable through the USB/ADB-forwarded port, never directly over Wi-Fi. `PubkeyAuthentication yes` keeps public-key login available, while `PermitEmptyPasswords no` disables empty-password authentication.
> Or if you have the [`sshd_config.patch`](https://raw.githubusercontent.com/theonlyasdk/blog-bits/refs/heads/main/blog-bits/ssh-into-termux-over-usb/sshd_config.patch) file, you can patch it with `patch $PREFIX/etc/ssh/sshd_config < sshd_config.patch`
- After saving the file, we need to set the user password. To do this, run `passwd` and set a password. If you already have a password set up, skip this step.
- Finally, run `sshd`

## Client setup
- Connect your phone to your Linux machine through a USB cable.
- Make sure you have enabled USB debugging in your phone.
- Run `adb devices` to make sure it is connected and is being detected properly.
- Run `adb forward tcp:8022 tcp:8022` to forward the ssh port from your phone to your Linux system
- Finally, run `ssh localhost -p 8022` to ssh into your system.
- If it asks for a password, enter the password you previously created in the Termux setup step.

## Verifying SSH host-key fingerprints
When you connect for the first time, SSH prints the server's host-key fingerprint and asks you to confirm it. Verify that fingerprint against the one Termux is actually serving before accepting it:

- On the phone (in Termux), print the fingerprint of the host key:
```
ssh-keygen -lf $PREFIX/etc/ssh/ssh_host_ed25519_key.pub
```
- On the Linux client, compare it with the fingerprint shown by `ssh localhost -p 8022`. Only accept the connection if both fingerprints match.
- If you prefer, you can also fetch the key non-interactively with `ssh-keyscan -p 8022 localhost` and inspect the printed key before connecting.

## Removing a stale known_hosts entry
- If you're getting errors related to man-in-the-middle attacks, do not delete the whole `~/.ssh/known_hosts` file. Remove only the entry for this forwarded endpoint:
```
ssh-keygen -R "[localhost]:8022"
```
- If you connected via `127.0.0.1`, remove that entry instead:
```
ssh-keygen -R "[127.0.0.1]:8022"
```
This preserves every other trusted host key.

## Cleanup
When you're done, stop SSH and remove the ADB port forward so nothing keeps listening:

- On the phone, stop the SSH daemon:
```
killall sshd
```
- On the Linux client, remove the forwarded port:
```
adb forward --remove tcp:8022
```
- To remove every forward at once you can also run:
```
adb forward --remove-all
```

## Security
For the sake of simplicity, I'm not using any certificate based login here. But as we're connecting over a local network between our phone and the Linux system, the password-based authentication should be fine. But again, I'm not guaranteeing it to be very secure. Prefer public-key authentication when possible, and never allow empty passwords.