package server

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/lch88/logbro/internal/models"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// Client represents a WebSocket client
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	filter models.LogFilter
	mu     sync.Mutex
}

// Hub manages WebSocket clients and broadcasting
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan models.LogEntry
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
	stdinOpen  bool
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan models.LogEntry, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		stdinOpen:  true,
	}
}

// Run starts the hub's event loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()

		case entry := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				client.mu.Lock()
				filter := client.filter
				client.mu.Unlock()

				if h.matchesFilter(entry, filter) {
					msg := models.WSMessage{Type: "log", Data: entry}
					data, _ := json.Marshal(msg)
					select {
					case client.send <- data:
					default:
						// Client too slow, skip this message
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast sends a log entry to all subscribed clients
func (h *Hub) Broadcast(entry models.LogEntry) {
	select {
	case h.broadcast <- entry:
	default:
		// Channel full, drop message
	}
}

// SetStdinClosed marks stdin as closed and notifies all clients
func (h *Hub) SetStdinClosed() {
	h.mu.Lock()
	h.stdinOpen = false
	h.mu.Unlock()

	// Notify all clients
	msg := models.WSMessage{
		Type: "status",
		Data: map[string]bool{"stdinOpen": false},
	}
	data, _ := json.Marshal(msg)

	h.mu.RLock()
	for client := range h.clients {
		select {
		case client.send <- data:
		default:
		}
	}
	h.mu.RUnlock()
}

// IsStdinOpen returns whether stdin is still open
func (h *Hub) IsStdinOpen() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.stdinOpen
}

func (h *Hub) matchesFilter(entry models.LogEntry, filter models.LogFilter) bool {
	// If no filter, match all
	if len(filter.Levels) == 0 && filter.Search == "" {
		return true
	}

	// Check level filter
	if len(filter.Levels) > 0 {
		if entry.Parsed == nil || entry.Parsed.Level == "" {
			return false
		}
		found := false
		for _, l := range filter.Levels {
			if strings.EqualFold(l, entry.Parsed.Level) {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	// Check search filter (simple case-insensitive contains)
	if filter.Search != "" {
		if !strings.Contains(strings.ToLower(entry.Raw), strings.ToLower(filter.Search)) {
			return false
		}
	}

	return true
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:  s.hub,
		conn: conn,
		send: make(chan []byte, 256),
	}

	s.hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512 * 1024)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var msg models.WSClientMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		switch msg.Type {
		case "subscribe":
			c.mu.Lock()
			c.filter = msg.Filter
			c.mu.Unlock()
		case "unsubscribe":
			c.mu.Lock()
			c.filter = models.LogFilter{}
			c.mu.Unlock()
		case "ping":
			pong := models.WSMessage{Type: "pong"}
			data, _ := json.Marshal(pong)
			select {
			case c.send <- data:
			default:
			}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
