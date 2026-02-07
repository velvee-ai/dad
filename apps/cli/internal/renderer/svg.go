package renderer

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// Diagram represents the structure of a diagram
type Diagram struct {
	Nodes    []Node            `json:"nodes"`
	Edges    []Edge            `json:"edges"`
	Metadata *DiagramMetadata  `json:"metadata,omitempty"`
}

// Node represents a diagram node
type Node struct {
	ID          string   `json:"id"`
	Type        string   `json:"type"`
	Label       string   `json:"label"`
	Description string   `json:"description,omitempty"`
	CodeLines   string   `json:"codeLines,omitempty"`
	Position    *Position `json:"position,omitempty"`
}

// Position represents node coordinates
type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Edge represents a diagram edge
type Edge struct {
	ID        string `json:"id"`
	Source    string `json:"source"`
	Target    string `json:"target"`
	Label     string `json:"label,omitempty"`
	Type      string `json:"type,omitempty"`
	Condition string `json:"condition,omitempty"`
}

// DiagramMetadata represents diagram metadata
type DiagramMetadata struct {
	Language   string `json:"language"`
	Complexity int    `json:"complexity,omitempty"`
	Summary    string `json:"summary,omitempty"`
	Filename   string `json:"filename,omitempty"`
	Timestamp  string `json:"timestamp,omitempty"`
}

// RenderOptions contains options for rendering SVG
type RenderOptions struct {
	Theme      string
	Layout     string
	Optimize   bool
	Sketch     bool
	Pad        int
	OutputPath string
}

// RenderToSVG renders a diagram to SVG format using either D2 or Mermaid
func RenderToSVG(diagram *Diagram, format string, options RenderOptions) (string, error) {
	switch format {
	case "d2":
		return renderD2ToSVG(diagram, options)
	case "mermaid":
		return renderMermaidToSVG(diagram, options)
	default:
		return "", fmt.Errorf("unsupported format: %s", format)
	}
}

