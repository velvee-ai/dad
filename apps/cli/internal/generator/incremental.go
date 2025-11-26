package generator

import (
	"bufio"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// IncrementalGenerator handles incremental diagram generation
type IncrementalGenerator struct {
	config   IncrementalConfig
	metadata map[string]*DiagramMetadata
}

// NewIncrementalGenerator creates a new incremental generator
func NewIncrementalGenerator(config IncrementalConfig) *IncrementalGenerator {
	if config.MetadataFile == "" {
		config.MetadataFile = ".daad/metadata.json"
	}
	if config.BaseBranch == "" {
		config.BaseBranch = "main"
	}
	if len(config.SupportedLangs) == 0 {
		config.SupportedLangs = SupportedLanguages
	}
	if config.OutputDir == "" {
		config.OutputDir = ".daad/diagrams"
	}

	gen := &IncrementalGenerator{
		config:   config,
		metadata: make(map[string]*DiagramMetadata),
	}

	gen.loadMetadata()
	return gen
}

// GetChangedFiles detects files that have changed using git diff
func (g *IncrementalGenerator) GetChangedFiles() ([]FileChange, error) {
	// First, check if we're in a git repository
	if !g.isGitRepo() {
		return nil, fmt.Errorf("not a git repository")
	}

	changes := []FileChange{}

	// Get list of modified and new files
	modifiedFiles, err := g.getGitDiffFiles()
	if err != nil {
		return nil, fmt.Errorf("failed to get git diff: %w", err)
	}

	// Get untracked files
	untrackedFiles, err := g.getUntrackedFiles()
	if err != nil {
		return nil, fmt.Errorf("failed to get untracked files: %w", err)
	}

	// Process modified files
	for _, file := range modifiedFiles {
		if change, ok := g.createFileChange(file, StatusModified); ok {
			changes = append(changes, change)
		}
	}

	// Process untracked files
	for _, file := range untrackedFiles {
		if change, ok := g.createFileChange(file, StatusAdded); ok {
			changes = append(changes, change)
		}
	}

	return changes, nil
}

// FilterByLanguage filters files to only include supported languages
func (g *IncrementalGenerator) FilterByLanguage(files []FileChange) []FileChange {
	filtered := []FileChange{}
	supportedLangsMap := make(map[string]bool)
	for _, lang := range g.config.SupportedLangs {
		supportedLangsMap[lang] = true
	}

	for _, file := range files {
		if file.Language != "" && supportedLangsMap[file.Language] {
			filtered = append(filtered, file)
		}
	}

	return filtered
}

// ShouldRegenerate determines if a diagram should be regenerated
func (g *IncrementalGenerator) ShouldRegenerate(file FileChange) (bool, string) {
	if g.config.ForceRegenerate {
		return true, "force regenerate flag set"
	}

	// Check if we have metadata for this file
	meta, exists := g.metadata[file.Path]
	if !exists {
		return true, "no existing diagram metadata"
	}

	// Check if source file hash has changed
	if meta.SourceHash != file.Hash {
		return true, "source file has changed"
	}

	// Check if diagram file exists
	if _, err := os.Stat(meta.DiagramPath); os.IsNotExist(err) {
		return true, "diagram file does not exist"
	}

	return false, "diagram is up to date"
}

// ProcessFiles processes a list of files and returns generation results
func (g *IncrementalGenerator) ProcessFiles(files []FileChange) []GenerationResult {
	results := []GenerationResult{}

	for _, file := range files {
		shouldRegen, reason := g.ShouldRegenerate(file)

		result := GenerationResult{
			File:      file.Path,
			Processed: shouldRegen,
			Skipped:   !shouldRegen,
			Reason:    reason,
		}

		if shouldRegen {
			// In a real implementation, this would call the actual diagram generation
			// For now, we just mark it as processed
			fmt.Printf("  [PROCESS] %s - %s\n", file.Path, reason)
		} else {
			fmt.Printf("  [SKIP] %s - %s\n", file.Path, reason)
		}

		results = append(results, result)
	}

	return results
}

// UpdateMetadata updates metadata for a generated diagram
func (g *IncrementalGenerator) UpdateMetadata(file FileChange, diagramPath string) error {
	diagramHash, err := g.calculateFileHash(diagramPath)
	if err != nil {
		return fmt.Errorf("failed to calculate diagram hash: %w", err)
	}

	meta := &DiagramMetadata{
		SourceFile:  file.Path,
		SourceHash:  file.Hash,
		DiagramPath: diagramPath,
		Language:    file.Language,
		GeneratedAt: time.Now(),
		DiagramHash: diagramHash,
	}

	g.metadata[file.Path] = meta
	return g.saveMetadata()
}

// loadMetadata loads existing metadata from disk
func (g *IncrementalGenerator) loadMetadata() error {
	if _, err := os.Stat(g.config.MetadataFile); os.IsNotExist(err) {
		return nil // No metadata file yet, start fresh
	}

	data, err := os.ReadFile(g.config.MetadataFile)
	if err != nil {
		return fmt.Errorf("failed to read metadata file: %w", err)
	}

	if err := json.Unmarshal(data, &g.metadata); err != nil {
		return fmt.Errorf("failed to parse metadata: %w", err)
	}

	return nil
}

// saveMetadata saves metadata to disk
func (g *IncrementalGenerator) saveMetadata() error {
	// Ensure directory exists
	dir := filepath.Dir(g.config.MetadataFile)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create metadata directory: %w", err)
	}

	data, err := json.MarshalIndent(g.metadata, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	if err := os.WriteFile(g.config.MetadataFile, data, 0644); err != nil {
		return fmt.Errorf("failed to write metadata file: %w", err)
	}

	return nil
}

// isGitRepo checks if current directory is a git repository
func (g *IncrementalGenerator) isGitRepo() bool {
	cmd := exec.Command("git", "rev-parse", "--git-dir")
	return cmd.Run() == nil
}

// getGitDiffFiles gets list of modified files from git diff
func (g *IncrementalGenerator) getGitDiffFiles() ([]string, error) {
	filesMap := make(map[string]bool)

	// Try to get diff against base branch first
	cmd := exec.Command("git", "diff", "--name-only", g.config.BaseBranch+"...HEAD")
	output, err := cmd.Output()

	if err == nil && len(output) > 0 {
		// Successfully got diff against base branch
		scanner := bufio.NewScanner(strings.NewReader(string(output)))
		for scanner.Scan() {
			file := strings.TrimSpace(scanner.Text())
			if file != "" {
				filesMap[file] = true
			}
		}
	}

	// Also get staged changes (--cached)
	cmd = exec.Command("git", "diff", "--name-only", "--cached")
	output, err = cmd.Output()
	if err == nil {
		scanner := bufio.NewScanner(strings.NewReader(string(output)))
		for scanner.Scan() {
			file := strings.TrimSpace(scanner.Text())
			if file != "" {
				filesMap[file] = true
			}
		}
	}

	// Also get unstaged changes
	cmd = exec.Command("git", "diff", "--name-only")
	output, err = cmd.Output()
	if err == nil {
		scanner := bufio.NewScanner(strings.NewReader(string(output)))
		for scanner.Scan() {
			file := strings.TrimSpace(scanner.Text())
			if file != "" {
				filesMap[file] = true
			}
		}
	}

	// Convert map to slice
	files := []string{}
	for file := range filesMap {
		files = append(files, file)
	}

	return files, nil
}

// parsePorcelainStatus parses git status --porcelain output
func (g *IncrementalGenerator) parsePorcelainStatus(output string) []string {
	files := []string{}
	scanner := bufio.NewScanner(strings.NewReader(output))

	for scanner.Scan() {
		line := scanner.Text()
		if len(line) < 4 {
			continue
		}

		status := line[0:2]
		file := strings.TrimSpace(line[3:])

		// Include modified, added, and renamed files (exclude deleted)
		if status[0] != 'D' && status[1] != 'D' && file != "" {
			files = append(files, file)
		}
	}

	return files
}

// getUntrackedFiles gets list of untracked files
func (g *IncrementalGenerator) getUntrackedFiles() ([]string, error) {
	cmd := exec.Command("git", "ls-files", "--others", "--exclude-standard")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	files := []string{}
	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		file := strings.TrimSpace(scanner.Text())
		if file != "" {
			files = append(files, file)
		}
	}

	return files, nil
}

