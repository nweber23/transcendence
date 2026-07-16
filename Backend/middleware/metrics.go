package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/shopspring/decimal"
)

var (
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total HTTP requests processed, labeled by method, route and status code.",
		},
		[]string{"method", "path", "status"},
	)

	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency in seconds, labeled by method and route.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	// ActiveConnections tracks open WebSocket connections. Incremented in
	// ws.AddConnection and decremented in ws.cleanupConnection.
	ActiveConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_connections",
			Help: "Number of currently open WebSocket connections.",
		},
	)

	// Business counters backing the "Transcendence Overview" Grafana dashboard.
	AccountsCreatedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "accounts_created_total",
			Help: "Total number of accounts registered.",
		},
	)

	LoginsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "logins_total",
			Help: "Total login attempts, labeled by result (success/failure).",
		},
		[]string{"result"},
	)

	DepositsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "deposits_total",
			Help: "Total number of successful deposits.",
		},
	)

	DepositAmountTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "deposit_amount_total",
			Help: "Total amount deposited across all accounts.",
		},
	)

	WithdrawalsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "withdrawals_total",
			Help: "Total number of successful withdrawals.",
		},
	)

	WithdrawalAmountTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "withdrawal_amount_total",
			Help: "Total amount withdrawn across all accounts.",
		},
	)
)

// PrometheusMiddleware records request counts and latency for every request
// handled by the router. Route pattern (c.FullPath()) is used as the path
// label instead of the raw URL so per-request IDs don't create unbounded
// label cardinality; unmatched routes (404s) fall back to "unmatched".
func PrometheusMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		path := c.FullPath()
		if path == "" {
			path = "unmatched"
		}
		status := strconv.Itoa(c.Writer.Status())

		HTTPRequestsTotal.WithLabelValues(c.Request.Method, path, status).Inc()
		HTTPRequestDuration.WithLabelValues(c.Request.Method, path).Observe(time.Since(start).Seconds())
	}
}

// RecordDeposit and RecordWithdrawal take decimal.Decimal directly since
// that's the type the account/transaction models use throughout the
// codebase (github.com/shopspring/decimal) -- avoids float64 rounding at
// the call site for a value that's ultimately just observed as a counter.
func RecordDeposit(amount decimal.Decimal) {
	DepositsTotal.Inc()
	DepositAmountTotal.Add(amount.InexactFloat64())
}

func RecordWithdrawal(amount decimal.Decimal) {
	WithdrawalsTotal.Inc()
	WithdrawalAmountTotal.Add(amount.InexactFloat64())
}
