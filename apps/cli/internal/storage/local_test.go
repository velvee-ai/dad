package storage

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestNewLocalStorage(t *testing.T) {
	tests := []struct {
		name     string
		basePath string
		wantErr  bool
	}{
		{
			name:     "default path",
			basePath: "",
			wantErr:  false,
		},
		{
			name:     "custom path",
			basePath: ".custom_dad",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ls, err := NewLocalStorage(tt.basePath)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewLocalStorage() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && ls == nil {
				t.Error("NewLocalStorage() returned nil without error")
			}
		})
	}
}

func TestLocalStorage_Initialize(t *testing.T) {
	// Create temporary directory
	tmpDir := t.TempDir()
	testPath := filepath.Join(tmpDir, ".dad")

	ls, err := NewLocalStorage(testPath)
	if err != nil {
		t.Fatalf("NewLocalStorage() error = %v", err)
	}

	// Initialize should create directory structure
	err = ls.Initialize()
	if err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Verify base directory exists
	if _, err := os.Stat(testPath); os.IsNotExist(err) {
		t.Error("Initialize() did not create base directory")
	}

	// Verify .gitignore exists
	gitignorePath := filepath.Join(testPath, ".gitignore")
	if _, err := os.Stat(gitignorePath); os.IsNotExist(err) {
		t.Error("Initialize() did not create .gitignore")
	}

	// Verify manifest exists
	manifestPath := filepath.Join(testPath, ManifestFileName)
	if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
		t.Error("Initialize() did not create manifest.json")
	}

	// Verify manifest is valid
	if ls.manifest == nil {
		t.Error("Initialize() did not load manifest")
	}
}

func TestLocalStorage_Save(t *testing.T) {
	tmpDir := t.TempDir()
	testPath := filepath.Join(tmpDir, ".dad")

	ls, err := NewLocalStorage(testPath)
	if err != nil {
		t.Fatalf("NewLocalStorage() error = %v", err)
	}

	if err := ls.Initialize(); err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	diagram := &Diagram{
		ID:          "test-diagram-1",
		Name:        "Test Diagram",
		Timestamp:   time.Now().UnixMilli(),
		SourceFile:  "test.go",
		CodeSnippet: "func main() {}",
		Language:    "go",
		DiagramData: DiagramData{
			Nodes: []FlowNode{
				{
					ID:   "node1",
					Type: "start",
					Data: map[string]interface{}{
						"label": "Start",
					},
					Position: map[string]float64{
						"x": 0,
						"y": 0,
					},
				},
				{
					ID:   "node2",
					Type: "end",
					Data: map[string]interface{}{
						"label": "End",
					},
					Position: map[string]float64{
						"x": 100,
						"y": 100,
					},
				},
			},
			Edges: []FlowEdge{
				{
					ID:     "edge1",
					Source: "node1",
					Target: "node2",
				},
			},
		},
	}

	// Test saving in JSON format
	err = ls.Save(diagram, []DiagramFormat{FormatJSON})
	if err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Verify diagram file exists
	diagramPath := filepath.Join(testPath, normalizeID(diagram.ID), "diagram.json")
	if _, err := os.Stat(diagramPath); os.IsNotExist(err) {
		t.Error("Save() did not create diagram.json file")
	}

	// Test saving in multiple formats
	err = ls.Save(diagram, []DiagramFormat{FormatJSON, FormatD2, FormatMermaid})
	if err != nil {
		t.Fatalf("Save() with multiple formats error = %v", err)
	}

	// Verify all format files exist
	formats := []DiagramFormat{FormatJSON, FormatD2, FormatMermaid}
	for _, format := range formats {
		formatPath := filepath.Join(testPath, normalizeID(diagram.ID), "diagram."+string(format))
		if _, err := os.Stat(formatPath); os.IsNotExist(err) {
			t.Errorf("Save() did not create diagram.%s file", format)
		}
	}

	// Verify manifest was updated
	metadata, exists := ls.manifest.GetDiagram(diagram.ID)
	if !exists {
		t.Error("Save() did not update manifest")
	}
	if metadata.ID != diagram.ID {
		t.Errorf("manifest metadata ID = %v, want %v", metadata.ID, diagram.ID)
	}
}

