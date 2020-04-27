package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.Handle("/", http.FileServer(http.Dir("static")))
	err := http.ListenAndServeTLS(":8088", "server.crt", "server.key", nil)
	if err != nil {
		fmt.Println("ListenAndServe:", err)
	}
}
