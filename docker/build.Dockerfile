# Builds CamCraft's browser shell (web/build-app-wasm.sh) for any ref.
# Mirrors the `wasm` job in NeoTech/Camcraft .github/workflows/release.yml.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git build-essential pkg-config clang-18 llvm-18 lld-18 xz-utils \
    && rm -rf /var/lib/apt/lists/*
ENV RUSTUP_HOME=/opt/rustup CARGO_HOME=/opt/cargo PATH=/opt/cargo/bin:$PATH
RUN curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable \
    && rustup target add wasm32-unknown-unknown
ENV CC_wasm32_unknown_unknown=clang-18 AR_wasm32_unknown_unknown=llvm-ar-18
# The wasm job as copied, for build-ref's drift warning (scripts/update-wasm-snapshot.sh)
COPY wasm-job.snapshot.yml /usr/local/share/helpcraft/
COPY wasm-job.sh /usr/local/bin/wasm-job
COPY build-ref.sh /usr/local/bin/build-ref
ENTRYPOINT ["build-ref"]
