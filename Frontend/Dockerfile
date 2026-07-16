# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Baked into the static bundle at build time — Vite only reads
# import.meta.env.VITE_* at build, not at container runtime.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm and serve
RUN npm install -g pnpm serve

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5173

# Start the application
CMD ["serve", "-s", "dist", "-l", "5173"]
