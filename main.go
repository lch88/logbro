package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"

	"logbro/internal/buffer"
	"logbro/internal/parser"
	"logbro/internal/server"
)

var (
	Version = "dev"
)

func main() {
	port := flag.Int("port", 8080, "HTTP server port")
	bufSize := flag.Int("buffer", 10000, "Max log lines to buffer")
	noOpen := flag.Bool("no-open", false, "Don't auto-open browser")
	version := flag.Bool("version", false, "Show version")

	flag.Parse()

	if *version {
		fmt.Printf("logbro %s\n", Version)
		return
	}

	// Initialize components
	ringBuf := buffer.New(*bufSize)
	logParser := parser.New()
	srv := server.New(ringBuf, *port)

	// Start stdin reader
	go readStdin(ringBuf, logParser, srv.Hub())

	// Open browser
	if !*noOpen {
		go func() {
			openBrowser(fmt.Sprintf("http://localhost:%d", *port))
		}()
	}

	// Start server in goroutine
	go func() {
		if err := srv.Start(); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*1000000000) // 5 seconds
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Shutdown error: %v", err)
	}
}

func readStdin(buf *buffer.Ring, p *parser.Parser, hub *server.Hub) {
	scanner := bufio.NewScanner(os.Stdin)
	// Increase buffer size for long log lines
	const maxScanTokenSize = 1024 * 1024 // 1MB
	scanBuf := make([]byte, maxScanTokenSize)
	scanner.Buffer(scanBuf, maxScanTokenSize)

	for scanner.Scan() {
		line := scanner.Text()
		entry := p.Parse(line)
		entry = buf.Add(entry)
		hub.Broadcast(entry)
	}

	if err := scanner.Err(); err != nil {
		log.Printf("Stdin read error: %v", err)
	}

	hub.SetStdinClosed()
	log.Println("Stdin closed")
}

func openBrowser(url string) {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "darwin":
		cmd = "open"
		args = []string{url}
	case "linux":
		cmd = "xdg-open"
		args = []string{url}
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start", url}
	default:
		log.Printf("Unsupported platform for opening browser: %s", runtime.GOOS)
		return
	}

	if err := exec.Command(cmd, args...).Start(); err != nil {
		log.Printf("Failed to open browser: %v", err)
	}
}
