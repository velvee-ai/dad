package storage

import (
	"time"
)

// DiagramFormat represents the output format for diagrams
type DiagramFormat string

const (
	FormatJSON    DiagramFormat = "json"
	FormatD2      DiagramFormat = "d2"
	FormatMermaid DiagramFormat = "mermaid"
	FormatSVG     DiagramFormat = "svg"
)

// DiagramMetadata represents metadata about a diagram
type DiagramMetadata struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	SourceFile   string    `json:"sourceFile"`
	Language     string    `json:"language"`
	Format       string    `json:"format"`
	Size         int64     `json:"size"`
	LinesOfCode  int       `json:"linesOfCode,omitempty"`
	Complexity   int       `json:"complexity,omitempty"`
	Summary      string    `json:"summary,omitempty"`
}

// FlowNode represents a node in the flow diagram
type FlowNode struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"` // start, process, decision, loop, call, return, end
	Data        map[string]interface{} `json:"data"`
	Position    map[string]float64     `json:"position"`
	ParentID    string                 `json:"parentId,omitempty"`
	Extent      string                 `json:"extent,omitempty"`
	Hidden      bool                   `json:"hidden,omitempty"`
}

// FlowEdge represents an edge in the flow diagram
type FlowEdge struct {
	ID       string                 `json:"id"`
	Source   string                 `json:"source"`
	Target   string                 `json:"target"`
	Label    string                 `json:"label,omitempty"`
	Type     string                 `json:"type,omitempty"` // default, conditional, loop, error
	Animated bool                   `json:"animated,omitempty"`
	Data     map[string]interface{} `json:"data,omitempty"`
	Hidden   bool                   `json:"hidden,omitempty"`
}

// DiagramData represents the complete diagram structure
type DiagramData struct {
	Nodes    []FlowNode             `json:"nodes"`
	Edges    []FlowEdge             `json:"edges"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// Diagram represents a complete diagram with its metadata
type Diagram struct {
	ID           string      `json:"id"`
	Name         string      `json:"name"`
	Timestamp    int64       `json:"timestamp"`
	SourceFile   string      `json:"sourceFile"`
	CodeSnippet  string      `json:"codeSnippet"`
	Language     string      `json:"language"`
	DiagramData  DiagramData `json:"flowChart"`
	EditHistory  *EditHistory `json:"editHistory,omitempty"`
}

// EditHistory tracks the history of diagram edits
type EditHistory struct {
	OriginalGenerated DiagramData `json:"originalGenerated"`
	UserEdited        *DiagramData `json:"userEdited,omitempty"`
	LastModified      int64       `json:"lastModified,omitempty"`
	EditCount         int         `json:"editCount,omitempty"`
}

// Storage defines the interface for diagram storage operations
type Storage interface {
	// Initialize creates the storage structure if it doesn't exist
	Initialize() error

	// Save stores a single diagram in the specified format(s)
	Save(diagram *Diagram, formats []DiagramFormat) error

	// SaveBatch stores multiple diagrams
	SaveBatch(diagrams []*Diagram, formats []DiagramFormat) error

	// Get retrieves a diagram by ID
	Get(id string) (*Diagram, error)

	// List returns all stored diagrams with optional filtering
	List(filter *ListFilter) ([]*DiagramMetadata, error)

	// Delete removes a diagram and all its associated files
	Delete(id string) error

	// GetPath returns the storage path for a diagram
	GetPath(id string, format DiagramFormat) (string, error)
}

// ListFilter defines filtering options for listing diagrams
type ListFilter struct {
	SourceFile string
	Language   string
	FromDate   *time.Time
	ToDate     *time.Time
	Limit      int
	Offset     int
}
