.PHONY: build test clean install run

BINARY_NAME=dad
BUILD_DIR=bin
MAIN_PATH=cmd/dad/main.go

build:
	@echo "Building ${BINARY_NAME}..."
	@mkdir -p ${BUILD_DIR}
	@go build -o ${BUILD_DIR}/${BINARY_NAME} ${MAIN_PATH}
	@echo "Build complete: ${BUILD_DIR}/${BINARY_NAME}"

build-all:
	@echo "Building for multiple platforms..."
	@mkdir -p ${BUILD_DIR}
	GOOS=linux GOARCH=amd64 go build -o ${BUILD_DIR}/${BINARY_NAME}-linux-amd64 ${MAIN_PATH}
	GOOS=darwin GOARCH=amd64 go build -o ${BUILD_DIR}/${BINARY_NAME}-darwin-amd64 ${MAIN_PATH}
	GOOS=darwin GOARCH=arm64 go build -o ${BUILD_DIR}/${BINARY_NAME}-darwin-arm64 ${MAIN_PATH}
	GOOS=windows GOARCH=amd64 go build -o ${BUILD_DIR}/${BINARY_NAME}-windows-amd64.exe ${MAIN_PATH}
	@echo "Multi-platform build complete"

test:
	@echo "Running tests..."
	@go test -v ./...

clean:
	@echo "Cleaning..."
	@rm -rf ${BUILD_DIR}
	@go clean
	@echo "Clean complete"

install: build
	@echo "Installing ${BINARY_NAME}..."
	@go install ${MAIN_PATH}
	@echo "Install complete"

run: build
	@${BUILD_DIR}/${BINARY_NAME}

deps:
	@echo "Downloading dependencies..."
	@go mod download
	@go mod tidy
	@echo "Dependencies updated"
