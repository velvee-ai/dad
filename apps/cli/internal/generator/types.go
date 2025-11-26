package generator

import "time"

// FileChange represents a changed file detected by git
type FileChange struct {
	Path         string
	Status       ChangeStatus
	Language     string
	Hash         string
	LastModified time.Time
}

// ChangeStatus represents the type of change in a file
type ChangeStatus string

const (
	StatusAdded    ChangeStatus = "added"
	StatusModified ChangeStatus = "modified"
	StatusDeleted  ChangeStatus = "deleted"
)

// DiagramMetadata stores metadata about generated diagrams
type DiagramMetadata struct {
	SourceFile   string    `json:"source_file"`
	SourceHash   string    `json:"source_hash"`
	DiagramPath  string    `json:"diagram_path"`
	Language     string    `json:"language"`
	GeneratedAt  time.Time `json:"generated_at"`
	DiagramHash  string    `json:"diagram_hash"`
}

// IncrementalConfig holds configuration for incremental generation
type IncrementalConfig struct {
	MetadataFile     string
	BaseBranch       string
	SupportedLangs   []string
	OutputDir        string
	ForceRegenerate  bool
}

// GenerationResult represents the outcome of processing a file
type GenerationResult struct {
	File      string
	Processed bool
	Skipped   bool
	Reason    string
	Error     error
}

// SupportedLanguages defines the languages we can analyze
var SupportedLanguages = []string{
	"go",
	"js",
	"ts",
	"jsx",
	"tsx",
	"py",
	"java",
	"rb",
	"rs",
	"c",
	"cpp",
	"cs",
	"php",
}

// LanguageExtensions maps file extensions to language names
var LanguageExtensions = map[string]string{
	".go":   "go",
	".js":   "js",
	".ts":   "ts",
	".jsx":  "jsx",
	".tsx":  "tsx",
	".py":   "py",
	".java": "java",
	".rb":   "rb",
	".rs":   "rs",
	".c":    "c",
	".cpp":  "cpp",
	".cc":   "cpp",
	".cxx":  "cpp",
	".cs":   "cs",
	".php":  "php",
}
