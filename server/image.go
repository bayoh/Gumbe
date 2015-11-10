package main

import (
	"bytes"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func getImage(rw http.ResponseWriter, r *http.Request) error {
	vars := mux.Vars(r)
	filename := vars["filename"]
	url := bytes.NewBufferString("http://w1.sndcdn.com/")
	url.WriteString(filename)

	resp, err := http.Get(url.String())
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	rw.Header().Set("Content-Type", "image/png")
	rw.Header().Set("Content-Length", strconv.Itoa(len(body)))
	_, err = rw.Write(body)
	if err != nil {
		return err
	}

	return nil
}
