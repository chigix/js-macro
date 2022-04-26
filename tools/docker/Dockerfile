FROM ubuntu:20.04
MAINTAINER Richard Lea <https://github.com/chigix>
# Inspired from https://github.com/espressif/esp-idf/blob/master/tools/docker/Dockerfile

ARG DEBIAN_FRONTEND=noninteractive

ENV MODDABLE=/opt/moddable
ENV IDF_PATH=/opt/esp/idf
ENV UPLOAD_PORT=/dev/ttyUSB0
ENV IDF_CCACHE_ENABLE=1
ENV PATH="/opt/moddable/build/bin/lin/release:${PATH}"
ENV DISPLAY="host.docker.internal:0.0"

RUN apt-get update \
    && apt-get -y install --no-install-recommends \
                  gcc bison ca-certificates wget make \
                  flex git gperf libncurses-dev libgtk-3-dev \
    # && apt-get autoremove -y \
    && update-ca-certificates --fresh \
    && git clone https://github.com/Moddable-OpenSource/moddable $MODDABLE \
    && cd $MODDABLE/build/makefiles/lin && make \
    && apt-get -y install --no-install-recommends python-is-python3 \
                  python3-pip python3-serial python-setuptools \
                  cmake ccache libffi-dev libusb-1.0-0-dev \
                  ninja-build libssl-dev dfu-util \
    && git clone -b v4.4 --recursive https://github.com/espressif/esp-idf.git $IDF_PATH \
    && $IDF_PATH/install.sh

COPY ./entrypoint.sh /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
CMD [ "/bin/bash" ]
