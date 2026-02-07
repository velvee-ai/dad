package storage

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	DefaultStorageDir = ".dad"
	ManifestFileName  = "manifest.json"
	GitIgnoreContent  = "# DAD local storage\n*.tmp\n"
)

// LocalStorage implements the Storage interface for local file system storage
type LocalStorage struct {
	basePath     string
	manifest     *Manifest
	manifestPath string
	mu           sync.RWMutex
}

// NewLocalStorage creates a new LocalStorage instance
func NewLocalStorage(basePath string) (*LocalStorage, error) {
	if basePath == "" {
		basePath = DefaultStorageDir
	}

	// Convert to absolute path
	absPath, err := filepath.Abs(basePath)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve storage path: %w", err)
	}

	ls := &LocalStorage{
		basePath:     absPath,
		manifestPath: filepath.Join(absPath, ManifestFileName),
	}

	return ls, nil
}

// Initialize creates the storage directory structure if it doesn't exist
func (ls *LocalStorage) Initialize() error {
	// Create base directory
	if err := os.MkdirAll(ls.basePath, 0755); err != nil {
		return fmt.Errorf("failed to create storage directory: %w", err)
	}

	// Create .gitignore if it doesn't exist
	gitignorePath := filepath.Join(ls.basePath, ".gitignore")
	if _, err := os.Stat(gitignorePath); os.IsNotExist(err) {
		if err := os.WriteFile(gitignorePath, []byte(GitIgnoreContent), 0644); err != nil {
			return fmt.Errorf("failed to create .gitignore: %w", err)
		}
	}

	// Load or create manifest
	manifest, err := LoadManifest(ls.manifestPath)
	if err != nil {
		return fmt.Errorf("failed to load manifest: %w", err)
	}
	ls.manifest = manifest

	// Save manifest to ensure it exists
	if err := ls.manifest.Save(ls.manifestPath); err != nil {
		return fmt.Errorf("failed to save manifest: %w", err)
	}

	return nil
}

// Save stores a single diagram in the specified format(s)
func (ls *LocalStorage) Save(diagram *Diagram, formats []DiagramFormat) error {
	if diagram == nil {
		return fmt.Errorf("diagram cannot be nil")
	}

	if diagram.ID == "" {
		return fmt.Errorf("diagram ID cannot be empty")
	}

	if len(formats) == 0 {
		formats = []DiagramFormat{FormatJSON}
	}

	ls.mu.Lock()
	defer ls.mu.Unlock()

	// Normalize diagram ID for file system
	normalizedID := normalizeID(diagram.ID)

	// Create diagram directory
	diagramDir := filepath.Join(ls.basePath, normalizedID)
	if err := os.MkdirAll(diagramDir, 0755); err != nil {
		return fmt.Errorf("failed to create diagram directory: %w", err)
	}

	var savedFormat string
	var fileSize int64

	// Save in each requested format
	for _, format := range formats {
		filePath := filepath.Join(diagramDir, fmt.Sprintf("diagram.%s", format))

		var data []byte
		var err error

		switch format {
		case FormatJSON:
			data, err = json.MarshalIndent(diagram, "", "  ")
			if err != nil {
				return fmt.Errorf("failed to marshal diagram to JSON: %w", err)
			}
			savedFormat = string(format)
			fileSize = int64(len(data))

		case FormatD2:
			data = []byte(convertToD2(diagram))
			savedFormat = string(format)

		case FormatMermaid:
			data = []byte(convertToMermaid(diagram))
			savedFormat = string(format)

		case FormatSVG:
			// SVG generation would require additional processing
			// For now, we'll skip it and continue with other formats
			continue

		default:
			return fmt.Errorf("unsupported format: %s", format)
		}

		if err := os.WriteFile(filePath, data, 0644); err != nil {
			return fmt.Errorf("failed to write %s file: %w", format, err)
		}
	}

	// Update manifest
	metadata := &DiagramMetadata{
		ID:          diagram.ID,
		Name:        diagram.Name,
		CreatedAt:   time.Unix(diagram.Timestamp/1000, 0),
		UpdatedAt:   time.Now(),
		SourceFile:  diagram.SourceFile,
		Language:    diagram.Language,
		Format:      savedFormat,
		Size:        fileSize,
		LinesOfCode: extractLinesOfCode(diagram),
		Complexity:  extractComplexity(diagram),
		Summary:     extractSummary(diagram),
	}

	ls.manifest.AddDiagram(metadata)

	// Save manifest
	if err := ls.manifest.Save(ls.manifestPath); err != nil {
		return fmt.Errorf("failed to save manifest: %w", err)
	}

	return nil
}

// SaveBatch stores multiple diagrams
func (ls *LocalStorage) SaveBatch(diagrams []*Diagram, formats []DiagramFormat) error {
	if len(diagrams) == 0 {
		return nil
	}

	// Save each diagram
	for _, diagram := range diagrams {
		if err := ls.Save(diagram, formats); err != nil {
			return fmt.Errorf("failed to save diagram %s: %w", diagram.ID, err)
		}
	}

	return nil
}

// Get retrieves a diagram by ID
func (ls *LocalStorage) Get(id string) (*Diagram, error) {
	ls.mu.RLock()
	defer ls.mu.RUnlock()

	normalizedID := normalizeID(id)

	// Try to read JSON format first
	jsonPath := filepath.Join(ls.basePath, normalizedID, "diagram.json")
	data, err := os.ReadFile(jsonPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("diagram not found: %s", id)
		}
		return nil, fmt.Errorf("failed to read diagram: %w", err)
	}

	var diagram Diagram
	if err := json.Unmarshal(data, &diagram); err != nil {
		return nil, fmt.Errorf("failed to parse diagram: %w", err)
	}

	return &diagram, nil
}

