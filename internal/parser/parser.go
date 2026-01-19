package parser

import (
	"encoding/json"
	"regexp"
	"strings"
	"time"

	"logbro/internal/models"
)

// Common log level patterns
var levelPatterns = map[string]*regexp.Regexp{
	"DEBUG": regexp.MustCompile(`(?i)\b(DEBUG|DBG)\b`),
	"INFO":  regexp.MustCompile(`(?i)\b(INFO|INF)\b`),
	"WARN":  regexp.MustCompile(`(?i)\b(WARN|WARNING|WRN)\b`),
	"ERROR": regexp.MustCompile(`(?i)\b(ERROR|ERR)\b`),
	"FATAL": regexp.MustCompile(`(?i)\b(FATAL|CRITICAL|CRIT|PANIC)\b`),
}

// Level priority for ordering (higher = more severe)
var levelPriority = map[string]int{
	"DEBUG": 1,
	"INFO":  2,
	"WARN":  3,
	"ERROR": 4,
	"FATAL": 5,
}

// Common timestamp patterns
var timestampPatterns = []struct {
	pattern *regexp.Regexp
	layout  string
}{
	{regexp.MustCompile(`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?`), time.RFC3339},
	{regexp.MustCompile(`\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?`), "2006-01-02 15:04:05"},
	{regexp.MustCompile(`\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2}`), "02/Jan/2006:15:04:05"},
	{regexp.MustCompile(`\w{3} +\d{1,2} \d{2}:\d{2}:\d{2}`), "Jan  2 15:04:05"},
}

// Parser handles log line parsing
type Parser struct{}

// New creates a new parser instance
func New() *Parser {
	return &Parser{}
}

// Parse analyzes a log line and extracts metadata
func (p *Parser) Parse(line string) models.LogEntry {
	entry := models.LogEntry{
		Timestamp: time.Now(),
		Raw:       line,
	}

	// Try JSON first
	if parsed := p.parseJSON(line); parsed != nil {
		entry.Parsed = parsed
		return entry
	}

	// Fall back to pattern matching
	entry.Parsed = p.parseText(line)
	return entry
}

func (p *Parser) parseJSON(line string) *models.ParsedLog {
	line = strings.TrimSpace(line)
	if !strings.HasPrefix(line, "{") {
		return nil
	}

	var data map[string]any
	if err := json.Unmarshal([]byte(line), &data); err != nil {
		return nil
	}

	parsed := &models.ParsedLog{
		Fields: make(map[string]any),
	}

	// Extract known fields (level)
	for _, key := range []string{"level", "lvl", "severity", "log.level"} {
		if v, ok := data[key]; ok {
			if s, ok := v.(string); ok {
				parsed.Level = normalizeLevel(s)
				delete(data, key)
				break
			}
		}
	}

	// Extract message
	for _, key := range []string{"msg", "message", "text", "log"} {
		if v, ok := data[key]; ok {
			if s, ok := v.(string); ok {
				parsed.Message = s
				delete(data, key)
				break
			}
		}
	}

	// Extract timestamp
	for _, key := range []string{"time", "timestamp", "ts", "@timestamp", "datetime"} {
		if v, ok := data[key]; ok {
			switch tv := v.(type) {
			case string:
				if t, err := time.Parse(time.RFC3339, tv); err == nil {
					parsed.Time = &t
				} else if t, err := time.Parse(time.RFC3339Nano, tv); err == nil {
					parsed.Time = &t
				}
			case float64:
				// Unix timestamp (seconds or milliseconds)
				if tv > 1e12 {
					// Milliseconds
					t := time.UnixMilli(int64(tv))
					parsed.Time = &t
				} else {
					// Seconds
					t := time.Unix(int64(tv), 0)
					parsed.Time = &t
				}
			}
			delete(data, key)
			break
		}
	}

	// Extract source/logger
	for _, key := range []string{"logger", "source", "name", "caller", "component"} {
		if v, ok := data[key]; ok {
			if s, ok := v.(string); ok {
				parsed.Source = s
				delete(data, key)
				break
			}
		}
	}

	// Store remaining fields
	if len(data) > 0 {
		parsed.Fields = data
	}

	return parsed
}

func (p *Parser) parseText(line string) *models.ParsedLog {
	parsed := &models.ParsedLog{
		Message: line,
	}

	// Extract level - find the highest priority level that matches
	highestPriority := 0
	for level, pattern := range levelPatterns {
		if pattern.MatchString(line) {
			if priority := levelPriority[level]; priority > highestPriority {
				highestPriority = priority
				parsed.Level = level
			}
		}
	}

	// Extract timestamp
	for _, tp := range timestampPatterns {
		if match := tp.pattern.FindString(line); match != "" {
			if t, err := time.Parse(tp.layout, match); err == nil {
				// Adjust year for syslog format that doesn't include year
				if t.Year() == 0 {
					t = t.AddDate(time.Now().Year(), 0, 0)
				}
				parsed.Time = &t
			}
			break
		}
	}

	return parsed
}

func normalizeLevel(level string) string {
	level = strings.ToUpper(strings.TrimSpace(level))
	switch level {
	case "DBG", "TRACE":
		return "DEBUG"
	case "INF", "INFORMATION":
		return "INFO"
	case "WRN", "WARNING":
		return "WARN"
	case "ERR":
		return "ERROR"
	case "CRIT", "CRITICAL", "PANIC":
		return "FATAL"
	default:
		// Return as-is if it's a known level
		if _, ok := levelPriority[level]; ok {
			return level
		}
		return level
	}
}
