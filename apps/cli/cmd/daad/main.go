package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
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
	Use:   "generate <input> -o <output>",
	Short: "Generate diagram from analysis result",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		input := args[0]
		output, _ := cmd.Flags().GetString("output")
		fmt.Printf("Generating diagram from: %s\n", input)
		fmt.Printf("Output file: %s\n", output)
		fmt.Println("TODO: Implement diagram generation")
	},
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

	generateCmd.Flags().StringP("output", "o", "diagram.d2", "Output file")
	exportCmd.Flags().String("format", "d2", "Export format (d2, mermaid, svg, png)")
	exportCmd.Flags().StringP("output", "o", "", "Output file")
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
