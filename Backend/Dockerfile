FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o backend main.go

#FROM golang:1.26-alpine

RUN apk --no-cache add ca-certificates

WORKDIR /root/

#COPY /app/backend .
RUN cp /app/backend .

EXPOSE 8080

CMD ["./backend"]
