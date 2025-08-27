package main

import (
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

// Variable 変数の定義
type Variable struct {
	Name  string `yaml:"name"`
	Value string `yaml:"value"`
}

// VariableSet 変数セット
type VariableSet struct {
	Variables []Variable `yaml:"variables"`
}

// VariableProcessor 変数処理器
type VariableProcessor struct {
	globalVariables map[string]string
}

// NewVariableProcessor 新しい変数処理器を作成
func NewVariableProcessor() *VariableProcessor {
	return &VariableProcessor{
		globalVariables: make(map[string]string),
	}
}

// SetGlobalVariable グローバル変数を設定
func (vp *VariableProcessor) SetGlobalVariable(name, value string) {
	vp.globalVariables[name] = value
}

// GetGlobalVariable グローバル変数を取得
func (vp *VariableProcessor) GetGlobalVariable(name string) (string, bool) {
	value, exists := vp.globalVariables[name]
	return value, exists
}

// GetAllGlobalVariables すべてのグローバル変数を取得
func (vp *VariableProcessor) GetAllGlobalVariables() map[string]string {
	result := make(map[string]string)
	for k, v := range vp.globalVariables {
		result[k] = v
	}
	return result
}

// ParseVariablesFromMarkdown Markdownから変数定義を抽出
func (vp *VariableProcessor) ParseVariablesFromMarkdown(content string) ([]Variable, string) {
	var variables []Variable
	lines := strings.Split(content, "\n")
	var processedLines []string

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// 変数定義のパターンをチェック
		if strings.HasPrefix(trimmed, "<!-- @var ") && strings.HasSuffix(trimmed, " -->") {
			// <!-- @var name: value --> の形式
			varContent := strings.TrimPrefix(trimmed, "<!-- @var ")
			varContent = strings.TrimSuffix(varContent, " -->")

			if colonIndex := strings.Index(varContent, ":"); colonIndex != -1 {
				name := strings.TrimSpace(varContent[:colonIndex])
				value := strings.TrimSpace(varContent[colonIndex+1:])
				variables = append(variables, Variable{Name: name, Value: value})
			}
		} else if strings.HasPrefix(trimmed, "<!-- @include:") && strings.HasSuffix(trimmed, " -->") {
			// <!-- @include: filename --> の形式（将来実装）
			// 現在はスキップ
		} else {
			processedLines = append(processedLines, line)
		}
	}

	return variables, strings.Join(processedLines, "\n")
}

// ProcessVariables Markdownコンテンツ内の変数を展開
func (vp *VariableProcessor) ProcessVariables(content string) string {
	// ファイル内の変数定義を抽出
	fileVariables, processedContent := vp.ParseVariablesFromMarkdown(content)

	// ファイル内変数をマップに変換
	fileVarMap := make(map[string]string)
	for _, v := range fileVariables {
		fileVarMap[v.Name] = v.Value
	}

	// 変数展開の正規表現
	re := regexp.MustCompile(`\{\{([^}]+)\}\}`)

	// 変数を展開
	result := re.ReplaceAllStringFunc(processedContent, func(match string) string {
		// {{variable}} から variable を抽出
		varName := strings.TrimSpace(match[2 : len(match)-2])

		// ファイル内変数を優先、次にグローバル変数
		if value, exists := fileVarMap[varName]; exists {
			return value
		}
		if value, exists := vp.globalVariables[varName]; exists {
			return value
		}

		// 変数が見つからない場合は元の文字列を返す
		return match
	})

	return result
}

// LoadVariablesFromYAML YAMLファイルから変数を読み込み
func (vp *VariableProcessor) LoadVariablesFromYAML(yamlContent string) error {
	var varSet VariableSet
	err := yaml.Unmarshal([]byte(yamlContent), &varSet)
	if err != nil {
		return err
	}

	for _, v := range varSet.Variables {
		vp.globalVariables[v.Name] = v.Value
	}

	return nil
}

// ExportVariablesToYAML 変数をYAML形式でエクスポート
func (vp *VariableProcessor) ExportVariablesToYAML() (string, error) {
	varSet := VariableSet{
		Variables: make([]Variable, 0, len(vp.globalVariables)),
	}

	for name, value := range vp.globalVariables {
		varSet.Variables = append(varSet.Variables, Variable{
			Name:  name,
			Value: value,
		})
	}

	yamlData, err := yaml.Marshal(&varSet)
	if err != nil {
		return "", err
	}

	return string(yamlData), nil
}
