package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	DatabaseHost       string
	DatabasePort       string
	DatabaseUser       string
	DatabasePassword   string
	DatabaseName       string
	Port               string
	JWTSecret          string
	JWTExpiration      int64
	EngineHost         string
	EnginePort         string
	GinMode            string
	CORSAllowedOrigin  string
	GithubClientId     string
	GithubSecret       string
	GithubRedirectURL  string
}

func LoadConfig() *Config {
	return &Config{
		DatabaseHost:      getEnv("DATABASE_HOST", "postgres"),
		DatabasePort:      getEnv("DATABASE_PORT", "5432"),
		DatabaseUser:      getEnv("DATABASE_USER", "admin"),
		DatabasePassword:  getEnv("DATABASE_PASSWORD", "admin123"),
		DatabaseName:      getEnv("DATABASE_NAME", "postgres"),
		Port:              getEnv("PORT", "8080"),
		JWTSecret:         getEnv("JWT_SECRET", "secret"),
		JWTExpiration:     getEnvInt("JWT_EXPIRATION", 86400),
		EngineHost:        getEnv("ENGINE_HOST", "engine"),
		EnginePort:        getEnv("ENGINE_PORT", "9090"),
		GinMode:           getEnv("GIN_MODE", "debug"),
		CORSAllowedOrigin: getEnv("CORS_ALLOWED_ORIGIN", "*"),
		GithubClientId:    getEnv("GITHUB_CLIENT_ID", ""),
		GithubSecret:      getEnv("GITHUB_CLIENT_SECRET", ""),
		GithubRedirectURL: getEnv("GITHUB_REDIRECT_URL", "http://localhost:3334/auth/github/callback"),
	}
}

func (c *Config) DatabaseURL() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		c.DatabaseUser, c.DatabasePassword, c.DatabaseHost, c.DatabasePort, c.DatabaseName)
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int64) int64 {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intValue
		}
	}
	return fallback
}