// renderD2ToSVG renders a diagram to SVG using D2
func renderD2ToSVG(diagram *Diagram, options RenderOptions) (string, error) {
	// Convert diagram to D2 source
	d2Source := toD2(diagram)

	// Check if D2 CLI is available
	if _, err := exec.LookPath("d2"); err != nil {
		return "", fmt.Errorf("d2 CLI not found in PATH. Please install D2: https://d2lang.com/tour/install")
	}

	// Create temporary directory for rendering
	tempDir, err := os.MkdirTemp("", "dad-d2-render-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Write D2 source to temporary file
	inputPath := filepath.Join(tempDir, "diagram.d2")
	if err := os.WriteFile(inputPath, []byte(d2Source), 0644); err != nil {
		return "", fmt.Errorf("failed to write D2 source: %w", err)
	}

	// Prepare output path
	outputPath := options.OutputPath
	if outputPath == "" {
		outputPath = filepath.Join(tempDir, "diagram.svg")
	}

	// Build D2 command
	args := []string{inputPath, outputPath}

	if options.Theme != "" {
		args = append(args, "--theme", options.Theme)
	}

	if options.Layout != "" {
		args = append(args, "--layout", options.Layout)
	}

	if options.Sketch {
		args = append(args, "--sketch")
	}

	if options.Pad > 0 {
		args = append(args, "--pad", fmt.Sprintf("%d", options.Pad))
	}

	// Execute D2 command
	cmd := exec.Command("d2", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("d2 rendering failed: %s\nStderr: %s", err, stderr.String())
	}

	// Read rendered SVG
	svgContent, err := os.ReadFile(outputPath)
	if err != nil {
		return "", fmt.Errorf("failed to read rendered SVG: %w", err)
	}

	// Optimize SVG if requested
	if options.Optimize {
		optimized, err := optimizeSVG(string(svgContent))
		if err != nil {
			// Log warning but don't fail
			fmt.Fprintf(os.Stderr, "Warning: SVG optimization failed: %v\n", err)
			return string(svgContent), nil
		}
		return optimized, nil
	}

	return string(svgContent), nil
}

// renderMermaidToSVG renders a diagram to SVG using Mermaid
func renderMermaidToSVG(diagram *Diagram, options RenderOptions) (string, error) {
	// Convert diagram to Mermaid source
	mermaidSource := toMermaid(diagram)

	// Check if mmdc (Mermaid CLI) is available
	if _, err := exec.LookPath("mmdc"); err != nil {
		return "", fmt.Errorf("mmdc (Mermaid CLI) not found in PATH. Please install: npm install -g @mermaid-js/mermaid-cli")
	}

	// Create temporary directory for rendering
	tempDir, err := os.MkdirTemp("", "dad-mermaid-render-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Write Mermaid source to temporary file
	inputPath := filepath.Join(tempDir, "diagram.mmd")
	if err := os.WriteFile(inputPath, []byte(mermaidSource), 0644); err != nil {
		return "", fmt.Errorf("failed to write Mermaid source: %w", err)
	}

	// Prepare output path
	outputPath := options.OutputPath
	if outputPath == "" {
		outputPath = filepath.Join(tempDir, "diagram.svg")
	}

	// Build mmdc command
	args := []string{
		"-i", inputPath,
		"-o", outputPath,
	}

	if options.Theme != "" {
		args = append(args, "--theme", options.Theme)
	}

	// Execute mmdc command
	cmd := exec.Command("mmdc", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("mermaid rendering failed: %s\nStderr: %s", err, stderr.String())
	}

	// Read rendered SVG
	svgContent, err := os.ReadFile(outputPath)
	if err != nil {
		return "", fmt.Errorf("failed to read rendered SVG: %w", err)
	}

	// Optimize SVG if requested
	if options.Optimize {
		optimized, err := optimizeSVG(string(svgContent))
		if err != nil {
			// Log warning but don't fail
			fmt.Fprintf(os.Stderr, "Warning: SVG optimization failed: %v\n", err)
			return string(svgContent), nil
		}
		return optimized, nil
	}

	return string(svgContent), nil
}

// toD2 converts a diagram to D2 format
func toD2(diagram *Diagram) string {
	var lines []string

	// Add metadata as comments
	if diagram.Metadata != nil {
		lines = append(lines, fmt.Sprintf("# Language: %s", diagram.Metadata.Language))
		if diagram.Metadata.Summary != "" {
			lines = append(lines, fmt.Sprintf("# Summary: %s", diagram.Metadata.Summary))
		}
		lines = append(lines, "")
	}

	// Add nodes
	for _, node := range diagram.Nodes {
		shape := getD2Shape(node.Type)
		label := strings.ReplaceAll(node.Label, "\n", "\\n")
		lines = append(lines, fmt.Sprintf("%s: %s {", node.ID, label))
		lines = append(lines, fmt.Sprintf("  shape: %s", shape))
		if node.Description != "" {
			desc := strings.ReplaceAll(node.Description, "\n", "\\n")
			lines = append(lines, fmt.Sprintf("  tooltip: %s", desc))
		}
		lines = append(lines, "}")
		lines = append(lines, "")
	}

	// Add edges
	for _, edge := range diagram.Edges {
		label := ""
		if edge.Label != "" {
			label = fmt.Sprintf(": %s", edge.Label)
		}
		style := ""
		if edge.Type == "conditional" {
			style = " {style.stroke-dash: 3}"
		}
		lines = append(lines, fmt.Sprintf("%s -> %s%s%s", edge.Source, edge.Target, label, style))
	}

	return strings.Join(lines, "\n")
}

// toMermaid converts a diagram to Mermaid format
func toMermaid(diagram *Diagram) string {
	lines := []string{"flowchart TD"}

	// Add nodes
	for _, node := range diagram.Nodes {
		shape := getMermaidShape(node.Type)
		label := strings.ReplaceAll(node.Label, "\"", "\\\"")
		lines = append(lines, fmt.Sprintf("  %s%s\"%s\"%s", node.ID, shape.Start, label, shape.End))
	}

	// Add edges
	for _, edge := range diagram.Edges {
		arrow := "-->"
		if edge.Type == "conditional" {
			arrow = "-.->."
		}
		label := ""
		if edge.Label != "" {
			label = fmt.Sprintf("|%s|", edge.Label)
		}
		lines = append(lines, fmt.Sprintf("  %s %s%s %s", edge.Source, arrow, label, edge.Target))
	}

	return strings.Join(lines, "\n")
}

// getD2Shape returns the D2 shape for a node type
func getD2Shape(nodeType string) string {
	shapes := map[string]string{
		"start":    "oval",
		"end":      "oval",
		"process":  "rectangle",
		"decision": "diamond",
		"loop":     "hexagon",
		"call":     "cloud",
		"return":   "rectangle",
	}
	if shape, ok := shapes[nodeType]; ok {
		return shape
	}
	return "rectangle"
}

// MermaidShape represents Mermaid shape delimiters
type MermaidShape struct {
	Start string
	End   string
}

// getMermaidShape returns the Mermaid shape for a node type
func getMermaidShape(nodeType string) MermaidShape {
	shapes := map[string]MermaidShape{
		"start":    {Start: "([", End: "])"},
		"end":      {Start: "([", End: "])"},
		"process":  {Start: "[", End: "]"},
		"decision": {Start: "{", End: "}"},
		"loop":     {Start: "[[", End: "]]"},
		"call":     {Start: ">", End: "]"},
		"return":   {Start: "[", End: "]"},
	}
	if shape, ok := shapes[nodeType]; ok {
		return shape
	}
	return MermaidShape{Start: "[", End: "]"}
}

// optimizeSVG optimizes SVG content (placeholder for now)
// In production, this could use svgo or similar tools
func optimizeSVG(svg string) (string, error) {
	// Check if svgo is available
	if _, err := exec.LookPath("svgo"); err != nil {
		return svg, fmt.Errorf("svgo not found in PATH")
	}

	// Create temporary files
	tempDir, err := os.MkdirTemp("", "dad-svgo-*")
	if err != nil {
		return svg, err
	}
	defer os.RemoveAll(tempDir)

	inputPath := filepath.Join(tempDir, "input.svg")
	outputPath := filepath.Join(tempDir, "output.svg")

	// Write input SVG
	if err := os.WriteFile(inputPath, []byte(svg), 0644); err != nil {
		return svg, err
	}

	// Run svgo
	cmd := exec.Command("svgo", inputPath, "-o", outputPath)
	if err := cmd.Run(); err != nil {
		return svg, err
	}

	// Read optimized SVG
	optimized, err := os.ReadFile(outputPath)
	if err != nil {
		return svg, err
	}

	return string(optimized), nil
}

// LoadDiagramFromJSON loads a diagram from a JSON file
func LoadDiagramFromJSON(path string) (*Diagram, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	var diagram Diagram
	if err := json.Unmarshal(data, &diagram); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return &diagram, nil
}

// SaveSVGToFile saves SVG content to a file
func SaveSVGToFile(svg string, path string) error {
	return os.WriteFile(path, []byte(svg), 0644)
}
