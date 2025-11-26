# Storage Package

The storage package provides local file system storage for DAAD diagrams in the `.dad/` folder.

## Features

- **Multiple Format Support**: Save diagrams in JSON, D2, Mermaid, and SVG formats
- **Manifest Management**: Automatically maintains a `manifest.json` with diagram metadata
- **Thread-Safe Operations**: Concurrent read/write access with mutex protection
- **File Path Normalization**: Safe conversion of diagram IDs to filesystem paths
- **Filtering & Pagination**: List diagrams with flexible filtering options
- **Automatic Directory Creation**: Creates `.dad/` folder structure on initialization

## Directory Structure

```
.dad/
├── manifest.json          # Index of all diagrams with metadata
├── .gitignore            # Git ignore file
└── <diagram-id>/         # One folder per diagram
    ├── diagram.json      # JSON format
    ├── diagram.d2        # D2 format
    ├── diagram.mermaid   # Mermaid format
    └── diagram.svg       # SVG format (when available)
```

## Usage

### Initialize Storage

```go
import "github.com/velvee-ai/daad/apps/cli/internal/storage"

// Create with default path (.dad)
ls, err := storage.NewLocalStorage("")
if err != nil {
    log.Fatal(err)
}

// Or use custom path
ls, err := storage.NewLocalStorage(".custom_dad")
if err != nil {
    log.Fatal(err)
}

// Initialize creates directory structure and manifest
if err := ls.Initialize(); err != nil {
    log.Fatal(err)
}
```

### Save a Diagram

```go
diagram := &storage.Diagram{
    ID:          "my-diagram-123",
    Name:        "Main Function Flow",
    Timestamp:   time.Now().UnixMilli(),
    SourceFile:  "main.go",
    CodeSnippet: "func main() { ... }",
    Language:    "go",
    DiagramData: storage.DiagramData{
        Nodes: []storage.FlowNode{
            {
                ID:   "start",
                Type: "start",
                Data: map[string]interface{}{
                    "label": "Start",
                },
                Position: map[string]float64{
                    "x": 0,
                    "y": 0,
                },
            },
        },
        Edges: []storage.FlowEdge{},
    },
}

// Save in multiple formats
formats := []storage.DiagramFormat{
    storage.FormatJSON,
    storage.FormatD2,
    storage.FormatMermaid,
}

if err := ls.Save(diagram, formats); err != nil {
    log.Fatal(err)
}
```

### Save Multiple Diagrams

```go
diagrams := []*storage.Diagram{diagram1, diagram2, diagram3}
formats := []storage.DiagramFormat{storage.FormatJSON}

if err := ls.SaveBatch(diagrams, formats); err != nil {
    log.Fatal(err)
}
```

### Retrieve a Diagram

```go
diagram, err := ls.Get("my-diagram-123")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Diagram: %s\n", diagram.Name)
fmt.Printf("Source: %s\n", diagram.SourceFile)
fmt.Printf("Nodes: %d\n", len(diagram.DiagramData.Nodes))
```

### List Diagrams

```go
// List all diagrams
allDiagrams, err := ls.List(nil)
if err != nil {
    log.Fatal(err)
}

for _, meta := range allDiagrams {
    fmt.Printf("ID: %s, Name: %s, Language: %s\n",
        meta.ID, meta.Name, meta.Language)
}

// List with filters
filter := &storage.ListFilter{
    Language:   "go",
    SourceFile: "main.go",
    Limit:      10,
    Offset:     0,
}

filteredDiagrams, err := ls.List(filter)
if err != nil {
    log.Fatal(err)
}
```

### Delete a Diagram

```go
if err := ls.Delete("my-diagram-123"); err != nil {
    log.Fatal(err)
}
```

### Get File Path

```go
// Get path to specific format
jsonPath, err := ls.GetPath("my-diagram-123", storage.FormatJSON)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("JSON file: %s\n", jsonPath)
```

## Data Types

### DiagramFormat

Supported output formats:

- `FormatJSON` - JSON format (default)
- `FormatD2` - D2 diagram language
- `FormatMermaid` - Mermaid diagram syntax
- `FormatSVG` - SVG image (requires external processing)

### FlowNode