func TestLocalStorage_Get(t *testing.T) {
	tmpDir := t.TempDir()
	testPath := filepath.Join(tmpDir, ".dad")

	ls, err := NewLocalStorage(testPath)
	if err != nil {
		t.Fatalf("NewLocalStorage() error = %v", err)
	}

	if err := ls.Initialize(); err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Create and save a diagram
	originalDiagram := &Diagram{
		ID:          "test-get-diagram",
		Name:        "Get Test Diagram",
		Timestamp:   time.Now().UnixMilli(),
		SourceFile:  "test.go",
		CodeSnippet: "func test() {}",
		Language:    "go",
		DiagramData: DiagramData{
			Nodes: []FlowNode{
				{
					ID:   "node1",
					Type: "start",
					Data: map[string]interface{}{
						"label": "Start",
					},
				},
			},
			Edges: []FlowEdge{},
		},
	}

	if err := ls.Save(originalDiagram, []DiagramFormat{FormatJSON}); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Test getting the diagram
	retrievedDiagram, err := ls.Get(originalDiagram.ID)
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}

	if retrievedDiagram.ID != originalDiagram.ID {
		t.Errorf("Get() ID = %v, want %v", retrievedDiagram.ID, originalDiagram.ID)
	}
	if retrievedDiagram.Name != originalDiagram.Name {
		t.Errorf("Get() Name = %v, want %v", retrievedDiagram.Name, originalDiagram.Name)
	}

	// Test getting non-existent diagram
	_, err = ls.Get("non-existent-id")
	if err == nil {
		t.Error("Get() with non-existent ID should return error")
	}
}

func TestLocalStorage_List(t *testing.T) {
	tmpDir := t.TempDir()
	testPath := filepath.Join(tmpDir, ".dad")

	ls, err := NewLocalStorage(testPath)
	if err != nil {
		t.Fatalf("NewLocalStorage() error = %v", err)
	}

	if err := ls.Initialize(); err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Create and save multiple diagrams
	diagrams := []*Diagram{
		{
			ID:         "diagram-1",
			Name:       "Diagram 1",
			Timestamp:  time.Now().UnixMilli(),
			SourceFile: "file1.go",
			Language:   "go",
			DiagramData: DiagramData{
				Nodes: []FlowNode{},
				Edges: []FlowEdge{},
			},
		},
		{
			ID:         "diagram-2",
			Name:       "Diagram 2",
			Timestamp:  time.Now().UnixMilli(),
			SourceFile: "file2.js",
			Language:   "javascript",
			DiagramData: DiagramData{
				Nodes: []FlowNode{},
				Edges: []FlowEdge{},
			},
		},
		{
			ID:         "diagram-3",
			Name:       "Diagram 3",
			Timestamp:  time.Now().UnixMilli(),
			SourceFile: "file3.go",
			Language:   "go",
			DiagramData: DiagramData{
				Nodes: []FlowNode{},
				Edges: []FlowEdge{},
			},
		},
	}

	for _, diagram := range diagrams {
		if err := ls.Save(diagram, []DiagramFormat{FormatJSON}); err != nil {
			t.Fatalf("Save() error = %v", err)
		}
	}

	// Test listing all diagrams
	allDiagrams, err := ls.List(nil)
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(allDiagrams) != 3 {
		t.Errorf("List() returned %d diagrams, want 3", len(allDiagrams))
	}

	// Test listing with language filter
	goFilter := &ListFilter{
		Language: "go",
	}
	goDiagrams, err := ls.List(goFilter)
	if err != nil {
		t.Fatalf("List() with filter error = %v", err)
	}
	if len(goDiagrams) != 2 {
		t.Errorf("List() with go filter returned %d diagrams, want 2", len(goDiagrams))
	}

	// Test listing with source file filter
	fileFilter := &ListFilter{
		SourceFile: "file2.js",
	}
	fileDiagrams, err := ls.List(fileFilter)
	if err != nil {
		t.Fatalf("List() with file filter error = %v", err)
	}
	if len(fileDiagrams) != 1 {
		t.Errorf("List() with file filter returned %d diagrams, want 1", len(fileDiagrams))
	}

	// Test listing with limit
	limitFilter := &ListFilter{
		Limit: 2,
	}
	limitedDiagrams, err := ls.List(limitFilter)
	if err != nil {
		t.Fatalf("List() with limit error = %v", err)
	}
	if len(limitedDiagrams) != 2 {
		t.Errorf("List() with limit returned %d diagrams, want 2", len(limitedDiagrams))
	}
}

func TestLocalStorage_Delete(t *testing.T) {
	tmpDir := t.TempDir()
	testPath := filepath.Join(tmpDir, ".dad")

	ls, err := NewLocalStorage(testPath)
	if err != nil {
		t.Fatalf("NewLocalStorage() error = %v", err)
	}

	if err := ls.Initialize(); err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Create and save a diagram
	diagram := &Diagram{
		ID:          "test-delete-diagram",
		Name:        "Delete Test",
		Timestamp:   time.Now().UnixMilli(),
		SourceFile:  "test.go",
		Language:    "go",
		DiagramData: DiagramData{
			Nodes: []FlowNode{},
			Edges: []FlowEdge{},
		},
	}

	if err := ls.Save(diagram, []DiagramFormat{FormatJSON}); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Verify diagram exists
	diagramPath := filepath.Join(testPath, normalizeID(diagram.ID))
	if _, err := os.Stat(diagramPath); os.IsNotExist(err) {
		t.Error("Diagram directory does not exist before delete")
	}

	// Delete the diagram
	err = ls.Delete(diagram.ID)
	if err != nil {
		t.Fatalf("Delete() error = %v", err)
	}

	// Verify diagram directory is removed
	if _, err := os.Stat(diagramPath); !os.IsNotExist(err) {
		t.Error("Delete() did not remove diagram directory")
	}

	// Verify diagram is removed from manifest
	_, exists := ls.manifest.GetDiagram(diagram.ID)
	if exists {
		t.Error("Delete() did not remove diagram from manifest")
	}

	// Test deleting non-existent diagram (should not error)
	err = ls.Delete("non-existent-id")
	if err != nil {
		t.Errorf("Delete() with non-existent ID error = %v", err)
	}
}

