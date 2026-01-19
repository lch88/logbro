# LogBro - Log Viewer Application Specification

## Overview

LogBro is a command-line log viewer that reads log data from standard input and presents it through an interactive web interface. It enables developers and operators to pipe logs from any source and view them in a structured, filterable, and real-time streaming format.

## Usage Example

```bash
# Pipe logs directly
tail -f /var/log/app.log | logbro

# From docker
docker logs -f container_name | logbro

# From kubectl
kubectl logs -f pod_name | logbro

# From any command
my-app serve 2>&1 | logbro
```

## Tech Stack

### Backend
- **Language:** Go 1.25+
- **HTTP Server:** Go standard library `net/http`
- **WebSocket:** `github.com/gorilla/websocket`
- **Static Files:** Embedded using Go `embed` directive

### Frontend
- **Build Tool:** Vite 7.x
- **Framework:** React 19.x
- **Routing:** TanStack React Router
- **Styling:** TailwindCSS 4.x
- **UI Components:** shadcn/ui (built on Radix UI primitives)
- **Virtualization:** TanStack React Virtual
- **Icons:** Lucide React
- **Package Manager:** Bun

### Development Tools
- **Task Runner:** Taskfile
- **Release:** GoReleaser
- **Linting:** ESLint, Prettier

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
                    │  │  React + TanStack Router            │    │
                    │  │  - Real-time log stream view        │    │
                    │  │  - Filtering & Search               │    │
                    │  │  - Log level highlighting           │    │
                    │  │  - Virtualized log rendering        │    │
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
- Auto-opens browser on startup (configurable with `-no-open` flag)
- Real-time log streaming via WebSocket with auto-scroll
- Pause/Resume streaming
- Scroll-to-bottom button when scrolled up
- Log level color coding:
  - DEBUG: gray
  - INFO: default/white
  - WARN: yellow
  - ERROR: red
  - FATAL: red bold
- Line numbers
- Virtualized rendering for large log volumes (TanStack Virtual)

### 4. Filtering & Search
- Full-text search across all log entries
- Filter by log level (multi-select checkboxes)
- Regex search support (toggleable)
- Highlight matching search terms
- Client-side filtering with server-side WebSocket filter subscription

### 5. Additional Features
- Double-click to copy log line to clipboard
- Clear logs action
- Connection status indicator (WebSocket state)
- Stdin stream status (streaming/ended)
- Log count display

## Technical Specification

### Go Backend

#### CLI Flags
```
logbro [flags]

Flags:
  -port int        HTTP server port (default: 8080)
  -buffer int      Max log lines to buffer (default: 10000)
  -no-open         Don't auto-open browser
  -dev             Development mode (disable static file serving)
  -version         Show version
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

### Frontend (React + Vite)

#### Pages
- `/` - Main log viewer (single page application)

#### Components
- `LogViewer` - Main orchestrator component
- `LogToolbar` - Search, filter controls, actions
- `LogList` - Virtualized log line list (TanStack Virtual)
- `LogLine` - Individual log entry with level coloring and highlighting
- `StatusBar` - Connection status, stdin status, log count

#### Hooks
- `use-logs` - Log state management, filtering logic
- `use-websocket` - WebSocket connection, reconnection handling, message processing

#### State Management
- React `useState` and `useCallback` for local state
- Custom hooks for log and WebSocket state
- No external state management library

#### Key Dependencies
```json
{
  "@tanstack/react-router": "^1.132.0",
  "@tanstack/react-virtual": "^3.13.18",
  "react": "^19.2.0",
  "tailwindcss": "^4.0.6",
  "lucide-react": "^0.562.0"
}
```

#### UI Components (shadcn/ui)
- Button, Input, Checkbox, Badge
- Popover (for filter dropdown)
- Built on Radix UI primitives

## Build & Distribution

### Development
```bash
# Run both backend and frontend with hot-reload
task dev

# Backend only (for piping logs)
task dev:backend

# Frontend only (Vite dev server)
task dev:frontend
```

Development mode:
- Backend runs on port 8080 with `-dev` flag (no static file serving)
- Frontend runs on port 8081 (Vite dev server)
- Vite proxies API/WebSocket requests to backend

### Production Build
- Frontend builds to static files in `frontend/dist/`
- Static files embedded in Go binary using `//go:embed` directive
- Single binary distribution

```bash
# Full build (frontend + backend)
task build

# Usage
./logbro
```

### Release
- GoReleaser for cross-platform builds and releases
- Homebrew tap available

## Project Structure

```
logbro/
├── cmd/
│   └── logbro/
│       └── main.go             # Entry point, stdin reader, browser opener
├── internal/
│   ├── server/
│   │   ├── server.go           # HTTP server setup, static file embedding
│   │   ├── handlers.go         # REST API handlers
│   │   └── websocket.go        # WebSocket hub and client management
│   ├── buffer/
│   │   └── ring.go             # Ring buffer with filtering
│   ├── parser/
│   │   └── parser.go           # Log parsing (JSON, text patterns)
│   └── models/
│       └── models.go           # Data structures
├── frontend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── __root.tsx      # Root layout wrapper
│   │   │   └── index.tsx       # Main page
│   │   ├── components/
│   │   │   ├── log-viewer.tsx
│   │   │   ├── log-toolbar.tsx
│   │   │   ├── log-list.tsx
│   │   │   ├── log-line.tsx
│   │   │   ├── status-bar.tsx
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── hooks/
│   │   │   ├── use-websocket.ts
│   │   │   └── use-logs.ts
│   │   ├── lib/
│   │   │   ├── api.ts          # REST API client
│   │   │   └── utils.ts
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── vite.config.ts
│   ├── components.json         # shadcn/ui config
│   ├── package.json
│   └── index.html
├── taskfile.yml                # Task automation
├── .goreleaser.yaml            # Release configuration
├── go.mod
├── go.sum
├── SPEC.md
└── README.md
```

## Future Considerations (Out of Scope for v1)

- Dark/Light theme toggle
- Timestamp display toggle
- Word wrap toggle
- Export logs to file (JSON/plain text)
- Keyboard shortcuts
- Multiple input sources (file watching, TCP/UDP listeners)
- Log persistence to disk
- Multiple simultaneous viewers with shared state
- Log annotations/bookmarks
- Alert rules (notify on pattern match)
- Log aggregation from multiple sources
- Authentication for exposed servers
