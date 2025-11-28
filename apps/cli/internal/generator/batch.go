package generator

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"

	"github.com/velvee-ai/daad/apps/cli/internal/batch"
)

// FileAnalysis represents a file to be analyzed
type FileAnalysis struct {
	ID       string `json:"id"`
	Filename string `json:"filename"`
	Code     string `json:"code"`
	Language string `json:"language"`
}

// DiagramResult represents the result of diagram generation
type DiagramResult struct {
	ID       string      `json:"id"`
	Filename string      `json:"filename"`
	Diagram  interface{} `json:"diagram,omitempty"`
	Success  bool        `json:"success"`
	Error    string      `json:"error,omitempty"`
	Attempts int         `json:"attempts"`
}

// BatchManifest represents the output manifest
type BatchManifest struct {
	ID           string           `json:"id"`
	Timestamp    int64            `json:"timestamp"`
	Results      []DiagramResult  `json:"results"`
	TotalItems   int              `json:"totalItems"`
	SuccessCount int              `json:"successCount"`
	FailureCount int              `json:"failureCount"`
}

// BatchGenerator handles batch diagram generation
type BatchGenerator struct {
	options       *batch.Options
	rateLimiter   *batch.RateLimiter
	outputDir     string
	manifestFile  string
	showProgress  bool
}

// NewBatchGenerator creates a new batch generator
func NewBatchGenerator(outputDir string, showProgress bool) *BatchGenerator {
	return &BatchGenerator{
		options:      batch.DefaultOptions(),
		rateLimiter:  batch.NewRateLimiter(10, 2, 1*time.Second),
		outputDir:    outputDir,
		manifestFile: filepath.Join(outputDir, "manifest.json"),
		showProgress: showProgress,
	}
}

// AnalyzeDirectory analyzes all files in a directory
func (bg *BatchGenerator) AnalyzeDirectory(ctx context.Context, directory string, pattern string) error {
	files, err := bg.findFiles(directory, pattern)
	if err != nil {
		return fmt.Errorf("failed to find files: %w", err)
	}

	if len(files) == 0 {
		return fmt.Errorf("no files found matching pattern: %s", pattern)
	}

	items := make([]*batch.Item, len(files))
	for i, file := range files {
		items[i] = &batch.Item{
			ID:   fmt.Sprintf("file-%d", i),
			Data: file,
		}
	}

	fmt.Printf("Found %d files to analyze\n", len(files))

	var progress *batch.ProgressTracker
	if bg.showProgress {
		progress = batch.NewProgressTracker(len(items))
		progress.OnChange(func(update *batch.ProgressUpdate) {
			bg.printProgress(update)
		})

		bg.options.OnProgress = func(completed, total int) {
			progress.SetCompleted(completed)
		}
	}

	bg.options.OnItemComplete = func(result *batch.Result) {
		if result.Error != nil {
			fmt.Printf("✗ Failed to analyze %s: %v\n", result.ID, result.Error)
		} else if bg.showProgress {
			fmt.Printf("✓ Completed %s\n", result.ID)
		}
	}

	results, err := batch.ProcessBatch(ctx, items, bg.processFile, bg.options)
	if err != nil {
		return fmt.Errorf("batch processing failed: %w", err)
	}

	return bg.saveManifest(results, files)
}

func (bg *BatchGenerator) processFile(ctx context.Context, item *batch.Item) (interface{}, error) {
	if err := bg.rateLimiter.Acquire(ctx, 1); err != nil {
		return nil, err
	}

	file := item.Data.(*FileAnalysis)

	diagram, err := bg.analyzeSingleFile(ctx, file)
	if err != nil {
		return nil, err
	}

	outputFile := filepath.Join(bg.outputDir, filepath.Base(file.Filename)+".json")
	if err := bg.saveDiagram(outputFile, diagram); err != nil {
		return nil, fmt.Errorf("failed to save diagram: %w", err)
	}

	return diagram, nil
}