func TestLocalStorage_GetPath(t *testing.T) {
	tmpDir := t.TempDir()
	testPath := filepath.Join(tmpDir, ".dad")

	ls, err := NewLocalStorage(testPath)
	if err != nil {
		t.Fatalf("NewLocalStorage() error = %v", err)
	}

	if err := ls.Initialize(); err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Create and save a diagram
	diagram := &Diagram{
		ID:          "test-path-diagram",
		Name:        "Path Test",
		Timestamp:   time.Now().UnixMilli(),
		SourceFile:  "test.go",
		Language:    "go",
		DiagramData: DiagramData{
			Nodes: []FlowNode{},
			Edges: []FlowEdge{},
		},
	}

	if err := ls.Save(diagram, []DiagramFormat{FormatJSON, FormatD2}); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Test getting path for JSON format
	jsonPath, err := ls.GetPath(diagram.ID, FormatJSON)
	if err != nil {
		t.Fatalf("GetPath() for JSON error = %v", err)
	}
	if _, err := os.Stat(jsonPath); os.IsNotExist(err) {
		t.Error("GetPath() returned non-existent path for JSON")
	}

	// Test getting path for D2 format
	d2Path, err := ls.GetPath(diagram.ID, FormatD2)
	if err != nil {
		t.Fatalf("GetPath() for D2 error = %v", err)
	}
	if _, err := os.Stat(d2Path); os.IsNotExist(err) {
		t.Error("GetPath() returned non-existent path for D2")
	}

	// Test getting path for non-existent format
	_, err = ls.GetPath(diagram.ID, FormatMermaid)
	if err == nil {
		t.Error("GetPath() for non-existent format should return error")
	}

	// Test getting path for non-existent diagram
	_, err = ls.GetPath("non-existent-id", FormatJSON)
	if err == nil {
		t.Error("GetPath() for non-existent diagram should return error")
	}
}

func TestNormalizeID(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "simple alphanumeric",
			input: "test123",
			want:  "test123",
		},
		{
			name:  "with hyphens and underscores",
			input: "test-diagram_123",
			want:  "test-diagram_123",
		},
		{
			name:  "with spaces",
			input: "test diagram 123",
			want:  "test_diagram_123",
		},
		{
			name:  "with special characters",
			input: "test@diagram#123",
			want:  "test_diagram_123",
		},
		{
			name:  "empty string",
			input: "",
			want:  "d41d8cd98f00b204e9800998ecf8427e", // MD5 of empty string
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeID(tt.input)
			if got != tt.want {
				t.Errorf("normalizeID() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestLocalStorage_SaveBatch(t *testing.T) {
	tmpDir := t.TempDir()
	testPath := filepath.Join(tmpDir, ".dad")

	ls, err := NewLocalStorage(testPath)
	if err != nil {
		t.Fatalf("NewLocalStorage() error = %v", err)
	}

	if err := ls.Initialize(); err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Create multiple diagrams
	diagrams := []*Diagram{
		{
			ID:          "batch-1",
			Name:        "Batch Diagram 1",
			Timestamp:   time.Now().UnixMilli(),
			SourceFile:  "test1.go",
			Language:    "go",
			DiagramData: DiagramData{Nodes: []FlowNode{}, Edges: []FlowEdge{}},
		},
		{
			ID:          "batch-2",
			Name:        "Batch Diagram 2",
			Timestamp:   time.Now().UnixMilli(),
			SourceFile:  "test2.go",
			Language:    "go",
			DiagramData: DiagramData{Nodes: []FlowNode{}, Edges: []FlowEdge{}},
		},
	}

	// Save batch
	err = ls.SaveBatch(diagrams, []DiagramFormat{FormatJSON})
	if err != nil {
		t.Fatalf("SaveBatch() error = %v", err)
	}

	// Verify all diagrams were saved
	for _, diagram := range diagrams {
		_, err := ls.Get(diagram.ID)
		if err != nil {
			t.Errorf("SaveBatch() failed to save diagram %s: %v", diagram.ID, err)
		}
	}
}
