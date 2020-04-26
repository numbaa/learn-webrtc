package main

import (
	"fmt"
	"net/http"
	"os"
)

func main() {
	http.HandleFunc("/signaling", signaling)
	if err := http.ListenAndServe("0.0.0.0:9877", nil); err != nil {
		fmt.Println("err:", err)
		os.Exit(1)
	}
}