Represents a node in the flow diagram:

```go
type FlowNode struct {
    ID          string                 // Unique node identifier
    Type        string                 // start, process, decision, loop, call, return, end
    Data        map[string]interface{} // Node data (label, description, etc.)
    Position    map[string]float64     // x, y coordinates
    ParentID    string                 // Parent node for hierarchical diagrams
    Extent      string                 // Layout extent
    Hidden      bool                   // Visibility flag
}
```

### FlowEdge

Represents an edge connecting nodes:

```go
type FlowEdge struct {
    ID       string                 // Unique edge identifier
    Source   string                 // Source node ID
    Target   string                 // Target node ID
    Label    string                 // Edge label
    Type     string                 // default, conditional, loop, error
    Animated bool                   // Animation flag
    Data     map[string]interface{} // Additional data
    Hidden   bool                   // Visibility flag
}
```

### DiagramMetadata

Metadata stored in manifest:

```go
type DiagramMetadata struct {
    ID          string    // Unique diagram identifier
    Name        string    // Human-readable name
    CreatedAt   time.Time // Creation timestamp
    UpdatedAt   time.Time // Last update timestamp
    SourceFile  string    // Source code file path
    Language    string    // Programming language
    Format      string    // Primary storage format
    Size        int64     // File size in bytes
    LinesOfCode int       // Lines of code analyzed
    Complexity  int       // Code complexity score
    Summary     string    // Diagram summary
}
```

## Thread Safety

All public methods are thread-safe and can be called concurrently:

- Read operations use `RLock()` for concurrent reads
- Write operations use `Lock()` for exclusive access
- Manifest operations are protected with internal mutex

## File Path Normalization

The `normalizeID()` function converts diagram IDs to safe filesystem names:

- Preserves alphanumeric characters, hyphens, and underscores
- Replaces unsafe characters with underscores
- Uses MD5 hash for empty or very long IDs
- Maximum normalized ID length: 200 characters

## Format Converters

### D2 Format

Converts diagrams to D2 language syntax with:

- Node shapes based on type (circle for start/end, diamond for decisions)
- Labeled edges
- Comments with source file and language info

### Mermaid Format

Converts diagrams to Mermaid flowchart syntax with:

- Different node styles for different types
- Conditional edges (dotted lines)
- Labeled transitions

## Error Handling

All operations return descriptive errors:

- File system errors (permissions, disk full, etc.)
- JSON marshaling/unmarshaling errors
- Missing or invalid diagram IDs
- Filter validation errors

Example error handling:

```go
diagram, err := ls.Get("some-id")
if err != nil {
    if os.IsNotExist(err) {
        fmt.Println("Diagram not found")
    } else {
        log.Printf("Error retrieving diagram: %v", err)
    }
}
```

## Testing

Run tests with:

```bash
go test -v ./internal/storage/...
```

The test suite includes:

- Storage initialization tests
- Single and batch save operations
- Retrieval and listing tests
- Delete operations
- Path normalization tests
- Filter and pagination tests

## Integration with CLI

Example integration in CLI commands:

```go
package main

import (
    "github.com/velvee-ai/daad/apps/cli/internal/storage"
    "github.com/spf13/cobra"
)

var saveCmd = &cobra.Command{
    Use:   "save",
    Short: "Save diagram to local storage",
    Run: func(cmd *cobra.Command, args []string) {
        ls, _ := storage.NewLocalStorage("")
        ls.Initialize()

        // ... create diagram from analysis

        formats := []storage.DiagramFormat{
            storage.FormatJSON,
            storage.FormatD2,
        }

        if err := ls.Save(diagram, formats); err != nil {
            fmt.Printf("Error saving diagram: %v\n", err)
            return
        }

        fmt.Printf("Diagram saved: %s\n", diagram.ID)
    },
}
```

## Future Enhancements

Potential improvements:

- [ ] Compression for large diagrams
- [ ] Encryption for sensitive diagrams
- [ ] Remote storage backends (S3, cloud storage)
- [ ] Diagram versioning and history
- [ ] Search by content (full-text search)
- [ ] Export to additional formats (PNG, PDF)
- [ ] Automatic cleanup of old diagrams
- [ ] Import from other diagram formats