func (bg *BatchGenerator) analyzeSingleFile(ctx context.Context, file *FileAnalysis) (interface{}, error) {
	// TODO: Implement actual API call to analyze service
	// For now, return a mock diagram
	return map[string]interface{}{
		"nodes": []interface{}{
			map[string]interface{}{
				"id":    "1",
				"type":  "start",
				"label": "Start",
			},
		},
		"edges": []interface{}{},
		"metadata": map[string]interface{}{
			"language": file.Language,
			"filename": file.Filename,
		},
	}, nil
}

func (bg *BatchGenerator) findFiles(directory string, pattern string) ([]*FileAnalysis, error) {
	var files []*FileAnalysis

	err := filepath.Walk(directory, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		matched, err := filepath.Match(pattern, filepath.Base(path))
		if err != nil {
			return err
		}

		if matched {
			content, err := ioutil.ReadFile(path)
			if err != nil {
				return fmt.Errorf("failed to read file %s: %w", path, err)
			}

			language := detectLanguage(path)
			files = append(files, &FileAnalysis{
				ID:       path,
				Filename: path,
				Code:     string(content),
				Language: language,
			})
		}

		return nil
	})

	return files, err
}

func (bg *BatchGenerator) saveDiagram(filename string, diagram interface{}) error {
	data, err := json.MarshalIndent(diagram, "", "  ")
	if err != nil {
		return err
	}

	return ioutil.WriteFile(filename, data, 0644)
}

func (bg *BatchGenerator) saveManifest(results []*batch.Result, files []*FileAnalysis) error {
	if err := os.MkdirAll(bg.outputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	diagramResults := make([]DiagramResult, len(results))
	successCount := 0
	failureCount := 0

	for i, result := range results {
		file := files[i]
		diagramResults[i] = DiagramResult{
			ID:       result.ID,
			Filename: file.Filename,
			Diagram:  result.Output,
			Success:  result.Status == "success",
			Attempts: result.Attempts,
		}

		if result.Error != nil {
			diagramResults[i].Error = result.Error.Error()
			failureCount++
		} else {
			successCount++
		}
	}

	manifest := BatchManifest{
		ID:           fmt.Sprintf("manifest-%d", time.Now().Unix()),
		Timestamp:    time.Now().Unix(),
		Results:      diagramResults,
		TotalItems:   len(results),
		SuccessCount: successCount,
		FailureCount: failureCount,
	}

	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal manifest: %w", err)
	}

	if err := ioutil.WriteFile(bg.manifestFile, data, 0644); err != nil {
		return fmt.Errorf("failed to write manifest: %w", err)
	}

	fmt.Printf("\nBatch processing complete!\n")
	fmt.Printf("Total: %d, Success: %d, Failed: %d\n", len(results), successCount, failureCount)
	fmt.Printf("Manifest saved to: %s\n", bg.manifestFile)

	return nil
}

func (bg *BatchGenerator) printProgress(update *batch.ProgressUpdate) {
	fmt.Printf("\rProgress: %d/%d (%.1f%%) - Elapsed: %s",
		update.Completed,
		update.Total,
		update.Percentage,
		update.Elapsed.Round(time.Second))

	if update.EstimatedTimeRemaining != nil {
		fmt.Printf(" - ETA: %s", update.EstimatedTimeRemaining.Round(time.Second))
	}
}

func detectLanguage(filename string) string {
	ext := filepath.Ext(filename)
	switch ext {
	case ".go":
		return "go"
	case ".js":
		return "javascript"
	case ".ts":
		return "typescript"
	case ".py":
		return "python"
	case ".java":
		return "java"
	case ".rs":
		return "rust"
	case ".cpp", ".cc", ".cxx":
		return "cpp"
	case ".c":
		return "c"
	case ".rb":
		return "ruby"
	case ".php":
		return "php"
	default:
		return "unknown"
	}
}
