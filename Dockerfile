FROM rust:bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    clang \
    lld \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY entity ./entity
COPY assets ./assets

RUN  cargo build --release
   
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/distracted-swartz /app/distracted-swartz

ENTRYPOINT ["./distracted-swartz"]
