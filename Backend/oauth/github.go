package oauth

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type GithubOauthProvider struct {
	clientSecret string
	clientId     string
	redirectUri  string
}

func NewGitHubProvider(clientId string, clientSecret string, redirectUri string) Provider {
	return &GithubOauthProvider{
		clientSecret: clientSecret,
		clientId:     clientId,
		redirectUri:  redirectUri,
	}
}

func (o *GithubOauthProvider) GetLoginUrl() string {
	var url url.URL

	url.Scheme = "https"
	url.Host = "github.com"
	url.Path = "login/oauth/authorize"
	q := url.Query()
	q.Set("client_id", o.clientId)
	q.Set("redirect_uri", o.redirectUri)
	q.Set("scope", "user&user:email")
	url.RawQuery = q.Encode()
	return url.String()
}

func (o *GithubOauthProvider) ExchangeCode(code string) (string, error) {
	// TODO: add "Accept: application/json" header and handle response better :)

	body := make(url.Values)
	body.Add("code", code)
	body.Add("client_id", o.clientId)
	body.Add("client_secret", o.clientSecret)
	resp, err := http.PostForm("https://github.com/login/oauth/access_token", body)
	if err != nil {
		return "", err
	}
	res, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(res), nil
}

func (o *GithubOauthProvider) GetUser(token string) (*OauthUser, error) {
	client := &http.Client{}

	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Authorization", fmt.Sprintf("Bearer: %s", token))
	_, err = client.Do(req)
	if err != nil {
		return nil, err
	}
	return nil, nil
	// parse resp :)
}
