FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN chmod +x test.sh

RUN go build -o backend main.go

RUN apk --no-cache add ca-certificates

WORKDIR /root/

RUN cp /app/backend .

EXPOSE 8080

CMD ["./backend"]
