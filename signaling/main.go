package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{}

func signaling(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	//TODO: xxxx
	c.ReadMessage()
}

func main() {
	http.HandleFunc("/signaling", signaling)
	if err := http.ListenAndServe(":9877", nil); err != nil {
		fmt.Println("err:", err)
		os.Exit(1)
	}
}
