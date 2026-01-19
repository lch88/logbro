package server

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/lch88/logbro/internal/models"
)

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	capacity, used, totalReceived := s.buffer.Stats()

	resp := models.StatusResponse{
		BufferSize:    capacity,
		BufferUsed:    used,
		TotalReceived: totalReceived,
		Uptime:        s.Uptime().Round(time.Second).String(),
		StdinOpen:     s.hub.IsStdinOpen(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *Server) handleGetLogs(w http.ResponseWriter, r *http.Request) {
	filter := models.LogFilter{
		Search: r.URL.Query().Get("search"),
		Regex:  r.URL.Query().Get("regex") == "true",
	}

	if levels := r.URL.Query().Get("levels"); levels != "" {
		filter.Levels = strings.Split(levels, ",")
	}

	if afterID := r.URL.Query().Get("afterId"); afterID != "" {
		if id, err := strconv.ParseUint(afterID, 10, 64); err == nil {
			filter.AfterID = id
		}
	}

	if limit := r.URL.Query().Get("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil {
			filter.Limit = l
		}
	}

	resp := s.buffer.Query(filter)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *Server) handleClearLogs(w http.ResponseWriter, r *http.Request) {
	s.buffer.Clear()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "cleared"})
}
