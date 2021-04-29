# [node-usb-issue-418-delay-at-exit](https://github.com/joelpurra/node-usb-issue-418-delay-at-exit)

Reproducing an issue where exiting a program after using [`node-usb`](https://github.com/tessel/node-usb) v1.7.0 is significantly delayed.

Behavior differs between versions of `node-usb` as well as between [versions of Node.js](https://github.com/nodejs/Release).

- [v1.6.5](https://github.com/tessel/node-usb/releases/tag/v1.6.5): no delay.
- [v1.7.0](https://github.com/tessel/node-usb/releases/tag/v1.7.0): significant delay (several seconds, or even infinite).

Timing summary:

| | v12.22.1 | v14.16.1 | v16.0.0 |
| --- | ---: | ---: | ---: |
| v1.6.5 | 50 ms | 50 ms | 50 ms |
| v1.7.0 | 8000 ms | 8000 ms | ∞ |

The sample size is small, but the difference between "no delay" (less than 100 milliseconds execution time), "long delay" (8-9 seconds), and "does not exit" (several minutes at least) is noticeable on a human scale.

Note that the program code in [`index.js`](./index.js) itself may have bugs. It is essentially a boiled-downed version of the [USB Video Class (UVC) device configurator  `uvcc` command line interface](https://github.com/joelpurra/uvcc), where the issue was first reported.

See

- https://github.com/tessel/node-usb/issues/418
- https://github.com/joelpurra/uvcc/issues/16


## Steps to verify

```shell
# NOTE: installing the specific problematic version.
npm install --no-save usb@=1.7.0

# NOTE: you can skip using "time" since the delay is noticeable on a human scale.
time node index.js
```

<details>

<summary>Sample output (node-usb v1.7.0, Node.js v16.0.0)</summary>

```shell
node --version
```

```text
v16.0.0
```

```shell
time node index.js
```

```text
{
  idVendor: 1133,
  idProduct: 2093,
  deviceAddress: 3,
  iProduct: '"HD Pro Webcam C920"'
}
{ whiteBalanceTemperature: 4144 }
^C
node index.js  0.05s user 0.00s system 0% cpu 1:02.88 total
```

The terminal output is shown immediatelly, but the program has to be forced to stop with <kbd>ctrl</kbd>+<kbd>c</kbd>.

</details>

<details>

<summary>Test setup</summary>

Node.js versions were selected using [`n`](https://github.com/tj/n) (yes, it's a single character name).

```shell
n latest
```

```text
   installed : v16.0.0 to /home/joelpurra/.n/bin/node
      active : v16.0.0 at /usr/local/bin/node
```

---

Verified on Ubuntu 20.10.

```shell
uname --all
```

```text
Linux Computer 5.4.0-72-generic #80-Ubuntu SMP Mon Apr 12 17:35:00 UTC 2021 x86_64 x86_64 x86_64 GNU/Linux
```

---

Verified on macOS 10.14 (Mojave).

```shell
uname -a
```

```text
Darwin Computer 18.7.0 Darwin Kernel Version 18.7.0: Tue Jan 12 22:04:47 PST 2021; root:xnu-4903.278.56~1/RELEASE_X86_64 x86_64
```

</details>

## Workaround

- Run the steps above to verify that the code crashes.
- Switch to `node-usb` v1.6.5.
- Verify that it works.

```shell
# NOTE: clean up.
rm --recursive node_modules/

# NOTE: installing the specific working version.
npm install --no-save usb@=1.6.5

time node index.js
```

---

[node-usb-issue-418-delay-at-exit](https://github.com/joelpurra/node-usb-issue-418-delay-at-exit) Copyright &copy; 2021 [Joel Purra](https://joelpurra.com/). Released under [MIT License](https://opensource.org/licenses/MIT). [Your donations are appreciated!](https://joelpurra.com/donate/)
