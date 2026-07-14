#!/bin/sh

mkdir -p grpc
protoc --go_out=grpc --go_opt=paths=source_relative engine.proto
go build -o backend main.go