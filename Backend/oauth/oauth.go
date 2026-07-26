package oauth

type OauthUser struct {
	ID        string
	Username  string
	Email     string
	AvatarURL string
}

type Provider interface {
	GetLoginUrl() string
	ExchangeCode(code string) (string, error)
	GetUser(token string) (*OauthUser, error)
}

