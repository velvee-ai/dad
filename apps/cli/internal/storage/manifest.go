package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// Manifest represents the manifest.json structure
type Manifest struct {
	Version  string                      `json:"version"`
	Diagrams map[string]*DiagramMetadata `json:"diagrams"`
	mu       sync.RWMutex                `json:"-"`
}

// NewManifest creates a new manifest
func NewManifest() *Manifest {
	return &Manifest{
		Version:  "1.0.0",
		Diagrams: make(map[string]*DiagramMetadata),
	}
}

// LoadManifest loads the manifest from the specified path
func LoadManifest(path string) (*Manifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			// Return new manifest if file doesn't exist
			return NewManifest(), nil
		}
		return nil, fmt.Errorf("failed to read manifest: %w", err)
	}

	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, fmt.Errorf("failed to parse manifest: %w", err)
	}

	if manifest.Diagrams == nil {
		manifest.Diagrams = make(map[string]*DiagramMetadata)
	}

	return &manifest, nil
}

// Save writes the manifest to disk
func (m *Manifest) Save(path string) error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Ensure directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create manifest directory: %w", err)
	}

	// Marshal with indentation for readability
	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal manifest: %w", err)
	}

	// Write to temporary file first
	tempPath := path + ".tmp"
	if err := os.WriteFile(tempPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write manifest: %w", err)
	}

	// Atomic rename
	if err := os.Rename(tempPath, path); err != nil {
		os.Remove(tempPath) // Clean up temp file
		return fmt.Errorf("failed to rename manifest: %w", err)
	}

	return nil
}

// AddDiagram adds or updates a diagram entry in the manifest
func (m *Manifest) AddDiagram(metadata *DiagramMetadata) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Diagrams[metadata.ID] = metadata
}

// GetDiagram retrieves a diagram entry by ID
func (m *Manifest) GetDiagram(id string) (*DiagramMetadata, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	metadata, exists := m.Diagrams[id]
	return metadata, exists
}

// RemoveDiagram removes a diagram entry from the manifest
func (m *Manifest) RemoveDiagram(id string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, exists := m.Diagrams[id]
	if exists {
		delete(m.Diagrams, id)
	}
	return exists
}

// ListDiagrams returns all diagram metadata with optional filtering
func (m *Manifest) ListDiagrams(filter *ListFilter) []*DiagramMetadata {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var result []*DiagramMetadata
	for _, metadata := range m.Diagrams {
		if filter != nil {
			// Apply filters
			if filter.SourceFile != "" && metadata.SourceFile != filter.SourceFile {
				continue
			}
			if filter.Language != "" && metadata.Language != filter.Language {
				continue
			}
			if filter.FromDate != nil && metadata.CreatedAt.Before(*filter.FromDate) {
				continue
			}
			if filter.ToDate != nil && metadata.CreatedAt.After(*filter.ToDate) {
				continue
			}
		}
		result = append(result, metadata)
	}

	// Apply pagination
	if filter != nil && filter.Offset > 0 {
		if filter.Offset >= len(result) {
			return []*DiagramMetadata{}
		}
		result = result[filter.Offset:]
	}

	if filter != nil && filter.Limit > 0 && len(result) > filter.Limit {
		result = result[:filter.Limit]
	}

	return result
}

// Count returns the total number of diagrams
func (m *Manifest) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.Diagrams)
}
