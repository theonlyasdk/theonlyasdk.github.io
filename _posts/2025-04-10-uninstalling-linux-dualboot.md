---
layout: post
title: Uninstalling Linux in a dualboot system
date: 2025-04-10
categories: ["linux", "uninstall", "dualboot", "windows", "os"]
---

In this article I'm going to show you how to uninstall any Linux distribution from your Linux-Windows dualboot setup.

> Run all of these commands in an elevated command prompt or powershell.

# 1. Mounting the EFI partition
In this step, we're going to mount the EFI partition of your system. This is where the boot files for your operating system live. This is usually where GRUB gets installed to.

1. In an elevated cmd or powershell, run `diskpart`.

    You should see a prompt like `DISKPART>`
2. Here, run `list volume` to show all the volumes that are connected to your system.
3. Look for FAT32 volume around 100–300 MB in size. EFI partitions are usually this size.
4. Run `select volume <volume number>` to select the partition.
5. Run `assign letter=S` to assign a drive letter to the EFI partition. You should see a confirmation that the letter has been assigned. It is so we can access it from Explorer.
6. Exit `diskpart` with `exit`

# 2. Install WBM (Windows Boot Manager) into the EFI partition
When you're dualbooting, you usually use a boot manager like GRUB which shows a list of installed OSes at startup to allow you to boot into the OS of your choice.
When you remove Linux, there is not really a need for this boot manager anymore. So in this step we're going to replace it with the default Windows bootloader.

To do this, run the following command in an elevated cmd or powershell.
```sh
bcdboot C:\Windows /l en-us /s S: /f UEFI
```
This will install Windows boot manager into `S:`, i.e your EFI partition.

# 3. Remove Linux Partitions
Final step is to remove the partitions where you've installed Linux to. (You should already know where to find this)

> I wrote this article solely for my own reference, so I don't mention a lot of things. If you think anything should be added, please feel free to open a pull request :)