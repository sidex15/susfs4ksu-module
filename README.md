# A KernelSU module for SUSFS patched kernel #

This module installs a userspace helper tool called **ksu_susfs** and **sus_su** into /data/adb/ksu and provides a script to communicate with SUSFS kernel.
This module provides root hiding for KernelSU on the kernel level.

## Notes
- Make sure you have a custom kernel with SUSFS patched in it. Check the custom kernel source to see if it has SUSFS.
- Make sure the kernel is using SUSFS 1.5.2 or later for effective hide.
- Shamiko v1.2.1 or later is acceptable (but it's highly optional to use it)
- HideMyApplist is acceptable
- ReVanced root module compatible
- Recommended to use [bindhosts](https://github.com/backslashxx/bindhosts) if you want to use systemless hosts

## SUSFS Custom settings documentation
https://github.com/sidex15/susfs4ksu-module/wiki/SUSFS-Custom-Settings

## Spoofing Kernel Uname guide on Revision 16+
In the new R16 of SUSFS includes a new parameter called "Spoof Kernel Build". this may confuse some users about what those are.

In the kernel version it affects this part:
```
6.1.75-android14-11-g16c5f6cd5e9b-ab12268515
```
While on the Kernel Build part is this:
```
#1 SMP PREEMPT Fri Aug 23 03:08:10 UTC 2024
```
You may check them by using these commands:
```
#This is for the Kernel Version
uname -r
#This is for the Kernel Build
uname -v
```

## Adding ro.boot.vbmeta.digest value
This module will now have a directory called `VerifiedBootHash` in `/data/adb` containing `VerifiedBootHash.txt` for users with missing `ro.boot.vbmeta.digest` value to prevent partition modified and abnormal boot state detection. 
- Copy your VerifiedBootHash in the Key Attestation demo and paste it to `/data/adb/VerifiedBootHash/VerifiedBootHash.txt`

## Localization
If you want to contribute to add your own language, use the `webui` branch and add your translations in the `./languages` directory. Make sure to test the implementation thoroughly before submitting a pull request.
Also, the name of the XML files should be the same as the language code, for example:
- For English, the file should be named `en.xml`
- For Spanish, the file should be named `es.xml`

Then add your language to the `./languages/languages.json` with this format:
<br>
```
"<your language code>": "<Name of the language (not English translation)>"
```
so it will be included in the language drop-down menu. <br>

## Credits
susfs4ksu: https://gitlab.com/simonpunk/susfs4ksu/

## Buy us some coffee ☕
### simonpunk
PayPal: `kingjeffkimo@yahoo.com.tw`
<br>BTC: `bc1qgkwvsfln02463zpjf7z6tds8xnpeykggtgk4kw`
### sidex15
PayPal: `sidex15.official@gmail.com`
<br>BTC: `1AVaRmoEivK94XRooqbbAgvzdTMA5cwGdc`
<br>ETH (ERC20): `0xa52151ebd2718a00af9e1dfcacfb30e1d3a94860`
<br>USDT (TRC20): `TAUbxzug7cygExFunhFBiG6ntmbJwz7Skn`
<br>USDT (ERC20): 
`0xa52151ebd2718a00af9e1dfcacfb30e1d3a94860`

## Stars 🌟
[![Stars 🌟](https://starchart.cc/sidex15/susfs4ksu-module.svg?variant=adaptive)](https://starchart.cc/sidex15/susfs4ksu-module)
