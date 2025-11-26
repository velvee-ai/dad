package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/velvee-ai/daad/apps/cli/internal/generator"
)

var (
	version = "0.0.1"
)

var rootCmd = &cobra.Command{
	Use:   "daad",
	Short: "DAAD - Diagram as a Delivery CLI",
	Long:  `A CLI tool for analyzing code and generating flow diagrams using AI and D2.`,
	Run: func(cmd *cobra.Command, args []string) {
		cmd.Help()
	},
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the version number",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("DAAD CLI v%s\n", version)
	},
}

var analyzeCmd = &cobra.Command{
	Use:   "analyze <file>",
	Short: "Analyze code and generate flow diagram",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		filename := args[0]
		fmt.Printf("Analyzing file: %s\n", filename)
		fmt.Println("TODO: Implement code analysis")
	},
}

var generateCmd = &cobra.Command{
	Use:   "generate [path]",
	Short: "Generate diagrams for code files",
	Long:  `Generate flow diagrams for code files. Supports incremental generation to only process changed files.`,
	Args:  cobra.MaximumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		incremental, _ := cmd.Flags().GetBool("incremental")
		output, _ := cmd.Flags().GetString("output")
		baseBranch, _ := cmd.Flags().GetString("base-branch")
		force, _ := cmd.Flags().GetBool("force")

		path := "."
		if len(args) > 0 {
			path = args[0]
		}

		if incremental {
			runIncrementalGeneration(output, baseBranch, force)
		} else {
			runStandardGeneration(path, output)
		}
	},
}

func runIncrementalGeneration(outputDir, baseBranch string, force bool) {
	fmt.Println("=== Incremental Diagram Generation ===")
	fmt.Printf("Output directory: %s\n", outputDir)
	fmt.Printf("Base branch: %s\n", baseBranch)
	fmt.Println()

	config := generator.IncrementalConfig{
		MetadataFile:    ".daad/metadata.json",
		BaseBranch:      baseBranch,
		OutputDir:       outputDir,
		ForceRegenerate: force,
	}

	gen := generator.NewIncrementalGenerator(config)

	// Get changed files
	fmt.Println("Detecting changed files...")
	changes, err := gen.GetChangedFiles()
	if err != nil {
		fmt.Printf("Error detecting changes: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Found %d changed file(s)\n\n", len(changes))

	// Filter by supported languages
	changes = gen.FilterByLanguage(changes)
	fmt.Printf("Filtered to %d supported file(s)\n\n", len(changes))

	if len(changes) == 0 {
		fmt.Println("No files to process. All diagrams are up to date!")
		return
	}

	// Print files to process
	fmt.Println("Files to evaluate:")
	for _, change := range changes {
		fmt.Printf("  - %s (%s, %s)\n", change.Path, change.Language, change.Status)
	}
	fmt.Println()

	// Process files
	fmt.Println("Processing files:")
	results := gen.ProcessFiles(changes)

	// Print summary
	generator.PrintSummary(results)
}

func runStandardGeneration(path, output string) {
	fmt.Printf("Generating diagram from: %s\n", path)
	fmt.Printf("Output file: %s\n", output)
	fmt.Println("TODO: Implement standard diagram generation")
	fmt.Println("Tip: Use --incremental flag for faster incremental generation")
}

var exportCmd = &cobra.Command{
	Use:   "export <input>",
	Short: "Export diagram to various formats",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		input := args[0]
		format, _ := cmd.Flags().GetString("format")
		output, _ := cmd.Flags().GetString("output")
		fmt.Printf("Exporting diagram from: %s\n", input)
		fmt.Printf("Format: %s\n", format)
		fmt.Printf("Output: %s\n", output)
		fmt.Println("TODO: Implement export functionality")
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(analyzeCmd)
	rootCmd.AddCommand(generateCmd)
	rootCmd.AddCommand(exportCmd)

	// Generate command flags
	generateCmd.Flags().StringP("output", "o", ".daad/diagrams", "Output directory for diagrams")
	generateCmd.Flags().Bool("incremental", false, "Enable incremental generation (only process changed files)")
	generateCmd.Flags().String("base-branch", "main", "Base branch for detecting changes (used with --incremental)")
	generateCmd.Flags().BoolP("force", "f", false, "Force regenerate all diagrams (used with --incremental)")

	// Export command flags
	exportCmd.Flags().String("format", "d2", "Export format (d2, mermaid, svg, png)")
	exportCmd.Flags().StringP("output", "o", "", "Output file")
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
