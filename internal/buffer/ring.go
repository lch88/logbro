package buffer

import (
	"regexp"
	"strings"
	"sync"

	"logbro/internal/models"
)

// Ring is a thread-safe ring buffer for log entries
type Ring struct {
	mu            sync.RWMutex
	entries       []models.LogEntry
	capacity      int
	head          int    // next write position
	count         int    // current number of entries
	totalReceived uint64 // total logs received (monotonic ID source)
}

// New creates a new ring buffer with given capacity
func New(capacity int) *Ring {
	return &Ring{
		entries:  make([]models.LogEntry, capacity),
		capacity: capacity,
	}
}

// Add inserts a new log entry, overwriting oldest if full
// Returns the entry with its assigned ID
func (r *Ring) Add(entry models.LogEntry) models.LogEntry {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.totalReceived++
	entry.ID = r.totalReceived

	r.entries[r.head] = entry
	r.head = (r.head + 1) % r.capacity

	if r.count < r.capacity {
		r.count++
	}

	return entry
}

// GetAll returns all entries in chronological order
func (r *Ring) GetAll() []models.LogEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.count == 0 {
		return []models.LogEntry{}
	}

	result := make([]models.LogEntry, r.count)
	start := 0
	if r.count == r.capacity {
		start = r.head // oldest entry is at head when buffer is full
	}
	for i := 0; i < r.count; i++ {
		idx := (start + i) % r.capacity
		result[i] = r.entries[idx]
	}
	return result
}

// Query returns filtered entries
func (r *Ring) Query(filter models.LogFilter) models.LogResponse {
	all := r.GetAll()

	var filtered []models.LogEntry
	var searchRegex *regexp.Regexp

	if filter.Regex && filter.Search != "" {
		var err error
		searchRegex, err = regexp.Compile(filter.Search)
		if err != nil {
			// Invalid regex, treat as literal string
			searchRegex = nil
		}
	}

	searchLower := strings.ToLower(filter.Search)

	for _, entry := range all {
		// Skip entries before afterID
		if filter.AfterID > 0 && entry.ID <= filter.AfterID {
			continue
		}

		// Filter by level
		if len(filter.Levels) > 0 {
			if entry.Parsed == nil || !containsLevel(filter.Levels, entry.Parsed.Level) {
				continue
			}
		}

		// Filter by search
		if filter.Search != "" {
			if searchRegex != nil {
				if !searchRegex.MatchString(entry.Raw) {
					continue
				}
			} else if !strings.Contains(strings.ToLower(entry.Raw), searchLower) {
				continue
			}
		}

		filtered = append(filtered, entry)
	}

	total := len(filtered)
	limit := filter.Limit
	if limit <= 0 {
		limit = 1000
	}

	hasMore := len(filtered) > limit
	if hasMore {
		filtered = filtered[:limit]
	}

	if filtered == nil {
		filtered = []models.LogEntry{}
	}

	return models.LogResponse{
		Logs:    filtered,
		Total:   total,
		HasMore: hasMore,
	}
}

// Stats returns buffer statistics
func (r *Ring) Stats() (capacity, used int, totalReceived uint64) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.capacity, r.count, r.totalReceived
}

// Clear removes all entries from the buffer
func (r *Ring) Clear() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.head = 0
	r.count = 0
	// Note: totalReceived is not reset to maintain monotonic IDs
}

func containsLevel(levels []string, level string) bool {
	for _, l := range levels {
		if strings.EqualFold(l, level) {
			return true
		}
	}
	return false
}