// createFileChange creates a FileChange from a file path
func (g *IncrementalGenerator) createFileChange(path string, status ChangeStatus) (FileChange, bool) {
	// Get file extension and determine language
	ext := filepath.Ext(path)
	lang, ok := LanguageExtensions[ext]
	if !ok {
		return FileChange{}, false // Not a supported language
	}

	// Calculate file hash
	hash, err := g.calculateFileHash(path)
	if err != nil {
		return FileChange{}, false
	}

	// Get file modification time
	info, err := os.Stat(path)
	var modTime time.Time
	if err == nil {
		modTime = info.ModTime()
	}

	return FileChange{
		Path:         path,
		Status:       status,
		Language:     lang,
		Hash:         hash,
		LastModified: modTime,
	}, true
}

// calculateFileHash calculates SHA256 hash of a file
func (g *IncrementalGenerator) calculateFileHash(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return fmt.Sprintf("%x", hash.Sum(nil)), nil
}

// GetMetadata returns the current metadata map
func (g *IncrementalGenerator) GetMetadata() map[string]*DiagramMetadata {
	return g.metadata
}

// PrintSummary prints a summary of the incremental generation
func PrintSummary(results []GenerationResult) {
	processed := 0
	skipped := 0
	errors := 0

	for _, r := range results {
		if r.Error != nil {
			errors++
		} else if r.Processed {
			processed++
		} else if r.Skipped {
			skipped++
		}
	}

	fmt.Println("\n=== Incremental Generation Summary ===")
	fmt.Printf("Total files: %d\n", len(results))
	fmt.Printf("Processed: %d\n", processed)
	fmt.Printf("Skipped: %d\n", skipped)
	if errors > 0 {
		fmt.Printf("Errors: %d\n", errors)
	}
	fmt.Println("======================================")
}
