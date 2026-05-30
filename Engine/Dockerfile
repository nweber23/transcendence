
# Multi-stage Dockerfile to build and run a C++26 engine (exposes port 777)

################################################################################
# Build stage: modern GCC toolchain for C++26
FROM ubuntu:24.04 AS build

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates software-properties-common wget gnupg lsb-release \
 && add-apt-repository -y ppa:ubuntu-toolchain-r/test \
 && apt-get update \
 && apt-get install -y --no-install-recommends build-essential cmake git gcc-14 g++-14 \
 && rm -rf /var/lib/apt/lists/*

# Make gcc-14/g++-14 the default
RUN update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-14 100 \
 && update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-14 100

WORKDIR /workspace

# Copy project and build. Adjust CMake usage as needed for your project layout.
COPY . /workspace
RUN mkdir -p build && cd build \
 && cmake -DCMAKE_BUILD_TYPE=Release .. \
 && cmake --build . -- -j$(nproc)

################################################################################
# Runtime stage: lightweight image
FROM debian:bookworm-slim

RUN groupadd -r app && useradd -r -g app app

WORKDIR /app

# Copy built artifacts
COPY --from=build /workspace/build /app

# Expose engine port
EXPOSE 777

USER app
CMD ["/bin/sh", "-c", "[ -x /app/engine ] && /app/engine || sleep infinity"]
