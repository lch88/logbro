package models

import "time"

// LogEntry represents a single log line
type LogEntry struct {
	ID        uint64     `json:"id"`
	Timestamp time.Time  `json:"timestamp"`
	Raw       string     `json:"raw"`
	Parsed    *ParsedLog `json:"parsed,omitempty"`
}

// ParsedLog contains extracted fields from structured logs
type ParsedLog struct {
	Time    *time.Time     `json:"time,omitempty"`
	Level   string         `json:"level,omitempty"`
	Message string         `json:"message,omitempty"`
	Source  string         `json:"source,omitempty"`
	Fields  map[string]any `json:"fields,omitempty"`
}

// LogFilter for querying logs
type LogFilter struct {
	Search  string   `json:"search,omitempty"`
	Levels  []string `json:"levels,omitempty"`
	Regex   bool     `json:"regex,omitempty"`
	AfterID uint64   `json:"afterId,omitempty"`
	Limit   int      `json:"limit,omitempty"`
}

// LogResponse is the REST API response for log queries
type LogResponse struct {
	Logs    []LogEntry `json:"logs"`
	Total   int        `json:"total"`
	HasMore bool       `json:"hasMore"`
}

// StatusResponse for /api/status endpoint
type StatusResponse struct {
	BufferSize    int    `json:"bufferSize"`
	BufferUsed    int    `json:"bufferUsed"`
	TotalReceived uint64 `json:"totalReceived"`
	Uptime        string `json:"uptime"`
	StdinOpen     bool   `json:"stdinOpen"`
}

// WSMessage represents WebSocket messages sent from server to client
type WSMessage struct {
	Type string `json:"type"`
	Data any    `json:"data,omitempty"`
}

// WSClientMessage represents WebSocket messages from client to server
type WSClientMessage struct {
	Type   string    `json:"type"`
	Filter LogFilter `json:"filter,omitempty"`
}
