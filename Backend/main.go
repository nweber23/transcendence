package main

import (
	"log"
	"os"

	"transcendence/config"
	"transcendence/handlers"
	"transcendence/middleware"
	"transcendence/services"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	db, err := config.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	router := gin.Default()

	// CORS middleware
	router.Use(middleware.CORSMiddleware())

	// Initialize services
	userService := services.NewUserService(db)
	accountService := services.NewAccountService(db)
	gameService := services.NewGameService(db)
	engineClient := services.NewEngineClient(cfg.EngineHost, cfg.EnginePort)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService, cfg.JWTSecret, cfg.JWTExpiration)
	userHandler := handlers.NewUserHandler(userService, accountService)
	gameHandler := handlers.NewGameHandler(gameService, accountService, engineClient)

	// Auth routes
	authRoutes := router.Group("/auth")
	{
		authRoutes.POST("/register", authHandler.Register)
		authRoutes.POST("/login", authHandler.Login)
		authRoutes.POST("/logout", authHandler.Logout)
	}

	// User routes (protected)
	userRoutes := router.Group("/user")
	userRoutes.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		userRoutes.GET("/profile", userHandler.GetProfile)
		userRoutes.PUT("/profile", userHandler.GetProfile)
		userRoutes.GET("/account", userHandler.GetAccount)
		userRoutes.GET("/account/transactions", userHandler.GetTransactionHistory)
		userRoutes.POST("/account/deposit", userHandler.Deposit)
		userRoutes.POST("/account/withdraw", userHandler.Withdraw)
	}

	// Game routes (protected)
	gameRoutes := router.Group("/games")
	gameRoutes.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		gameRoutes.GET("", gameHandler.GetGames)
		gameRoutes.POST("", gameHandler.CreateGame)
		gameRoutes.GET("/:id", gameHandler.GetGame)
		gameRoutes.POST("/:id/action", gameHandler.ExecuteAction)
	}

	// WebSocket route
	router.GET("/ws", handlers.HandleWebSocket(gameService, cfg.JWTSecret))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
