---
title: "Redmi 9 Custom ROMs Compilation (Dandelion / cattail)"
date: 2026-10-16 22:05:00 +0530
description: "A curated index of custom recoveries, kernels and ROMs for the Redmi 9 family — cattail, dandelion, angelica and friends on the garden platform — covering Android 11 through Android 16."
image:
  path: /assets/img/posts/redmi-9-custom-roms-cover.png
  alt: "Redmi 9 custom ROMs compilation"
categories: ["Android", "Xiaomi", "Custom ROM", "Tutorial"]
tags: ["redmi-9", "cattail", "dandelion", "blossom", "garden", "custom-rom", "android", "xiaomi", "erofs", "lineageos"]
---

> **WARNING:** Flashing a custom ROM is the point where a phone stops being recoverable by normal means. If you soft-brick it, Xiaomi will not help you. Back everything up, confirm your codename twice, and keep your stock firmware downloaded before you start. I'm not responsible for what happens to your device.
{: .prompt-danger }

The Redmi 9 family is unusually well supported for a budget phone, mostly because everything in it shares the same MediaTek `garden` platform. This is a running index of the custom recoveries, kernels and ROMs available for it, from Android 11 all the way up to Android 16.

> Sources: the [Dandelion Telegram channel](https://t.me/dandelion_info) for the ROM index below, and [ombob's guide](https://www.ombob.eu.org/2023/07/redmi-10a-9a-9c-poco-c3-64bit-android.html) for the unified ROM and flashing steps. Video walkthrough: [Redmi 9 Custom ROM (YouTube)](https://www.youtube.com/watch?v=8UC4hCPCKJE).
{: .prompt-info }

## 1. Know your device before anything else

Every Redmi 9 variant has a different **codename**, and the wrong firmware on the wrong codename is a brick. Check yours first — dial `*#*#6485#*#*`, or read **Settings > About phone**, or run `fastboot getvar product` in fastboot mode.

| Marketing name | Codename |
| --- | --- |
| Redmi 9 (India), Redmi 9 Active India | `cattail` |
| Redmi 9A, 9i, 9A Sport | `blossom` / `dandelion` |
| Redmi 10A | `dandelion_c3l2` |
| Redmi 9C (Global) | `angelica` |
| Redmi 9C NFC | `angelican` |
| POCO C3, POCO C31 | `angelicain` |

> Sources disagree slightly on which marketing name maps to which codename — several of these devices ship under different names in different markets. **Trust your own device's reported codename, not this table.** If you are unsure, ask before flashing.
{: .prompt-warning }

## 2. Before you flash anything

1. **Unlock the bootloader first.** No custom ROM will install without it. If you have not done it yet, follow my [Redmi 9 India (cattail) Bootloader Unlocking Guide](/posts/redmi-9-india-cattail-bootloader-unlocking-guide/) first.
2. **Back up your IMEI.** On MediaTek devices this lives in `nvram`, `nvdata` and `nvcfcg`. Wipe them without a backup and you lose cellular service, VoLTE and Wi-Fi calling — permanently, and with no user-accessible way to restore it.
3. **Download the stock firmware for your exact codename** (see Section 6) and keep it on your PC before you start.
4. Back up your photos and files. `fastboot -w` and the format-data step both wipe everything.
5. Charge the battery above 50%.

> **PS:** If you are coming from a stock MIUI 12.0.xx build on an Android 10 device, you must flash the Android 11 firmware update package first. The unified ROMs assume you are already on MIUI 12.5.xx.
{: .prompt-tip }

## 3. The unified `garden` ROM family

The reason so many ROMs exist for this phone is that Xiaomi built the entire Redmi 9 range on one platform. As [ombob puts it](https://www.ombob.eu.org/2023/07/redmi-10a-9a-9c-poco-c3-64bit-android.html):

> Blossom = Garden = Unified dandelion/angelica/angelicain/angelican/cattail

So a single 64-bit ROM build can cover `cattail`, `dandelion`, `angelica`, `angelicain` and `angelican`. That gives you official-style 64-bit apps on a phone that shipped with 32-bit-only software — the main reason people flash these in the first place.

- Unified 64-bit Android 13 guide: [ombob.eu.org](https://www.ombob.eu.org/2023/07/redmi-10a-9a-9c-poco-c3-64bit-android.html)
- Updated Android 15/16 guide: [ombob.eu.org](https://www.ombob.eu.org/2025/12/redmi-10a-9a-9c-poco-c3-android-16-15.html)
- Unified custom recovery (OrangeFox): [sfile.mobi](https://sfile.mobi/4qnPFXpCDex)

> Even with a unified ROM, **check that the download explicitly lists your codename.** "Works on Redmi 9" in a download listing means nothing on its own.
{: .prompt-warning }

## 4. ROM index

Everything below is posted to the [Dandelion channel](https://t.me/dandelion_info). Where a ROM has multiple builds, the numbers are the post IDs in order — later numbers are newer builds.


#### Custom Recoveries

- **TWRP (erofs)** [1](https://t.me/dandelion_info/785)
- **OrangeFox (erofs support)** [2](https://t.me/dandelion_info/788)

#### Custom Kernel

- **Sashimi Kernel** [1](https://t.me/dandelion_info/825)

#### Android 11

- **Project Kasumi Revived** [1](https://t.me/dandelion_info/872)
- **Project Kasumi reLive** [2](https://t.me/dandelion_info/875)

#### Android 13

- **LineageOS** [1](https://t.me/dandelion_info/736)

#### Android 14

- **yaoyoro project** [1](https://t.me/dandelion_info/815) [3](https://t.me/dandelion_info/837)
- **yaoyoro project (erofs)** [2](https://t.me/dandelion_info/828)

#### Android 15

- **Project Matrixx** [1](https://t.me/dandelion_info/678)
- **crDroid** [2](https://t.me/dandelion_info/681) [5](https://t.me/dandelion_info/693?single)
- **MikuUI** [3](https://t.me/dandelion_info/684)
- **AlphaDroid** [4](https://t.me/dandelion_info/687)

#### Android 16

- **Miku UI** [1](https://t.me/dandelion_info/672) [33](https://t.me/dandelion_info/800)
- **Project Infinity X** [2](https://t.me/dandelion_info/675) [4](https://t.me/dandelion_info/697) [11](https://t.me/dandelion_info/718) [17](https://t.me/dandelion_info/739) [35](https://t.me/dandelion_info/806) [40](https://t.me/dandelion_info/831?single) [41](https://t.me/dandelion_info/840) [45](https://t.me/dandelion_info/851) [47](https://t.me/dandelion_info/862?single)
- **CrDroid** [3](https://t.me/dandelion_info/690) [16](https://t.me/dandelion_info/733) [24](https://t.me/dandelion_info/766) [34](https://t.me/dandelion_info/803) [38](https://t.me/dandelion_info/818) [43](https://t.me/dandelion_info/846)
- **MistOS** [5](https://t.me/dandelion_info/700) [15](https://t.me/dandelion_info/730)
- **risingOS** [6](https://t.me/dandelion_info/703) [21](https://t.me/dandelion_info/755)
- **axionAOSP** [7](https://t.me/dandelion_info/706) [10](https://t.me/dandelion_info/715)
- **CherishOS (Official)** [8](https://t.me/dandelion_info/709)
- **CherishOS** [9](https://t.me/dandelion_info/712)
- **LunarisAOSP** [12](https://t.me/dandelion_info/721) [37](https://t.me/dandelion_info/812) [46](https://t.me/dandelion_info/859)
- **axionAOSP (Official)** [13](https://t.me/dandelion_info/724) [20](https://t.me/dandelion_info/752) [22](https://t.me/dandelion_info/758) [31](https://t.me/dandelion_info/794)
- **crDroid (Official)** [14](https://t.me/dandelion_info/727)
- **Afterlife OS (Official)** [18](https://t.me/dandelion_info/746)
- **LineageOS** [19](https://t.me/dandelion_info/749)
- **BlissRoms (erofs)** [23](https://t.me/dandelion_info/763)
- **Project Sakura** [25](https://t.me/dandelion_info/769)
- **crDroid (erofs)** [26](https://t.me/dandelion_info/772)
- **Lineage OS (erofs)** [27](https://t.me/dandelion_info/775)
- **AlphaDroid** [28](https://t.me/dandelion_info/778) [42](https://t.me/dandelion_info/843)
- **MistOS (official)** [29](https://t.me/dandelion_info/781?single) [39](https://t.me/dandelion_info/822?single)
- **Project Clover** [30](https://t.me/dandelion_info/791)
- **EvolutionX** [32](https://t.me/dandelion_info/797)
- **Voltage OS** [36](https://t.me/dandelion_info/809)
- **ProjectMatrixx** [44](https://t.me/dandelion_info/849)

#### GApps

- **NikGApps A16 arm64** [1](https://t.me/dandelion_info/760)

## 5. GApps

If you are flashing a **64-bit** build, you need **arm64** Google Apps. A 32-bit GApps package will either fail to install or leave you with broken Play Services.

- [NikGApps A16 arm64](https://t.me/dandelion_info/760) — the channel's recommendation for Android 16
- [microG](https://microg.org/) — a lighter, FOSS alternative if you'd rather not sideload Google's binaries

Always match the GApps package to your Android version and architecture.

## 6. Stock firmware per codename

Keep the correct one on your PC. These are **Firmware Update (Vendor R)** packages from the [gardenrealmec11c12c15](https://sourceforge.net/projects/gardenrealmec11c12c15/files/Firmware%20Update/Firmware%20Update%20Vendor%20R/) project.

| Device | Codename | Firmware |
| --- | --- | --- |
| Redmi 9 / 9 Active India | `cattail` | [fw_cattail MIUI 12.5.6.0](https://sourceforge.net/projects/gardenrealmec11c12c15/files/Firmware%20Update/Firmware%20Update%20Vendor%20R/fw_cattail_miui_CATTAILINGlobal_V12.5.6.0.RCTINXM_9ceac0fafe_11.0.zip/download) |
| Redmi 9A / 9i / 10A | `dandelion` | [fw_dandelion V12.5.9.0](https://sourceforge.net/projects/gardenrealmec11c12c15/files/Firmware%20Update/Firmware%20Update%20Vendor%20R/fw_dandelion_V12.5.9.0.RCDINXM.zip/download) |
| Redmi 9C | `angelica` | [fw_9C_angelica V12.5.4.0](https://sourceforge.net/projects/gardenrealmec11c12c15/files/Firmware%20Update/Firmware%20Update%20Vendor%20R/fw_9C_angelica_miui_ANGELICAGlobal_V12.5.4.0.RCRMIXM_e206a639c8_11.0.zip/download) |
| Redmi 9C NFC | `angelican` | [fw_angelican V12.5.3.0](https://sourceforge.net/projects/gardenrealmec11c12c15/files/Firmware%20Update/Firmware%20Update%20Vendor%20R/fw_angelican_miui_ANGELICANGlobal_V12.5.3.0.RCSMIXM_9477.zip/download) |
| POCO C3 / C31 | `angelicain` | [fw_angelicain V12.5.4.0](https://sourceforge.net/projects/gardenrealmec11c12c15/files/Firmware%20Update/Firmware%20Update%20Vendor%20R/fw_angelicain_V12.5.4.0.RCRINRF_new.zip/download) |

## 7. Flushing the ROM

This is the sequence from [ombob's guide](https://www.ombob.eu.org/2023/07/redmi-10a-9a-9c-poco-c3-64bit-android.html). It works with `adb sideload` in a custom recovery:

```text
fastboot -w
fastboot erase userdata
fastboot flash recovery recovery.img
fastboot reboot bootloader
fastboot reboot recovery
```

Then, inside the recovery:

1. **Format data** (mandatory — MIUI encryption will cause boot loops otherwise).
2. Flash the firmware update package, **only if** you came from stock MIUI 12.0.xx on Android 10.
3. Flash vendor R, if the ROM you picked doesn't already bundle it. Most current builds include it.
4. Flash the ROM zip.
5. Reboot to system, then reboot back into recovery once more.
6. Flash your GApps.
7. Format data again, then reboot to system.

> **Warning:** Steps 1 and 7 each wipe the phone. Any failure between them can leave you in a state where only a full stock reflash recovers. Don't improvise in the middle of this sequence.
{: .prompt-danger }

## 8. Notes

- **Telegram links rot.** Post IDs in the index can be edited or deleted by the channel at any time. If a link 404s, the build is gone.
- **`erofs` builds need an `erofs`-capable recovery.** Both the TWRP (erofs) and OrangeFox entries in the index support it; older recoveries may fail to mount `/system`.
- **Newer is not always better.** Android 16 builds on this hardware are community ports, not official work. If you need a phone that just works, stay on stock.
- **Relocking after flashing** (`fastboot flashing lock`) wipes data again and requires you to be back on a stock ROM. Leaving the bootloader unlocked is the normal end state for a custom ROM device.