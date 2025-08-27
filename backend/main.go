package main

import (
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

type FileRequest struct {
	Path string `json:"path"`
}

type FileResponse struct {
	Content string `json:"content"`
	Error   string `json:"error,omitempty"`
}

type SaveRequest struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type SaveResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

type VariableRequest struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type VariableResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

type ProcessMarkdownRequest struct {
	Content string `json:"content"`
}

type ProcessMarkdownResponse struct {
	ProcessedContent string `json:"processedContent"`
	Error            string `json:"error,omitempty"`
}

// グローバル変数処理器
var variableProcessor *VariableProcessor

func main() {
	// 変数処理器を初期化
	variableProcessor = NewVariableProcessor()

	r := gin.Default()

	// CORS設定
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// ヘルスチェック
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "healthy",
			"timestamp": "2025-08-28T00:34:26+09:00",
		})
	})

	// ファイル読み込みエンドポイント
	r.POST("/api/file/read", readFile)

	// ファイル保存エンドポイント
	r.POST("/api/file/save", saveFile)

	// Markdown処理エンドポイント（変数展開）
	r.POST("/api/markdown/process", processMarkdown)

	// グローバル変数設定エンドポイント
	r.POST("/api/variables/set", setGlobalVariable)
	r.GET("/api/variables/get", getGlobalVariables)
	r.POST("/api/variables/load", loadVariablesFromYAML)
	r.GET("/api/variables/export", exportVariablesToYAML)

	log.Println("Server starting on :8080")
	r.Run(":8080")
}

func readFile(c *gin.Context) {
	var req FileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, FileResponse{Error: "Invalid request"})
		return
	}

	// ファイルサイズチェック（10MB制限）
	fileInfo, err := os.Stat(req.Path)
	if err != nil {
		c.JSON(404, FileResponse{Error: "File not found"})
		return
	}

	if fileInfo.Size() > 10*1024*1024 { // 10MB
		c.JSON(413, FileResponse{Error: "File too large (max 10MB)"})
		return
	}

	// ファイル拡張子チェック
	ext := strings.ToLower(filepath.Ext(req.Path))
	if ext != ".md" && ext != ".txt" {
		c.JSON(400, FileResponse{Error: "Unsupported file type. Only .md and .txt files are supported"})
		return
	}

	// ファイル読み込み
	content, err := os.ReadFile(req.Path)
	if err != nil {
		c.JSON(500, FileResponse{Error: "Failed to read file"})
		return
	}

	c.JSON(200, FileResponse{Content: string(content)})
}

func saveFile(c *gin.Context) {
	var req SaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, SaveResponse{Success: false, Error: "Invalid request"})
		return
	}

	// ファイル拡張子チェック
	ext := strings.ToLower(filepath.Ext(req.Path))
	if ext != ".md" && ext != ".txt" {
		c.JSON(400, SaveResponse{Success: false, Error: "Unsupported file type. Only .md and .txt files are supported"})
		return
	}

	// ディレクトリ作成
	dir := filepath.Dir(req.Path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(500, SaveResponse{Success: false, Error: "Failed to create directory"})
		return
	}

	// ファイル保存
	if err := os.WriteFile(req.Path, []byte(req.Content), 0644); err != nil {
		c.JSON(500, SaveResponse{Success: false, Error: "Failed to save file"})
		return
	}

	c.JSON(200, SaveResponse{Success: true})
}

func processMarkdown(c *gin.Context) {
	var req ProcessMarkdownRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, ProcessMarkdownResponse{Error: "Invalid request"})
		return
	}

	// 変数を展開
	processedContent := variableProcessor.ProcessVariables(req.Content)

	c.JSON(200, ProcessMarkdownResponse{ProcessedContent: processedContent})
}

func setGlobalVariable(c *gin.Context) {
	var req VariableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, VariableResponse{Success: false, Error: "Invalid request"})
		return
	}

	variableProcessor.SetGlobalVariable(req.Name, req.Value)
	c.JSON(200, VariableResponse{Success: true})
}

func getGlobalVariables(c *gin.Context) {
	variables := variableProcessor.GetAllGlobalVariables()
	c.JSON(200, gin.H{"variables": variables})
}

func loadVariablesFromYAML(c *gin.Context) {
	var req struct {
		YAMLContent string `json:"yamlContent"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, VariableResponse{Success: false, Error: "Invalid request"})
		return
	}

	err := variableProcessor.LoadVariablesFromYAML(req.YAMLContent)
	if err != nil {
		c.JSON(500, VariableResponse{Success: false, Error: "Failed to load variables: " + err.Error()})
		return
	}

	c.JSON(200, VariableResponse{Success: true})
}

func exportVariablesToYAML(c *gin.Context) {
	yamlContent, err := variableProcessor.ExportVariablesToYAML()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to export variables: " + err.Error()})
		return
	}

	c.JSON(200, gin.H{"yamlContent": yamlContent})
}
