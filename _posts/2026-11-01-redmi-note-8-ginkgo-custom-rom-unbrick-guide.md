---
title: "Redmi Note 8 (ginkgo) Custom ROM & Unbrick Guide"
date: 2026-11-01 13:30:00 +0530
description: "A complete working guide to the Redmi Note 8 (ginkgo) — which custom ROM to pick for a Snapdragon 665 in 2026, how to escape a repartitioned ColorOS or HyperOS install, and how to bring a bricked phone back with the official partition table."
image:
  path: /assets/img/posts/redmi-note-8-ginkgo-cover.webp
  alt: "Redmi Note 8 (ginkgo) custom ROM and unbrick guide"
categories: ["Android"]
tags: ["redmi-note-8", "ginkgo", "willow", "xiaomi", "custom-rom", "unbrick", "fastboot", "lineageos", "android", "repartition"]
---

> **WARNING:** Everything below touches the partition table, the bootloader and the file system of a phone. Get a step wrong and you end up with "The system has been destroyed" — or worse, an EDL-only brick. I am not responsible for what happens to your device. Read the whole thing once before you start typing commands.
{: .prompt-danger }

The Redmi Note 8 (2019) is one of those phones that refuses to die. A Snapdragon 665, UFS 2.1 storage and a 1080p screen still make a perfectly usable handset in 2026 — but the stock MIUI it shipped with is the main thing holding it back. This guide covers the two things people actually get stuck on: **picking a ROM that respects the aging hardware**, and **getting out of the repartitioned-ROM trap** that turns a working phone into a brick.

> If you are new to this, read [my Redmi 9 bootloader unlock guide](/posts/redmi-9-india-cattail-bootloader-unlocking-guide/) first — the mindset and the safety rules carry over. `ginkgo` uses the Qualcomm Mi Unlock flow, not the MediaTek one, but the "back up your data and keep your stock ROM" part is identical.
{: .prompt-info }

## 1. Know your device before anything else

| Detail | Value |
| --- | --- |
| Device | Xiaomi Redmi Note 8 (2019) |
| Codename | `ginkgo` |
| SoC | Qualcomm Snapdragon 665 |
| Storage | UFS 2.1 |
| Required base firmware | Official MIUI 12.5 on Android 11 |

> **Careful:** the **Redmi Note 8T** — the NFC variant — is codename `willow`, not `ginkgo`. Most community ROMs are *unified* and cover both, but many are not. Always read the codename list on the download page before you flash. "Works on Redmi Note 8" on its own means nothing.
{: .prompt-warning }

