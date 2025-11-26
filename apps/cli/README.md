# @daad/cli

CLI tool for DAAD code analysis and diagram generation using Go and D2.

## Features

- Analyze code files and generate flow diagrams
- Export diagrams to multiple formats (D2, Mermaid, SVG, PNG)
- AI-powered code analysis
- Support for multiple programming languages

## Installation

### Build from source

```bash
cd apps/cli
make build
```

### Install globally

```bash
make install
```

## Usage

### Analyze code

```bash
daad analyze <file>
```

### Generate diagram

```bash
daad generate <input> -o <output>
```

### Export diagram

```bash
daad export <input> --format d2 -o diagram.d2
daad export <input> --format svg -o diagram.svg
```

### Version

```bash
daad version
```

## Development

### Build

```bash
make build
```

### Test

```bash
make test
```

### Clean

```bash
make clean
```

### Cross-platform build

```bash
make build-all
```

## Dependencies

- Go 1.21+
- D2 library for diagram generation
- Cobra for CLI framework

## TODO

- [ ] Implement code analysis logic
- [ ] Integrate with AI providers (OpenRouter, Claude)
- [ ] Add D2 diagram generation
- [ ] Support multiple export formats
- [ ] Add tests
