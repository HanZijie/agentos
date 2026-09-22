# Linux amd64 host dependencies captured from the stock build 16373615 container.
# This image does not contain Cuttlefish image/host archives or the host kernel.
ARG UBUNTU_IMAGE=docker.m.daocloud.io/library/ubuntu@sha256:008173c23f95b170204355c12626cb5a965d779a7e1283b09e9cffbb1bf33ca3
FROM ${UBUNTU_IMAGE}

COPY host-packages.lock /tmp/host-packages.lock
COPY capability_query.py /tmp/capability_query.py
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive xargs -r apt-get install -y --no-install-recommends < /tmp/host-packages.lock \
    && groupadd --system --gid 999 cvdnetwork \
    && install -D -m 0755 /tmp/capability_query.py /usr/lib/cuttlefish-common/bin/capability_query.py \
    && rm -rf /var/lib/apt/lists/* /tmp/host-packages.lock /tmp/capability_query.py

WORKDIR /cf
CMD ["sleep", "infinity"]
