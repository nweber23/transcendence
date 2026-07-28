#!/bin/sh

mkdir -p engine_proto
protoc \
	--go_out=engine_proto      --go_opt=paths=source_relative \
	--go-grpc_out=engine_proto --go-grpc_opt=paths=source_relative \
engine.proto
go build -o backend main.go