package main

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	sessions = make(map[string]*websocket.Conn)
	mtx      = sync.Mutex{}
)

func signaling(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("upgrade:", err)
		return
	}
	//TODO: xxxx
	mtx.Lock()
	sessions[c.RemoteAddr().String()] = c
	mtx.Unlock()
	fmt.Println("accepted new client:", c.RemoteAddr().String())
	for {
		t, msg, err := c.ReadMessage()
		if err != nil {
			fmt.Println("ReadMessage error:", err)
			return
		}
		if t != websocket.TextMessage {
			fmt.Println("Unsupported message type:", t)
			continue
		}
		mtx.Lock()
		for addr, conn := range sessions {
			if addr == c.RemoteAddr().String() {
				continue
			}
			fmt.Println("Relay message to ", addr)
			conn.WriteMessage(websocket.TextMessage, msg)
		}
		mtx.Unlock()
	}
}
