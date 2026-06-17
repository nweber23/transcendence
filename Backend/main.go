package main

import (
	"log"
	"os"

	"transcendence/config"
	"transcendence/handlers"
	"transcendence/middleware"
	"transcendence/services"
	"transcendence/ws"

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

	// Serve uploaded avatar files publicly (no auth required for <img> tags)
	router.Static("/uploads", "./uploads")

	// Initialize services
	userService := services.NewUserService(db)
	accountService := services.NewAccountService(db)
	friendService := services.NewFriendService(db)
	gameService := services.NewGameService(db)
	engineClient := services.NewEngineClient(cfg.EngineHost, cfg.EnginePort)

	// Initialize WebSockets
	wsState := ws.CreateWebSocketState(friendService)
	go wsState.Main()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService, cfg.JWTSecret, cfg.JWTExpiration)
	userHandler := handlers.NewUserHandler(userService, accountService, friendService, wsState)
	gameHandler := handlers.NewGameHandler(gameService, accountService, engineClient)
	wsHandler   := handlers.NewWebSocketHandler(wsState)

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
		userRoutes.PUT("/profile", userHandler.UpdateProfile)
		userRoutes.POST("/avatar", userHandler.UploadAvatar)
		userRoutes.GET("/account", userHandler.GetAccount)
		userRoutes.GET("/account/transactions", userHandler.GetTransactionHistory)
		userRoutes.POST("/account/deposit", userHandler.Deposit)
		userRoutes.POST("/account/withdraw", userHandler.Withdraw)
		userRoutes.POST("/:id/friends", userHandler.AddFriend)
		userRoutes.DELETE("/:id/friends", userHandler.RemoveFriend)
		userRoutes.GET("/friends", userHandler.EnumerateFriends)
		userRoutes.GET("/search", userHandler.SearchUsers)
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
	router.GET("/ws", middleware.AuthFix, middleware.AuthMiddleware(cfg.JWTSecret), wsHandler.UpgradeConnection)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
