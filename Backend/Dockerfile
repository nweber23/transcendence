FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN chmod +x test.sh

RUN apk --no-cache add protoc
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

RUN chmod +x build.sh
RUN ./build.sh

RUN apk --no-cache add ca-certificates

WORKDIR /root/

RUN cp /app/backend .

EXPOSE 8080

CMD ["./backend"]
