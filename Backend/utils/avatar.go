package utils

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const maxAvatarBytes = 5 * 1024 * 1024 // 5MB

var avatarContentTypeExtensions = map[string]string{
	"image/jpeg": ".jpg",
	"image/jpg":  ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

// DownloadAvatarToUploads fetches the image at url and saves it under
// uploadsDir with a random filename, returning the filename (not a full
// path) so it can be stored the same way as locally uploaded avatars.
func DownloadAvatarToUploads(url string, uploadsDir string) (string, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	resp, err := client.Get(url)
	if err != nil {
		return "", ErrAvatarDownloadFailed
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", ErrAvatarDownloadFailed
	}

	ext := avatarContentTypeExtensions[strings.ToLower(strings.Split(resp.Header.Get("Content-Type"), ";")[0])]
	if ext == "" {
		ext = ".jpg"
	}

	limited := io.LimitReader(resp.Body, maxAvatarBytes+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return "", ErrAvatarDownloadFailed
	}
	if len(data) > maxAvatarBytes {
		return "", ErrAvatarTooLarge
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
