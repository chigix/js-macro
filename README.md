# js-macro (Moddable Solution)

A JavaScript Solution for AZ-Macro Keyboard using Moddable.

## Getting Started (Building, Installation, Flashing)

Before flashing the Firmware into the device, the following hardware tooling are required as pre-requisites:
* https://www.switch-science.com/catalog/5241/
  * En: https://www.amazon.com/HiLetgo-FT232RL-Converter-Adapter-Breakout/dp/B00IJXZQ7C
* A USB data cable to connect Computer and ESP Programmer Adapter.

In the very minimized introduction below, the USB serial port on the computer is mapped as `/dev/ttyUSB0` in the Linux file system.

This JavaScript solution is running on Moddable.js platform. Flashing would initially need to build both Moddable.js and ESP-IDF tooling.
For convenience, there has been the sufficient docker image available to help us do necessary Firmware building and flashing:

```bash
$ git clone git@github.com:chigix/js-macro.git
$ cd js-macro
$ yarn build # The bundled JS result is under ./dist/prod

# https://hub.docker.com/r/chigix/moddable
$ docker pull chigix/moddable
$ docker run --rm -it --device=/dev/ttyUSB0 -v ./dist:/workspace chigix/moddable:1.0.0 mcconfig /workspace/prod/manifest.json -d -m -p esp32
```

This Dockerfile for this docker images here can be referenced:
<https://github.com/chigix/js-macro/blob/moddable/tools/docker/Dockerfile> .
