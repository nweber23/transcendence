package oauth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
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

func (o *GithubOauthProvider) GetLoginUrl(state string) string {
	var u url.URL

	u.Scheme = "https"
	u.Host = "github.com"
	u.Path = "login/oauth/authorize"
	q := u.Query()
	q.Set("client_id", o.clientId)
	q.Set("redirect_uri", o.redirectUri)
	q.Set("scope", "user:email")
	q.Set("state", state)
	u.RawQuery = q.Encode()
	return u.String()
}

type githubTokenResponse struct {
	AccessToken string `json:"access_token"`
	Error       string `json:"error"`
	ErrorDesc   string `json:"error_description"`
}

func (o *GithubOauthProvider) ExchangeCode(code string) (string, error) {
	body := make(url.Values)
	body.Add("code", code)
	body.Add("client_id", o.clientId)
	body.Add("client_secret", o.clientSecret)
	body.Add("redirect_uri", o.redirectUri)

	req, err := http.NewRequest("POST", "https://github.com/login/oauth/access_token", nil)
	if err != nil {
		return "", err
	}
	req.URL.RawQuery = body.Encode()
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var tokenResp githubTokenResponse
	if err := json.Unmarshal(raw, &tokenResp); err != nil {
		return "", err
	}
	if tokenResp.Error != "" || tokenResp.AccessToken == "" {
		return "", fmt.Errorf("github token exchange failed: %s (%s)", tokenResp.Error, tokenResp.ErrorDesc)
	}
	return tokenResp.AccessToken, nil
}

type githubUserResponse struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
	Email     string `json:"email"`
}

type githubEmailEntry struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

func (o *GithubOauthProvider) GetUser(token string) (*OauthUser, error) {
	client := &http.Client{}

	ghUser, err := fetchGithubJSON[githubUserResponse](client, token, "https://api.github.com/user")
	if err != nil {
		return nil, err
	}

	email := ghUser.Email
	if email == "" {
		emails, err := fetchGithubJSON[[]githubEmailEntry](client, token, "https://api.github.com/user/emails")
		if err != nil {
			return nil, err
		}
		for _, e := range *emails {
			if e.Primary && e.Verified {
				email = e.Email
				break
			}
		}
		if email == "" {
			return nil, fmt.Errorf("no verified primary email found on github account")
		}
	}

	return &OauthUser{
		ID:        strconv.FormatInt(ghUser.ID, 10),
		Username:  ghUser.Login,
		Email:     email,
		AvatarURL: ghUser.AvatarURL,
	}, nil
}

func fetchGithubJSON[T any](client *http.Client, token, url string) (*T, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api returned status %d", resp.StatusCode)
	}

	var result T
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}