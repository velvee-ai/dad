package storage_test

import (
	"fmt"
	"log"
	"time"

	"github.com/velvee-ai/dad/apps/cli/internal/storage"
)

// Example_basicUsage demonstrates basic storage operations
func Example_basicUsage() {
	// Create storage instance
	ls, err := storage.NewLocalStorage(".dad")
	if err != nil {
		log.Fatal(err)
	}

	// Initialize storage
	if err := ls.Initialize(); err != nil {
		log.Fatal(err)
	}

	// Create a diagram
	diagram := &storage.Diagram{
		ID:          "example-diagram",
		Name:        "Example Flow",
		Timestamp:   time.Now().UnixMilli(),
		SourceFile:  "example.go",
		CodeSnippet: "func example() {}",
		Language:    "go",
		DiagramData: storage.DiagramData{
			Nodes: []storage.FlowNode{
				{
					ID:   "start",
					Type: "start",
					Data: map[string]interface{}{
						"label": "Start",
					},
					Position: map[string]float64{"x": 0, "y": 0},
				},
			},
			Edges: []storage.FlowEdge{},
		},
	}

	// Save in JSON format
	if err := ls.Save(diagram, []storage.DiagramFormat{storage.FormatJSON}); err != nil {
		log.Fatal(err)
	}

	fmt.Println("Diagram saved successfully")
	// Output: Diagram saved successfully
}

// demonstrateListWithFilter shows how to filter diagrams
func demonstrateListWithFilter() {
	ls, _ := storage.NewLocalStorage(".dad")
	ls.Initialize()

	// Create sample diagrams
	diagrams := []*storage.Diagram{
		{
			ID:          "go-diagram",
			Name:        "Go Function",
			Timestamp:   time.Now().UnixMilli(),
			Language:    "go",
			DiagramData: storage.DiagramData{Nodes: []storage.FlowNode{}, Edges: []storage.FlowEdge{}},
		},
		{
			ID:          "js-diagram",
			Name:        "JS Function",
			Timestamp:   time.Now().UnixMilli(),
			Language:    "javascript",
			DiagramData: storage.DiagramData{Nodes: []storage.FlowNode{}, Edges: []storage.FlowEdge{}},
		},
	}

	ls.SaveBatch(diagrams, []storage.DiagramFormat{storage.FormatJSON})

	// List Go diagrams only
	filter := &storage.ListFilter{
		Language: "go",
		Limit:    10,
	}

	results, _ := ls.List(filter)
	fmt.Printf("Found Go diagram(s): %d\n", len(results))
}

// Example_multipleFormats demonstrates saving in multiple formats
func Example_multipleFormats() {
	ls, _ := storage.NewLocalStorage(".dad")
	ls.Initialize()

	diagram := &storage.Diagram{
		ID:        "multi-format",
		Name:      "Multi Format Diagram",
		Timestamp: time.Now().UnixMilli(),
		Language:  "go",
		DiagramData: storage.DiagramData{
			Nodes: []storage.FlowNode{
				{
					ID:   "n1",
					Type: "process",
					Data: map[string]interface{}{"label": "Process"},
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

	// Verify all formats exist
	for _, format := range formats {
		if _, err := ls.GetPath(diagram.ID, format); err == nil {
			fmt.Printf("%s format created\n", format)
		}
	}
	// Output:
	// json format created
	// d2 format created
	// mermaid format created
}
