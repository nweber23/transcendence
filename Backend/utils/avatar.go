package utils

import (
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	maxAvatarBytes    = 5 * 1024 * 1024 // 5MB
	maxAvatarRedirects = 5
)

var AvatarContentTypeExtensions = map[string]string{
	"image/jpeg": ".jpg",
	"image/jpg":  ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

var errUnsafeAvatarURL = errors.New("avatar url is not safe to fetch")

// DetectAvatarExtension sniffs an image's actual content (its magic bytes,
// via http.DetectContentType) and returns the safe extension to store it
// under, rejecting anything that isn't one of the known image types. This
// must be used instead of trusting a client-supplied filename extension or
// a remote server's Content-Type header, neither of which is verified
// against what the file actually contains — an attacker-controlled
// extension/header can smuggle an HTML/SVG payload that gets served back
// with a browser-executable Content-Type.
func DetectAvatarExtension(data []byte) (string, error) {
	contentType := strings.Split(http.DetectContentType(data), ";")[0]
	ext, ok := AvatarContentTypeExtensions[contentType]
	if !ok {
		return "", ErrUnsupportedAvatarType
	}
	return ext, nil
}

// validateAvatarURL guards against SSRF: it requires HTTPS and rejects any
// hostname that resolves to a loopback, private, link-local (this includes
// cloud metadata endpoints like 169.254.169.254), or otherwise non-public
// address. Called both on the initial URL and on every redirect hop, since a
// same-origin-looking URL can still redirect into the internal network.
func validateAvatarURL(rawURL string) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return errUnsafeAvatarURL
	}
	if u.Scheme != "https" {
		return errUnsafeAvatarURL
	}
	host := u.Hostname()
	if host == "" {
		return errUnsafeAvatarURL
	}

	ips, err := net.LookupIP(host)
	if err != nil || len(ips) == 0 {
		return errUnsafeAvatarURL
	}
	for _, ip := range ips {
		if !ip.IsGlobalUnicast() ||
			ip.IsLoopback() ||
			ip.IsPrivate() ||
			ip.IsLinkLocalUnicast() ||
			ip.IsLinkLocalMulticast() ||
			ip.IsUnspecified() ||
			ip.IsMulticast() {
			return errUnsafeAvatarURL
		}
	}
	return nil
}

// DownloadAvatarToUploads fetches the image at rawURL and saves it under
// uploadsDir with a random filename, returning the filename (not a full
// path) so it can be stored the same way as locally uploaded avatars.
func DownloadAvatarToUploads(rawURL string, uploadsDir string) (string, error) {
	if err := validateAvatarURL(rawURL); err != nil {
		return "", err
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= maxAvatarRedirects {
				return fmt.Errorf("too many redirects")
			}
			return validateAvatarURL(req.URL.String())
		},
	}

	resp, err := client.Get(rawURL)
	if err != nil {
		return "", ErrAvatarDownloadFailed
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", ErrAvatarDownloadFailed
	}

	limited := io.LimitReader(resp.Body, maxAvatarBytes+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return "", ErrAvatarDownloadFailed
	}
	if len(data) > maxAvatarBytes {
		return "", ErrAvatarTooLarge
	}

	ext, err := DetectAvatarExtension(data)
	if err != nil {
		return "", err
	}

	if err := os.MkdirAll(uploadsDir, os.ModePerm); err != nil {
		return "", err
	}

	var filename string
	for {
		name, err := GetRandomHexString(16)
		if err != nil {
			return "", ErrRandomStringGenFailed
		}
		candidate := name + ext
		if _, err := os.Stat(filepath.Join(uploadsDir, candidate)); os.IsNotExist(err) {
			filename = candidate
			break
		}
	}

	if err := os.WriteFile(filepath.Join(uploadsDir, filename), data, 0o644); err != nil {
		return "", err
	}
	return filename, nil
}
