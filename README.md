# Terminal JSON Parser

Parse selected text from the terminal as JSON and display it in a new window with syntax highlighting. If the text isn't valid JSON, you can optionally use ChatGPT to format and display the data.

## Features

- **JSON Parsing and Formatting**: Automatically parse and format selected JSON text from the terminal.
- **Syntax Highlighting**: Display formatted JSON in a new window with syntax highlighting using Highlight.js.
- **ChatGPT Integration**: Use OpenAI's ChatGPT to format and display non-JSON data (requires API key).
- **Customizable Settings**: Configure font size, ChatGPT model, prompts, and more.

## Installation

1. **Via Visual Studio Code Marketplace**:
   - Open VSCode.
   - Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X` on macOS).
   - Search for `Terminal JSON Parser`.
   - Click **Install**.

2. **Manual Installation**:
   - Clone or download this repository.
   - Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS) and select `Extensions: Install from VSIX...`.
   - Navigate to the downloaded `.vsix` file and install.

## Usage

1. **Select Text in Terminal**:
   - Highlight the text you want to parse in the integrated terminal.

2. **Activate the Extension**:
   - **Keyboard Shortcut**: Press `Ctrl+Shift+J` (`Cmd+Shift+J` on macOS).
   - **Context Menu**: Right-click the selected text and choose **Parse Terminal Selection**.
   - **Command Palette**: Open the command palette and run **Terminal: Parse Terminal Selection**.

3. **View Parsed Output**:
   - A new window will open displaying the formatted text with syntax highlighting.

## Configuration

Customize the extension by modifying the following settings in your VSCode `settings.json` or through the Settings UI.

| Setting                                            | Type      | Default Value                                                                                                                                    | Description                                                        |
| -------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `terminalSelectionViewer.formatJson`               | `boolean` | `true`                                                                                                                                           | Enable or disable JSON parsing and formatting of terminal selection. |
| `terminalSelectionViewer.useChatGPT`               | `boolean` | `false`                                                                                                                                          | Enable or disable parsing of text using ChatGPT.                    |
| `terminalSelectionViewer.chatGPTApiKey`            | `string`  | `""`                                                                                                                                             | Your ChatGPT API key. Required if `useChatGPT` is `true`.           |
| `terminalSelectionViewer.chatGPTModel`             | `string`  | `"gpt-4o-mini"`                                                                                                                                | The ChatGPT model to use.                                           |
| `terminalSelectionViewer.fontSize`                 | `number`  | `14`                                                                                                                                             | Font size of the viewer window.                                     |
| `terminalSelectionViewer.chatGPTPrompt`            | `string`  | `"Please format the following data, respond with only the formatted data, do not put it in any file, only text"`                                 | Prompt to use when sending data to ChatGPT.                         |

### Example Settings
```json
{
  "terminalSelectionViewer.formatJson": true,
  "terminalSelectionViewer.useChatGPT": true,
  "terminalSelectionViewer.chatGPTApiKey": "your-openai-api-key",
  "terminalSelectionViewer.chatGPTModel": "gpt-4",
  "terminalSelectionViewer.fontSize": 16,
  "terminalSelectionViewer.chatGPTPrompt": "Format the following data and return only the formatted text:"
}
```
## ChatGPT Integration
To use ChatGPT for formatting:
  - Obtain API Key: Get your API key from OpenAI.
  - Set API Key: Add your API key to the extension settings under terminalSelectionViewer.chatGPTApiKey.
  - Enable ChatGPT Usage: Set terminalSelectionViewer.useChatGPT to true.

_(Completely **valid JSONs** will be automatically parsed **without using ChatGPT** even if it is enabled, to avoid unecessary costs. This can be changed by disabling JSON validation on the settings)_
  
    Note: Using ChatGPT may incur costs as per OpenAI's pricing. Ensure you understand the billing implications.

    
## Keyboard Shortcuts

    Windows/Linux: `Ctrl+Shift+J`
    macOS: `Cmd+Shift+J`

You can customize the keybinding in your `keybindings.json`:
```json
{
  "key": "ctrl+shift+j",
  "command": "extension.useTerminalSelection",
  "when": "terminalFocus && terminalTextSelected"
}
```
## Commands
- **Terminal: Parse Terminal Selection**
  - Command ID: extension.useTerminalSelection
  - Description: Parses the selected text in the terminal and displays it in a new window.

## Troubleshooting
- **ChatGPT API Errors:** If you encounter errors when using ChatGPT features, ensure your API key is correct and you have an active internet connection.
- **Invalid JSON:** If the selected text isn't valid JSON and ChatGPT is disabled or fails, the original text will be displayed unformatted.
- **Clipboard Issues:** The extension temporarily uses the clipboard to copy the terminal selection. Your clipboard content will be restored afterward.

## License

  This project is licensed under the Apache License, Version 2.0. See the [LICENSE](./LICENSE) file for the full text.

  All files within this repository, including source code, documentation, and data files (e.g., JSON files), are covered under this license.

  For more details, please refer to the [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).

