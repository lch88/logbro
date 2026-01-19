# ViewLog - Log Viewer Application Specification

## Overview

ViewLog is a command-line log viewer that reads log data from standard input and presents it through an interactive web interface. It enables developers and operators to pipe logs from any source and view them in a structured, filterable, and real-time streaming format.

## Usage Example

```bash
# Pipe logs directly
tail -f /var/log/app.log | viewlog

# From docker
docker logs -f container_name | viewlog

# From kubectl
kubectl logs -f pod_name | viewlog

# From any command
my-app serve 2>&1 | viewlog
```

## Architecture

```
┌─────────────┐     ┌─────────────────────────────────────────────┐
│   stdin     │────▶│              Go Backend                     │
│  (logs)     │     │  ┌─────────────┐  ┌──────────────────────┐  │
└─────────────┘     │  │ Log Parser  │  │   HTTP Server        │  │
                    │  │ & Buffer    │──│  - REST API          │  │
                    │  └─────────────┘  │  - WebSocket         │  │
                    │                   │  - Static Files      │  │
                    │                   └──────────────────────┘  │
                    └─────────────────────────────────────────────┘
                                              │
                                              ▼
                    ┌─────────────────────────────────────────────┐
                    │            Web Browser                      │
                    │  ┌─────────────────────────────────────┐    │
                    │  │  TanStack Start + shadcn/ui         │    │
                    │  │  - Real-time log stream view        │    │
                    │  │  - Filtering & Search               │    │
                    │  │  - Log level highlighting           │    │
                    │  └─────────────────────────────────────┘    │
                    └─────────────────────────────────────────────┘
```

## Core Features

### 1. Log Ingestion
- Read from stdin line by line
- Auto-detect common log formats:
  - Plain text
  - JSON (structured logs)
  - Common Log Format (CLF)
  - Combined Log Format
- Parse and extract metadata where possible:
  - Timestamp
  - Log level (DEBUG, INFO, WARN, ERROR, FATAL)
  - Source/Logger name
  - Message content

### 2. Log Storage (In-Memory Buffer)
- Ring buffer with configurable max size (default: 10,000 lines)
- Each log entry stored with:
  - Unique sequential ID
  - Raw content
  - Parsed fields (if applicable)
  - Ingestion timestamp

### 3. Web Interface
- Auto-opens browser on startup (configurable)
- Real-time log streaming with auto-scroll
- Pause/Resume streaming
- Log level color coding:
  - DEBUG: gray
  - INFO: default/white
  - WARN: yellow
  - ERROR: red
  - FATAL: red bold
- Timestamp display (toggleable)
- Line numbers
- Word wrap toggle
- Dark/Light theme support

### 4. Filtering & Search
- Full-text search across all log entries
- Filter by log level (multi-select)
- Regex search support
- Highlight matching terms
- Filter persistence during session

### 5. Additional Features
- Copy single log line to clipboard
- Copy all visible (filtered) logs
- Export logs to file (JSON/plain text)
- Keyboard shortcuts for common actions
- Connection status indicator

## Technical Specification

### Go Backend

#### CLI Flags
```
viewlog [flags]

Flags:
  -p, --port int        HTTP server port (default: 8080)
  -b, --buffer int      Max log lines to buffer (default: 10000)
  -n, --no-open         Don't auto-open browser
  -h, --help            Show help
  -v, --version         Show version
```

#### Data Models

```go
// LogEntry represents a single log line
type LogEntry struct {
    ID        uint64    `json:"id"`
    Timestamp time.Time `json:"timestamp"`    // When log was received
    Raw       string    `json:"raw"`          // Original log line
    Parsed    *ParsedLog `json:"parsed,omitempty"`
}

// ParsedLog contains extracted fields from structured logs
type ParsedLog struct {
    Time    *time.Time `json:"time,omitempty"`    // Log's own timestamp
    Level   string     `json:"level,omitempty"`   // DEBUG, INFO, WARN, ERROR, FATAL
    Message string     `json:"message,omitempty"` // Main message content
    Source  string     `json:"source,omitempty"`  // Logger name or source
    Fields  map[string]any `json:"fields,omitempty"` // Additional structured fields
}

// LogFilter for querying logs
type LogFilter struct {
    Search   string   `json:"search,omitempty"`   // Text search
    Levels   []string `json:"levels,omitempty"`   // Filter by levels
    Regex    bool     `json:"regex,omitempty"`    // Treat search as regex
    AfterId  uint64   `json:"afterId,omitempty"`  // For pagination/streaming
    Limit    int      `json:"limit,omitempty"`    // Max results
}
```

#### REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/status` | Server status (buffer size, total logs, etc.) |
| GET | `/api/logs` | Get buffered logs with optional filters |
| DELETE | `/api/logs` | Clear log buffer |
| GET | `/api/config` | Get current configuration |

##### GET /api/logs

Query Parameters:
- `search` (string): Text to search for
- `levels` (string): Comma-separated log levels to include
- `regex` (boolean): Treat search as regex
- `afterId` (uint64): Return logs after this ID
- `limit` (int): Max number of logs to return (default: 1000)

Response:
```json
{
  "logs": [...],
  "total": 5000,
  "hasMore": true
}
```

##### GET /api/status

Response:
```json
{
  "bufferSize": 10000,
  "bufferUsed": 4523,
  "totalReceived": 15234,
  "uptime": "2h15m30s",
  "stdinOpen": true
}
```

#### WebSocket Endpoint

| Endpoint | Description |
|----------|-------------|
| `/ws/logs` | Real-time log streaming |

##### WebSocket Protocol

Client → Server Messages:
```json
{
  "type": "subscribe",
  "filter": {
    "levels": ["ERROR", "WARN"],
    "search": "database"
  }
}
```

```json
{
  "type": "unsubscribe"
}
```

```json
{
  "type": "ping"
}
```

Server → Client Messages:
```json
{
  "type": "log",
  "data": {
    "id": 1234,
    "timestamp": "2024-01-15T10:30:00Z",
    "raw": "2024-01-15 10:30:00 ERROR database connection failed",
    "parsed": {
      "time": "2024-01-15T10:30:00Z",
      "level": "ERROR",
      "message": "database connection failed"
    }
  }
}
```

```json
{
  "type": "status",
  "data": {
    "stdinOpen": true,
    "bufferUsed": 4523
  }
}
```

```json
{
  "type": "pong"
}
```

### Frontend (TanStack Start + shadcn/ui)

#### Pages
- `/` - Main log viewer (single page application)

#### Components
- `LogViewer` - Main container component
- `LogToolbar` - Search, filter controls, actions
- `LogList` - Virtualized log line list
- `LogLine` - Individual log entry display
- `FilterPanel` - Level filters, regex toggle
- `StatusBar` - Connection status, stats
- `SettingsDialog` - Theme, display preferences

#### State Management
- TanStack Query for REST API calls
- React state for WebSocket connection and real-time logs
- Local storage for user preferences (theme, filters)

#### Key Dependencies
```json
{
  "@tanstack/react-start": "latest",
  "@tanstack/react-query": "latest",
  "@tanstack/react-virtual": "latest",
  "tailwindcss": "latest",
  "shadcn/ui": "latest"
}
```

## Build & Distribution

### Development
```bash
# Backend
cd backend && go run .

# Frontend (separate terminal)
cd frontend && npm run dev
```

### Production Build
- Frontend builds to static files
- Static files embedded in Go binary using `embed`
- Single binary distribution

```bash
# Build produces single binary
go build -o viewlog

# Usage
./viewlog
```

## Project Structure

```
viewlog/
├── main.go                 # Entry point
├── internal/
│   ├── server/
│   │   ├── server.go       # HTTP server setup
│   │   ├── handlers.go     # REST API handlers
│   │   └── websocket.go    # WebSocket handling
│   ├── buffer/
│   │   └── ring.go         # Ring buffer implementation
│   ├── parser/
│   │   └── parser.go       # Log parsing logic
│   └── models/
│       └── models.go       # Data structures
├── frontend/
│   ├── app/
│   │   ├── routes/
│   │   │   └── index.tsx   # Main page
│   │   ├── components/
│   │   │   ├── log-viewer.tsx
│   │   │   ├── log-toolbar.tsx
│   │   │   ├── log-list.tsx
│   │   │   ├── log-line.tsx
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── use-websocket.ts
│   │   │   └── use-logs.ts
│   │   └── lib/
│   │       └── api.ts
│   ├── package.json
│   └── tsconfig.json
├── go.mod
├── go.sum
├── SPEC.md
└── README.md
```

## Future Considerations (Out of Scope for v1)

- Multiple input sources (file watching, TCP/UDP listeners)
- Log persistence to disk
- Multiple simultaneous viewers with shared state
- Log annotations/bookmarks
- Alert rules (notify on pattern match)
- Log aggregation from multiple sources
- Authentication for exposed servers
