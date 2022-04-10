# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.224.2/containers/javascript-node/.devcontainer/base.Dockerfile

# [Choice] Node.js version (use -bullseye variants on local arm64/Apple Silicon): 16, 14, 12, 16-bullseye, 14-bullseye, 12-bullseye, 16-buster, 14-buster, 12-buster
ARG VARIANT="16-bullseye"
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

ENV MODDABLE=/ESP32/moddable
ENV IDF_PATH=/ESP32/esp-idf
ENV UPLOAD_PORT=/dev/ttyUSB0
ENV PATH="/ESP32/moddable/build/bin/lin/release:${PATH}"

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends gcc git wget make libncurses-dev flex bison gperf \
    && apt-get -y install --no-install-recommends libgtk-3-dev screen \
    && mkdir /ESP32 && cd /ESP32 \
    && git clone https://github.com/Moddable-OpenSource/moddable \
    && cd $MODDABLE/build/makefiles/lin && make \
    && apt-get -y install --no-install-recommends python-is-python3 python3-pip python3-serial python-setuptools cmake ninja-build ccache libffi-dev libssl-dev dfu-util \
    && cd /ESP32 && git clone -b v4.4 --recursive https://github.com/espressif/esp-idf.git \
    && cd /ESP32/esp-idf && git clone -b v4.4 --recursive https://github.com/espressif/esp-idf.git \
    && cd $IDF_PATH && $IDF_PATH/install.sh && . $IDF_PATH/export.sh \
    && sed -i 's/^# alias ls=/alias ls=/' /root/.bashrc \
    && sed -i 's/^# alias ll=/alias ll=/' /root/.bashrc
    # && sed -i 's/^# export LS_OPTIONS=/export LS_OPTIONS=/' /root/.bashrc

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"