The base firmware requirement is not a suggestion. Everything in this guide assumes you are coming from **MIUI 12.5 on Android 11** — for example `V12.5.2.0.RCOINXM` for India or `V12.5.2.0.RCOMIXM` for Global. If you are still on an Android 10 MIUI build, flash the [Android 11 firmware for `ginkgo`](https://mifirm.net/model/ginkgo.ttt) first, or the ROM zips will fail or bootloop.

## 2. Choosing the right ROM for this hardware

The Snapdragon 665 and its UFS 2.1 storage have aged, and the single biggest difference between "smooth phone" and "laggy phone" is the Android version you pick. In rough order of how much I'd recommend them:

<figure class="diagram">
{% include diagrams/rom-chooser.svg %}
</figure>

### LineageOS 18.1 (Android 11) — raw speed and gaming king

The lowest idle RAM usage of anything on this list, zero background bloat, and the highest sustained frame rates in games. This is the pick for **3GB and 4GB RAM variants**, where every megabyte of idle usage counts.

The trade-off is honest: Android 11 is old, and some modern apps will eventually stop supporting it. If you use this phone as a gaming handheld or a secondary device, that trade is worth it.

Builds and the official install steps live on the [LineageOS wiki page for `ginkgo`](https://wiki.lineageos.org/devices/ginkgo/).

### LineageOS 22.2 (Android 15) — the modern daily driver

The sweet spot for daily use and current app compatibility. It sidesteps the extra AI and background overhead that Android 16/17 builds carry on this chipset, while still giving you fresh security patches and Play Store support.

Current zips are on the [LineageOS downloads page](https://download.lineageos.org/devices/ginkgo) — pick the newest build listed for `ginkgo`.

### Project Infinity X — the best all-rounder

If you want it to just work out of the box: GApps pre-installed, built-in high-FPS game unlockers, and working SafetyNet / Play Integrity so banking apps stop complaining — without any manual tweaking. Not the fastest, not the leanest, but the least amount of work.

Releases are published on [SourceForge](https://sourceforge.net/projects/infinity-x/) and the [ProjectInfinity-X GitHub org](https://github.com/ProjectInfinity-X).

### OEM ports (ColorOS 16, HyperOS, etc.) — heavy and invasive

These look and feel great. Custom rendering engines make the animations genuinely smooth, and it feels like a much newer phone.

Then you live with it: they take forever to boot, eat enormous amounts of RAM and storage, and — this is the important one — **almost all of them ship with a repartition script** that permanently alters your factory partition layout.

| ROM | Android | Best for | Main trade-off |
| --- | --- | --- | --- |
| LineageOS 18.1 | 11 | Gaming, 3GB/4GB RAM | Old Android, app support fading |
| LineageOS 22.2 | 15 | Daily driver | Slightly heavier than 18.1 |
| Project Infinity X | 15/16 | All-rounder, banking apps | Less lean than LineageOS |
| ColorOS 16 / HyperOS ports | 15/16 | Looks and animations | Heavy; forces a repartition |

## 3. The golden rule of ginkgo partitions

This is the section that saves your phone.

When you flash a repartition script — for ColorOS 16, HyperOS, or any "retrofit dynamic partition" ROM — it rewrites the **physical boundaries** of your `system`, `vendor` and `userdata` partitions. The phone now has a different partition layout than the one Xiaomi shipped.

> **The catch:** Xiaomi's official `flash_all.bat` script inside the MIUI Fastboot ROM does **not** re-flash the partition table (`gpt_both0.bin`). It assumes the stock layout is already there.
{: .prompt-danger }

So if you run Mi Flash over a repartitioned phone, every image writes to the wrong offset. The result is the black screen with **"The system has been destroyed."** You are not actually dead — the bootloader is still unlocked and fastboot still works — but no amount of re-running Mi Flash will fix it until you put the factory partition table back first.

<figure class="diagram">
{% include diagrams/partition-map.svg %}
</figure>

Which is exactly what Part 4 does.

## 4. Unbrick and restore the factory partition layout

<figure class="diagram">
{% include diagrams/unbrick-flow.svg %}
</figure>

### Step 1 — Force boot into fastboot

Even with "The system has been destroyed" on screen, fastboot still responds. Hold **Volume Down + Power** for a full **10 to 15 seconds**, until the screen goes black and the Fastboot bunny appears. Let go the moment you see it.

### Step 2 — Verify the bootloader is still unlocked

Connect the phone to your PC, open a Command Prompt inside your [`platform-tools`](https://developer.android.com/tools/releases/platform-tools) folder and run:

```text
fastboot oem device-info
```

You want both of these to read `true`:

```text
(bootloader) Device unlocked: true
(bootloader) Device critical unlocked: true
```

If `Device unlocked` is `false`, stop here. You cannot flash a partition table on a locked bootloader, and you'll need to get it unlocked before anything else.

### Step 3 — Extract the official fastboot ROM (twice)

Download the official **MIUI 12.5 Android 11 fastboot ROM** — the `.tgz` file, **not** the `.zip` recovery ROM. Then:

1. Extract the `.tgz` with [7-Zip](https://www.7-zip.org/).
2. Extract the resulting `.tar` again. Yes, twice.
3. Keep going until you see a folder containing **`flash_all.bat`** and an **`images`** subfolder.
4. Move that folder somewhere short with no spaces — `C:\rom` is the standard choice. Deep paths with spaces break the batch script.

### Step 4 — Manually flash the partition table and VBMeta

Open a Command Prompt *inside* the `images` folder — for example `C:\rom\images` — and run:

```text
fastboot flash partition gpt_both0.bin
fastboot flash vbmeta vbmeta.img
```

> **PS:** Do **not** add `--disable-verity` or `--disable-verification` flags to that `vbmeta` flash. `ginkgo`'s stock `vbmeta.img` has no `AVB_MAGIC` header, so those flags throw an error instead of helping. Flashing it plain works fine.
{: .prompt-tip }

This is the step everyone skips. Doing it restores the stock boundaries, so the next flash actually lands where it should.

### Step 5 — Flash the full stock firmware into the clean layout

Still in the Command Prompt, step up one directory to the main ROM folder and run the clean flash script:

```text
cd ..
flash_all.bat
```

Let it run. It takes **5 to 10 minutes** and the phone will reboot itself when it's done.

> **WARNING:** Never run `flash_all_lock.bat`. That variant relocks your bootloader at the end, and on a phone you've been repartitioning that is a one-way trip to a locked, unflashable device.
{: .prompt-danger }

If the phone boots into MIUI 12.5, you've successfully escaped the repartition trap — you're back to a clean stock base with stock partitions, which is the only sane starting point for any custom ROM.

## 5. Installing a recovery and flashing LineageOS

Once you're on a clean Android 11 firmware base with stock partitions, follow this order exactly. Do not improvise between steps.

### Step 1 — Flash a standard (non-dynamic) recovery

Grab a **standard** `ginkgo` recovery — [OrangeFox Recovery R11.1](https://orangefox.download/device/ginkgo) or the official **LineageOS Recovery**. Do not use a dynamic-partition recovery on a stock layout; it expects a partition table you don't have yet.

```text
fastboot flash recovery recovery.img
```

### Step 2 — Boot into recovery immediately

> **Do not let the phone boot into MIUI first.** MIUI overwrites your custom recovery with the stock one on first boot. If that happens, you flash the recovery again and start over.
{: .prompt-warning }

<figure class="diagram">
{% include diagrams/recovery-trap.svg %}
</figure>

Hold **Volume Up + Power** for about 10 seconds. The moment the **Redmi** logo appears, release **Power** but keep holding **Volume Up** until the recovery loads.

> **PS:** If you're using OrangeFox, flash the full `OrangeFox.zip` from inside the recovery once, so it installs its survival scripts and won't get overwritten by a subsequent ROM flash.
{: .prompt-tip }

### Step 3 — Format Data (mandatory)

Any time you change partition tables or switch ROM bases, the `userdata` file system has to be reset — MIUI's encryption is not something these recoveries understand.

- In OrangeFox/TWRP: **Wipe → Format Data → type `yes` → confirm**.
- Then **Reboot → Recovery**, so the recovery refreshes the newly formatted storage.

### Step 4 — Wipe the system partitions

Go to **Wipe**, select **Dalvik / ART Cache**, **Cache**, **System** and **Vendor**, then swipe to wipe.

> **Careful:** do **not** wipe **Internal Storage** if you already copied the ROM zip onto the phone — you'll delete your own install file. Copy the zips after wiping, or leave Internal Storage alone.
{: .prompt-tip }

### Step 5 — Flash the ROM, then GApps

1. Copy your `LineageOS.zip` — and a matching GApps package such as [MindTheGapps](https://wiki.lineageos.org/gapps/) or [NikGApps](https://nikgapps.com/) — from your PC to the phone over USB.
2. Flash the ROM zip **first**.
3. **Immediately** flash the GApps zip, before booting into the system for the first time.
   - If you're on official LineageOS Recovery instead: tap **Reboot to Recovery** after the ROM, then `adb sideload` the GApps package.
4. Tap **Reboot System**.

> **PS:** The first boot takes **3 to 5 minutes** and looks like it has hung. Leave it alone. Every boot after that takes seconds.
{: .prompt-tip }

## 6. Cheat sheet

Everything above, in the order you'll actually type it.

Check the connection:

```text
fastboot devices
```

Check the bootloader lock status:

```text
fastboot oem device-info
```

Restore the stock partition layout (run inside `images`):

```text
fastboot flash partition gpt_both0.bin
```

Restore stock VBMeta (run inside `images`):

```text
fastboot flash vbmeta vbmeta.img
```

Flash a clean MIUI base without relocking (run inside the main ROM folder):

```text
flash_all.bat
```

Flash the custom recovery:

```text
fastboot flash recovery recovery.img
```

## 7. Notes

- **Verify the codename, every time.** `fastboot getvar product` should return `ginkgo`. If it returns `willow` (the Note 8T), only flash ROMs that explicitly list `willow`.
- **Keep the stock fastboot ROM on your PC.** Not in a browser download you'll re-fetch later. The whole recovery path in Part 4 depends on having it locally.
- **A repartition script is not reversible by any button in recovery.** The only way back is the `gpt_both0.bin` flash above. If you're not prepared to do that, don't flash a repartition ROM.
- **Newer is not better on this chipset.** Android 15 builds are the practical ceiling for daily use on a Snapdragon 665. Android 16 ports work, but you'll feel the RAM pressure.
- **Battery age beats ROM choice.** A 2019 phone with its original battery will feel slow no matter what you flash. A cheap replacement cell often does more for perceived speed than switching Android versions.
- **Related reading:** my [Redmi 9 custom ROMs compilation](/posts/redmi-9-custom-roms-compilation/) if you also own a device from that family, and the [Mi Unlock walkthrough for `cattail`](/posts/redmi-9-india-cattail-bootloader-unlocking-guide/) for the bootloader side in more detail.

## 8. Appendix: a real flash session

Everything in this guide was run end to end on a Redmi Note 8 while writing it, so here is the raw `fastboot` transcript rather than a tidied-up summary of it. Folder paths are shortened to `C:\rom` and `C:\work`; nothing else is edited.

Two lines in the log look like errors but are not:

- `fastboot: error: Failed to find AVB_MAGIC at offset: 0` is the expected result of trying `--disable-verity` on a stock ginkgo `vbmeta.img`. That is exactly why this guide tells you to flash it without those flags.
- `Warning: skip copying ... avb footer` is fastboot refusing to write an AVB footer onto a sparse image. Normal for `system`, `vendor`, `cust` and the partition table itself.

<details markdown="1" style="border:1px solid rgba(128,128,128,.35); border-radius:10px; padding:.75rem 1rem; background:rgba(128,128,128,.05); margin-top:1rem;">
<summary style="cursor:pointer; font-weight:600;">Show the full transcript (319 lines)</summary>

```text
C:\rom>fastboot oem device-info
(bootloader) Verity mode: true
(bootloader) Device unlocked: true
(bootloader) Device critical unlocked: true
(bootloader) Charger screen enabled: true
OKAY [  0.004s]
Finished. Total time: 0.005s

C:\rom>cd images

C:\rom\images>fastboot --disable-verity --disable-verification flash vbmeta vbmeta.img
fastboot: error: Failed to find AVB_MAGIC at offset: 0

C:\rom\images>fastboot flash partition gpt_both0.bin
Warning: skip copying partition image avb footer (partition partition size: 0, partition image size: 34304).
Sending 'partition' (33 KB)                        OKAY [  0.011s]
Writing 'partition'                                OKAY [  2.359s]
Finished. Total time: 2.397s

C:\rom\images>fastboot flash vbmeta vbmeta.img
Sending 'vbmeta' (4 KB)                            OKAY [  0.006s]
Writing 'vbmeta'                                   OKAY [  0.004s]
Finished. Total time: 0.027s

C:\rom\images>cd ..

C:\rom>flash_all.bat

C:\rom>fastboot  getvar product   2>&1  | findstr /r /c:"^product: *ginkgo"   || echo Missmatching image and device
product: ginkgo

C:\rom>fastboot  getvar product   2>&1  | findstr /r /c:"^product: *ginkgo"   || exit /B 1
product: ginkgo

C:\rom>set CURRENT_ANTI_VER=1

C:\rom>for /F "tokens=2 delims=: " %i in ('fastboot getvar anti 2>&1 | findstr /r /c:"anti:"') do (set version=%i )

C:\rom>(set version=1 )

C:\rom>if [1] EQU [] set version=0

C:\rom>if 1 GTR 1 (
echo current device antirollback version is greater than this package
 exit /B 1
)

C:\rom>fastboot  flash xbl C:\rom\images\xbl.elf   ||
Sending 'xbl' (3449 KB)                            OKAY [  0.083s]
Writing 'xbl'                                      OKAY [  0.017s]
Finished. Total time: 0.117s

C:\rom>fastboot  flash xblbak C:\rom\images\xbl.elf   ||
Sending 'xblbak' (3449 KB)                         OKAY [  0.087s]
Writing 'xblbak'                                   OKAY [  0.022s]
Finished. Total time: 0.127s

C:\rom>fastboot  flash xbl_config C:\rom\images\xbl_config.elf   ||
Sending 'xbl_config' (48 KB)                       OKAY [  0.003s]
Writing 'xbl_config'                               OKAY [  0.002s]
Finished. Total time: 0.021s

C:\rom>fastboot  flash xbl_configbak C:\rom\images\xbl_config.elf   ||
Sending 'xbl_configbak' (48 KB)                    OKAY [  0.004s]
Writing 'xbl_configbak'                            OKAY [  0.002s]
Finished. Total time: 0.023s

C:\rom>fastboot  flash imagefv C:\rom\images\imagefv.elf   ||
Sending 'imagefv' (20 KB)                          OKAY [  0.004s]
Writing 'imagefv'                                  OKAY [  0.002s]
Finished. Total time: 0.021s

C:\rom>fastboot  flash imagefvbak C:\rom\images\imagefv.elf   ||
Sending 'imagefvbak' (20 KB)                       OKAY [  0.005s]
Writing 'imagefvbak'                               OKAY [  0.001s]
Finished. Total time: 0.022s

C:\rom>fastboot  flash uefisecapp C:\rom\images\uefi_sec.mbn   ||
Sending 'uefisecapp' (125 KB)                      OKAY [  0.005s]
Writing 'uefisecapp'                               OKAY [  0.003s]
Finished. Total time: 0.024s

C:\rom>fastboot  flash uefisecappbak C:\rom\images\uefi_sec.mbn   ||
Sending 'uefisecappbak' (125 KB)                   OKAY [  0.010s]
Writing 'uefisecappbak'                            OKAY [  0.005s]
Finished. Total time: 0.035s

C:\rom>fastboot  flash qupfw C:\rom\images\qupv3fw.elf   ||
Sending 'qupfw' (48 KB)                            OKAY [  0.012s]
Writing 'qupfw'                                    OKAY [  0.005s]
Finished. Total time: 0.033s

C:\rom>fastboot  flash qupfwbak C:\rom\images\qupv3fw.elf   ||
Sending 'qupfwbak' (48 KB)                         OKAY [  0.011s]
Writing 'qupfwbak'                                 OKAY [  0.005s]
Finished. Total time: 0.032s

C:\rom>fastboot  flash metadata C:\rom\images\metadata.img   ||
Warning: skip copying metadata image avb footer due to sparse image.
Sending 'metadata' (44 KB)                         OKAY [  0.011s]
Writing 'metadata'                                 OKAY [  0.005s]
Finished. Total time: 0.032s

C:\rom>fastboot  flash tz C:\rom\images\tz.mbn   ||
Sending 'tz' (1960 KB)                             OKAY [  0.051s]
Writing 'tz'                                       OKAY [  0.011s]
Finished. Total time: 0.078s

C:\rom>fastboot  flash tzbak C:\rom\images\tz.mbn   ||
Sending 'tzbak' (1960 KB)                          OKAY [  0.052s]
Writing 'tzbak'                                    OKAY [  0.011s]
Finished. Total time: 0.083s

C:\rom>fastboot  flash rpm C:\rom\images\rpm.mbn   ||
Sending 'rpm' (219 KB)                             OKAY [  0.016s]
Writing 'rpm'                                      OKAY [  0.005s]
Finished. Total time: 0.047s

C:\rom>fastboot  flash rpmbak C:\rom\images\rpm.mbn   ||
Sending 'rpmbak' (219 KB)                          OKAY [  0.010s]
Writing 'rpmbak'                                   OKAY [  0.005s]
Finished. Total time: 0.031s

C:\rom>fastboot  flash hyp C:\rom\images\hyp.mbn   ||
Sending 'hyp' (361 KB)                             OKAY [  0.012s]
Writing 'hyp'                                      OKAY [  0.006s]
Finished. Total time: 0.033s

C:\rom>fastboot  flash hypbak C:\rom\images\hyp.mbn   ||
Sending 'hypbak' (361 KB)                          OKAY [  0.010s]
Writing 'hypbak'                                   OKAY [  0.006s]
Finished. Total time: 0.042s

C:\rom>fastboot  flash keymaster C:\rom\images\km4.mbn   ||
Sending 'keymaster' (232 KB)                       OKAY [  0.010s]
Writing 'keymaster'                                OKAY [  0.005s]
Finished. Total time: 0.031s

C:\rom>fastboot  flash keymasterbak C:\rom\images\km4.mbn   ||
Sending 'keymasterbak' (232 KB)                    OKAY [  0.011s]
Writing 'keymasterbak'                             OKAY [  0.006s]
Finished. Total time: 0.033s

C:\rom>fastboot  flash cmnlib C:\rom\images\cmnlib.mbn   ||
Sending 'cmnlib' (385 KB)                          OKAY [  0.011s]
Writing 'cmnlib'                                   OKAY [  0.006s]
Finished. Total time: 0.033s

C:\rom>fastboot  flash cmnlibbak C:\rom\images\cmnlib.mbn   ||
Sending 'cmnlibbak' (385 KB)                       OKAY [  0.020s]
Writing 'cmnlibbak'                                OKAY [  0.006s]
Finished. Total time: 0.042s

C:\rom>fastboot  flash cmnlib64 C:\rom\images\cmnlib64.mbn   ||
Sending 'cmnlib64' (503 KB)                        OKAY [  0.021s]
Writing 'cmnlib64'                                 OKAY [  0.007s]
Finished. Total time: 0.043s

C:\rom>fastboot  flash cmnlib64bak C:\rom\images\cmnlib64.mbn   ||
Sending 'cmnlib64bak' (503 KB)                     OKAY [  0.014s]
Writing 'cmnlib64bak'                              OKAY [  0.007s]
Finished. Total time: 0.042s

C:\rom>fastboot  flash modem C:\rom\images\NON-HLOS.bin   ||
Sending 'modem' (119617 KB)                        OKAY [  2.763s]
Writing 'modem'                                    OKAY [  0.501s]
Finished. Total time: 3.324s

C:\rom>fastboot  flash dsp C:\rom\images\dspso.bin   ||
Sending 'dsp' (32768 KB)                           OKAY [  0.758s]
Writing 'dsp'                                      OKAY [  0.129s]
Finished. Total time: 0.902s

C:\rom>fastboot  flash dspbak C:\rom\images\dspso.bin   ||
Sending 'dspbak' (32768 KB)                        OKAY [  0.759s]
Writing 'dspbak'                                   OKAY [  0.139s]
Finished. Total time: 0.913s

C:\rom>fastboot  flash bluetooth C:\rom\images\BTFM.bin   ||
Sending 'bluetooth' (876 KB)                       OKAY [  0.025s]
Writing 'bluetooth'                                OKAY [  0.008s]
Finished. Total time: 0.048s

C:\rom>fastboot  flash bluetoothbak C:\rom\images\BTFM.bin   ||
Sending 'bluetoothbak' (876 KB)                    OKAY [  0.027s]
Writing 'bluetoothbak'                             OKAY [  0.016s]
Finished. Total time: 0.060s

C:\rom>fastboot  flash storsec C:\rom\images\storsec.mbn   ||
Sending 'storsec' (19 KB)                          OKAY [  0.010s]
Writing 'storsec'                                  OKAY [  0.005s]
Finished. Total time: 0.031s

C:\rom>fastboot  flash devcfg C:\rom\images\devcfg.mbn   ||
Sending 'devcfg' (41 KB)                           OKAY [  0.011s]
Writing 'devcfg'                                   OKAY [  0.005s]
Finished. Total time: 0.032s

C:\rom>fastboot  flash devcfgbak C:\rom\images\devcfg.mbn   ||
Sending 'devcfgbak' (41 KB)                        OKAY [  0.011s]
Writing 'devcfgbak'                                OKAY [  0.005s]
Finished. Total time: 0.033s

C:\rom>fastboot  flash abl C:\rom\images\abl.elf   ||
Sending 'abl' (216 KB)                             OKAY [  0.011s]
Writing 'abl'                                      OKAY [  0.005s]
Finished. Total time: 0.042s

C:\rom>fastboot  flash ablbak C:\rom\images\abl.elf   ||
Sending 'ablbak' (216 KB)                          OKAY [  0.012s]
Writing 'ablbak'                                   OKAY [  0.005s]
Finished. Total time: 0.034s

C:\rom>fastboot  flash dtbo C:\rom\images\dtbo.img   ||
Sending 'dtbo' (24576 KB)                          OKAY [  0.581s]
Writing 'dtbo'                                     OKAY [  0.109s]
Finished. Total time: 0.717s

C:\rom>fastboot  flash vbmeta C:\rom\images\vbmeta.img   ||
Sending 'vbmeta' (4 KB)                            OKAY [  0.006s]
Writing 'vbmeta'                                   OKAY [  0.001s]
Finished. Total time: 0.023s

C:\rom>fastboot  flash vbmetabak C:\rom\images\vbmeta.img   ||
Sending 'vbmetabak' (4 KB)                         OKAY [  0.004s]
Writing 'vbmetabak'                                OKAY [  0.001s]
Finished. Total time: 0.022s

C:\rom>fastboot  flash boot C:\rom\images\boot.img   ||
Sending 'boot' (65536 KB)                          OKAY [  1.510s]
Writing 'boot'                                     OKAY [  0.270s]
Finished. Total time: 1.795s

C:\rom>fastboot  flash recovery C:\rom\images\recovery.img   ||
Sending 'recovery' (65536 KB)                      OKAY [  1.512s]
Writing 'recovery'                                 OKAY [  0.279s]
Finished. Total time: 1.807s

C:\rom>fastboot  flash system C:\rom\images\system.img   ||
Warning: skip copying system image avb footer due to sparse image.
Sending sparse 'system' 1/6 (776284 KB)            OKAY [ 17.914s]
Writing 'system'                                   OKAY [  0.001s]
Sending sparse 'system' 2/6 (774312 KB)            OKAY [ 18.139s]
Writing 'system'                                   OKAY [  0.001s]
Sending sparse 'system' 3/6 (774312 KB)            OKAY [ 18.069s]
Writing 'system'                                   OKAY [  0.001s]
Sending sparse 'system' 4/6 (774312 KB)            OKAY [ 18.119s]
Writing 'system'                                   OKAY [  0.001s]
Sending sparse 'system' 5/6 (774312 KB)            OKAY [ 18.109s]
Writing 'system'                                   OKAY [  0.001s]
Sending sparse 'system' 6/6 (498996 KB)            OKAY [ 11.768s]
Writing 'system'                                   OKAY [  0.001s]
Finished. Total time: 102.174s

C:\rom>fastboot  flash vendor C:\rom\images\vendor.img   ||
Warning: skip copying vendor image avb footer due to sparse image.
Sending sparse 'vendor' 1/2 (775304 KB)            OKAY [ 17.888s]
Writing 'vendor'                                   OKAY [  0.001s]
Sending sparse 'vendor' 2/2 (269572 KB)            OKAY [  6.427s]
Writing 'vendor'                                   OKAY [  0.001s]
Finished. Total time: 26.416s

C:\rom>fastboot  flash userdata C:\rom\images\userdata.img   ||
Warning: skip copying userdata image avb footer due to sparse image.
Sending 'userdata' (68192 KB)                      OKAY [  1.575s]
Writing 'userdata'                                 OKAY [  0.001s]
Finished. Total time: 2.708s

C:\rom>fastboot  flash cache C:\rom\images\cache.img   ||
Warning: skip copying cache image avb footer due to sparse image.
Sending 'cache' (56 KB)                            OKAY [  0.006s]
Writing 'cache'                                    OKAY [  0.003s]
Finished. Total time: 7.516s

C:\rom>fastboot  erase ddr
Erasing 'ddr'                                      OKAY [  0.044s]
Finished. Total time: 0.049s

C:\rom>fastboot  erase misc
Erasing 'misc'                                     OKAY [  0.078s]
Finished. Total time: 0.083s

C:\rom>fastboot  erase apdp
Erasing 'apdp'                                     OKAY [  0.078s]
Finished. Total time: 0.083s

C:\rom>fastboot  flash cust C:\rom\images\cust.img
Warning: skip copying cust image avb footer due to sparse image.
Sending 'cust' (180568 KB)                         OKAY [  4.169s]
Writing 'cust'                                     OKAY [  0.001s]
Finished. Total time: 4.189s

C:\rom>fastboot  reboot
Rebooting                                          OKAY [  0.736s]
Finished. Total time: 0.738s

C:\rom>pause
Press any key to continue . . .

C:\rom>cd ..

C:\work>ls
@RafitaDev.ColorOS15.zip             MiFlash20220507                   Qualcomm_USB_Driver_v1.0.10065.1
Ginkgo_64_-Repartion-_8.5GB_2GB.zip  OrangeFox-ginkgo-stableR11.1      ginkgo_in_global_images_V12.5.2.0.RCOINXM_20220617.0000.00_11.0_in
Magisk-v31.0.apk                     OrangeFox-ginkgo-stableR11.1.zip  miui_GINKGOGlobal_V12.5.2.0.RCOMIXM_75abe1782e_11.0.zip

C:\work>cd OrangeFox-ginkgo-stableR11.1

C:\work\OrangeFox-ginkgo-stableR11.1>ls
INSTALL.txt  META-INF  recovery.img  sdcard

C:\work\OrangeFox-ginkgo-stableR11.1>fastboot flash recovery recovery.img
Sending 'recovery' (65536 KB)                      OKAY [  1.511s]
Writing 'recovery'                                 OKAY [  0.282s]
Finished. Total time: 1.814s

C:\work\OrangeFox-ginkgo-stableR11.1>fastboot reboot recovery
Rebooting into recovery                            OKAY [  0.001s]
Finished. Total time: 0.002s

```

</details>

> **Where each part maps to this guide:** the `oem device-info` and `gpt_both0.bin` section is Part 4, the `flash_all.bat` run is the rest of Part 4, and the OrangeFox `recovery` flash at the very end is Part 5 Step 1.
{: .prompt-tip }