// List returns all stored diagrams with optional filtering
func (ls *LocalStorage) List(filter *ListFilter) ([]*DiagramMetadata, error) {
	ls.mu.RLock()
	defer ls.mu.RUnlock()

	if ls.manifest == nil {
		return nil, fmt.Errorf("manifest not initialized")
	}

	return ls.manifest.ListDiagrams(filter), nil
}

// Delete removes a diagram and all its associated files
func (ls *LocalStorage) Delete(id string) error {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	normalizedID := normalizeID(id)
	diagramDir := filepath.Join(ls.basePath, normalizedID)

	// Remove directory and all contents
	if err := os.RemoveAll(diagramDir); err != nil {
		if !os.IsNotExist(err) {
			return fmt.Errorf("failed to delete diagram directory: %w", err)
		}
	}

	// Remove from manifest
	ls.manifest.RemoveDiagram(id)

	// Save manifest
	if err := ls.manifest.Save(ls.manifestPath); err != nil {
		return fmt.Errorf("failed to save manifest: %w", err)
	}

	return nil
}

// GetPath returns the storage path for a diagram
func (ls *LocalStorage) GetPath(id string, format DiagramFormat) (string, error) {
	normalizedID := normalizeID(id)
	path := filepath.Join(ls.basePath, normalizedID, fmt.Sprintf("diagram.%s", format))

	// Check if file exists
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return "", fmt.Errorf("diagram file not found: %s", path)
		}
		return "", fmt.Errorf("failed to stat diagram file: %w", err)
	}

	return path, nil
}

// normalizeID converts a diagram ID to a safe file system name
func normalizeID(id string) string {
	// Remove or replace unsafe characters
	safe := strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return r
		case r >= 'A' && r <= 'Z':
			return r
		case r >= '0' && r <= '9':
			return r
		case r == '-' || r == '_':
			return r
		default:
			return '_'
		}
	}, id)

	// If the ID is too long or empty, use a hash
	if len(safe) == 0 || len(safe) > 200 {
		hash := md5.Sum([]byte(id))
		return hex.EncodeToString(hash[:])
	}

	return safe
}

// extractLinesOfCode extracts lines of code from diagram metadata
func extractLinesOfCode(diagram *Diagram) int {
	if diagram.DiagramData.Metadata != nil {
		if loc, ok := diagram.DiagramData.Metadata["linesOfCode"].(float64); ok {
			return int(loc)
		}
	}
	return 0
}

// extractComplexity extracts complexity from diagram metadata
func extractComplexity(diagram *Diagram) int {
	if diagram.DiagramData.Metadata != nil {
		if complexity, ok := diagram.DiagramData.Metadata["complexity"].(float64); ok {
			return int(complexity)
		}
	}
	return 0
}

// extractSummary extracts summary from diagram metadata
func extractSummary(diagram *Diagram) string {
	if diagram.DiagramData.Metadata != nil {
		if summary, ok := diagram.DiagramData.Metadata["summary"].(string); ok {
			return summary
		}
	}
	return ""
}

// convertToD2 converts a diagram to D2 format
func convertToD2(diagram *Diagram) string {
	var builder strings.Builder

	builder.WriteString(fmt.Sprintf("# %s\n", diagram.Name))
	builder.WriteString(fmt.Sprintf("# Source: %s\n", diagram.SourceFile))
	builder.WriteString(fmt.Sprintf("# Language: %s\n\n", diagram.Language))

	// Write nodes
	for _, node := range diagram.DiagramData.Nodes {
		label := ""
		if data, ok := node.Data["label"].(string); ok {
			label = data
		}

		nodeType := node.Type
		shape := "rectangle"
		switch nodeType {
		case "start", "end":
			shape = "circle"
		case "decision":
			shape = "diamond"
		}

		builder.WriteString(fmt.Sprintf("%s: {\n", node.ID))
		builder.WriteString(fmt.Sprintf("  label: %q\n", label))
		builder.WriteString(fmt.Sprintf("  shape: %s\n", shape))
		builder.WriteString("}\n\n")
	}

	// Write edges
	for _, edge := range diagram.DiagramData.Edges {
		label := ""
		if edge.Label != "" {
			label = fmt.Sprintf(": %q", edge.Label)
		}
		builder.WriteString(fmt.Sprintf("%s -> %s%s\n", edge.Source, edge.Target, label))
	}

	return builder.String()
}

// convertToMermaid converts a diagram to Mermaid format
func convertToMermaid(diagram *Diagram) string {
	var builder strings.Builder

	builder.WriteString("flowchart TD\n")

	// Write nodes
	for _, node := range diagram.DiagramData.Nodes {
		label := ""
		if data, ok := node.Data["label"].(string); ok {
			label = data
		}

		// Escape special characters in label
		label = strings.ReplaceAll(label, "\"", "&quot;")

		nodeType := node.Type
		var nodeStr string
		switch nodeType {
		case "start", "end":
			nodeStr = fmt.Sprintf("  %s([%s])\n", node.ID, label)
		case "decision":
			nodeStr = fmt.Sprintf("  %s{%s}\n", node.ID, label)
		default:
			nodeStr = fmt.Sprintf("  %s[%s]\n", node.ID, label)
		}
		builder.WriteString(nodeStr)
	}

	builder.WriteString("\n")

	// Write edges
	for _, edge := range diagram.DiagramData.Edges {
		arrow := "-->"
		if edge.Type == "conditional" {
			arrow = "-.-->"
		}

		label := ""
		if edge.Label != "" {
			label = fmt.Sprintf("|%s|", edge.Label)
		}

		builder.WriteString(fmt.Sprintf("  %s %s%s %s\n", edge.Source, arrow, label, edge.Target))
	}

	return builder.String()
}
