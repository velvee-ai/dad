/*
Copyright (c) 2023-2025 Microbus LLC and various contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package helloworld

import (
	"context"
	"net/http"

	"github.com/microbus-io/fabric/connector"
)

// Service is a simple hello world microservice.
type Service struct {
	*connector.Connector
}

// NewService creates a new helloworld service.
func NewService() *Service {
	svc := &Service{}
	svc.Connector = connector.New("helloworld.example")
	svc.Connector.Subscribe("GET", "/", svc.handleHello)
	return svc
}

// handleHello handles the hello world request.
func (svc *Service) handleHello(w http.ResponseWriter, r *http.Request) (err error) {
	name := r.URL.Query().Get("name")
	if name == "" {
		name = "World"
	}
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write([]byte("Hello, " + name + "!"))
	return err
}

// OnStartup is called when the service starts up.
func (svc *Service) OnStartup(ctx context.Context) (err error) {
	return nil
}

// OnShutdown is called when the service shuts down.
func (svc *Service) OnShutdown(ctx context.Context) (err error) {
	return nil
}
