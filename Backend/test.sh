#!/bin/ash
cd /app
apk add --no-cache gcc musl musl-dev
CGO_ENABLED=1 go test\
	./services\
	./utils
true