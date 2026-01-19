package server

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"time"

	"github.com/lch88/logbro/internal/buffer"
)

//go:embed static/*
var staticFiles embed.FS

// Server handles HTTP requests
type Server struct {
	httpServer *http.Server
	buffer     *buffer.Ring
	hub        *Hub
	startTime  time.Time
	port       int
}

// New creates a new server instance
func New(buf *buffer.Ring, port int) *Server {
	s := &Server{
		buffer:    buf,
		hub:       NewHub(),
		startTime: time.Now(),
		port:      port,
	}

	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("GET /api/health", s.handleHealth)
	mux.HandleFunc("GET /api/status", s.handleStatus)
	mux.HandleFunc("GET /api/logs", s.handleGetLogs)
	mux.HandleFunc("DELETE /api/logs", s.handleClearLogs)

	// WebSocket
	mux.HandleFunc("GET /ws/logs", s.handleWebSocket)

	// Static files (embedded frontend) - SPA with fallback to index.html
	staticFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Printf("Warning: could not load static files: %v", err)
		// Serve a simple placeholder if static files aren't embedded
		mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/html")
			w.Write([]byte(`<!DOCTYPE html>
<html>
<head><title>LogBro</title></head>
<body>
<h1>LogBro</h1>
<p>Frontend not embedded. Run with embedded frontend or start frontend dev server.</p>
</body>
</html>`))
		})
	} else {
		// SPA handler: serve static files, fallback to index.html for client-side routing
		mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path
			if path == "/" {
				path = "/index.html"
			}

			// Try to open the file
			file, err := staticFS.Open(path[1:]) // Remove leading /
			if err != nil {
				// File not found, serve index.html for SPA routing
				indexFile, _ := staticFS.Open("index.html")
				if indexFile != nil {
					defer indexFile.Close()
					w.Header().Set("Content-Type", "text/html")
					content, _ := fs.ReadFile(staticFS, "index.html")
					w.Write(content)
					return
				}
				http.NotFound(w, r)
				return
			}
			file.Close()

			// File exists, serve it with the file server
			http.FileServer(http.FS(staticFS)).ServeHTTP(w, r)
		})
	}

	s.httpServer = &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: mux,
	}

	return s
}

// Hub returns the WebSocket hub
func (s *Server) Hub() *Hub {
	return s.hub
}

// Port returns the server port
func (s *Server) Port() int {
	return s.port
}

// Start begins serving HTTP requests (blocking)
func (s *Server) Start() error {
	go s.hub.Run()
	log.Printf("Server starting on http://localhost:%d", s.port)
	if err := s.httpServer.ListenAndServe(); err != http.ErrServerClosed {
		return fmt.Errorf("HTTP server error: %w", err)
	}
	return nil
}

// Shutdown gracefully stops the server
func (s *Server) Shutdown(ctx context.Context) error {
	return s.httpServer.Shutdown(ctx)
}

// Uptime returns server uptime duration
func (s *Server) Uptime() time.Duration {
	return time.Since(s.startTime)
}
