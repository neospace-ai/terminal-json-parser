/*
 * Copyright 2024 NEOSPACE AI TECHNOLOGIES
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const vscode = require('vscode');
const https = require('https');

function activate(context) {
  let disposable = vscode.commands.registerCommand('extension.parseTerminalSelection', async function () {
    try {
      // Get the user configuration
      const config = vscode.workspace.getConfiguration('terminalSelectionViewer');
      const formatJson = config.get('formatJson');
      const useChatGPT = config.get('useChatGPT');
      const chatGPTApiKey = config.get('chatGPTApiKey');
      const chatGPTModel = config.get('chatGPTModel');
      const fontSize = config.get('fontSize');
      const chatGPTPrompt = config.get('chatGPTPrompt');


      // Save the current clipboard content
      const previousClipboard = await vscode.env.clipboard.readText();

      // Clear the clipboard
      await vscode.env.clipboard.writeText("");

      // Copy the terminal selection to the clipboard
      await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
      // Read the copied text from the clipboard

      const selectedText = await vscode.env.clipboard.readText();

      if(selectedText == ""){
        await vscode.env.clipboard.writeText(previousClipboard);
        return;
      }

      // Initialize variables
      let messages = [];
      let language = 'plaintext';
      let done = false;
      if (formatJson) {
        try {
          const jsonObject = JSON.parse(selectedText);
          messages.push(JSON.stringify(jsonObject, null, 4)); // Format JSON with 4 spaces
          language = 'json';
          done = true;
        } catch (e) {
          // Not valid JSON, keep the original text
        }
      }
      if (!done && useChatGPT) {
        if (chatGPTApiKey) {
          try {
            await vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Notification,
                title: 'Processing with ChatGPT...',
                cancellable: false,
              },
              async () => {
                const chatGPTResponse = await callChatGPT(chatGPTApiKey, chatGPTModel, selectedText, chatGPTPrompt);
                messages.push(chatGPTResponse);
                done = true;
                try{
                  JSON.parse(chatGPTResponse);
                  language = 'json';
                } catch (e) {
                  // Not valid JSON, keep the original GPT Response
                }
              }
            );
          } catch (error) {
            vscode.window.showErrorMessage(`ChatGPT Error: ${error.message}`);
            messages.push("ChatGPT API error. Using normal formatting.");
            language = 'plaintext';
          }


        } else {
          vscode.window.showErrorMessage('ChatGPT API key is not set. Please provide it in the extension settings.');
          messages.push("ChatGPT API key is not set. Using normal formatting.");
          language = 'plaintext';
        }
      }
      if (!done) {
        // Keep the original text
        messages.push(selectedText);
      }

      // Combine all messages into the final formattedText
      let formattedText = messages.join('\n\n');

      // Create a webview panel to display the content
      const panel = vscode.window.createWebviewPanel(
        'terminalSelectionView',
        'Terminal Selection',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: false,
        }
      );

      // Set the HTML content of the webview
      panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, formattedText, language, fontSize);

      // Add message handler to receive messages from the webview
      panel.webview.onDidReceiveMessage(
        async (message) => {
          switch (message.command) {
            case 'copy':
              try {
                await vscode.env.clipboard.writeText(message.text);
                vscode.window.showInformationMessage('Content copied to clipboard.');
              } catch (e) {
                vscode.window.showErrorMessage('Failed to copy content to clipboard.');
              }
              break;
          }
        },
        undefined,
        context.subscriptions
      );

      // Restore the original clipboard content
      await vscode.env.clipboard.writeText(previousClipboard);

    } catch (error) {
      await vscode.env.clipboard.writeText(previousClipboard);
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
  });
  context.subscriptions.push(disposable);
}
function getWebviewContent(webview, extensionUri, content, language, fontSize) {
  // Get the URI for the copy icon
  const copyIconUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'images', 'copy_icon.png')
  );

  // Escape HTML special characters
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Create a nonce to allow only specific scripts to run
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Terminal Selection</title>
    <style>
        body {
            font-family: var(--vscode-editor-font-family, monospace);
            margin: ;
            padding: 5;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-size: ${fontSize}px;
            position: relative;
        }
        pre, code {
            background-color: transparent; 
        }
        code {
            font-family: var(--vscode-editor-font-family, monospace);
        }
        #copyButtonContainer {
            position: absolute;
            top: 5px;
            right: 10px;
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 5px;
            padding: 5px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        #copyButtonContainer:hover {
            background-color: var(--vscode-toolbar-hoverBackground);
        }
        #copyButtonContainer img {
            width: 24px;
            height: 24px;
            filter: var(--vscode-icon-foreground); /* Adjust icon color based on theme */
        }
        /* Syntax highlighting styles */
        ${getSyntaxHighlightingStyles()}
    </style>
</head>
<body>
    <div id="copyButtonContainer">
        <img id="copyButton" src="${copyIconUri}" alt="Copy" />
    </div>
    <pre><code>${escapedContent}</code></pre>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        document.getElementById('copyButtonContainer').addEventListener('click', () => {
            vscode.postMessage({
                command: 'copy',
                text: ${JSON.stringify(content)}
            });
        });

        // Syntax highlighting function
        (function() {
            const codeBlocks = document.querySelectorAll('code');
            codeBlocks.forEach(block => {
                const code = block.innerHTML;
                if ('${language}' === 'json') {
                    block.innerHTML = syntaxHighlightJSON(code);
                }
            });
        })();

        function syntaxHighlightJSON(json) {
            json = json.replace(/&quot;/g, '"');
            return json.replace(/("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\\s*:)?|\\b(?:true|false|null)\\b|-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)/g, function (match) {
                let cls = 'number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'key';
                    } else {
                        cls = 'string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'boolean';
                } else if (/null/.test(match)) {
                    cls = 'null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        }
    </script>
</body>
</html>`;
}

function getSyntaxHighlightingStyles() {
  return `
    .key {
      color: var(--vscode-editorSyntax-keywordForeground, #569CD6);
    }
    .string {
      color: var(--vscode-editorSyntax-stringForeground, #CE9178);
    }
    .number {
      color: var(--vscode-editorSyntax-numberForeground, #B5CEA8);
    }
    .boolean {
      color: var(--vscode-editorSyntax-booleanForeground, #569CD6);
    }
    .null {
      color: var(--vscode-editorSyntax-nullForeground, #569CD6);
    }
  `;
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function callChatGPT(apiKey, model, userContent, prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: `${prompt}\n\n${userContent}` }
      ]
    });

    // Optional: Log the data being sent for debugging
    console.log("Data sent to OpenAI:", data);

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        // Remove or comment out the Content-Length header
        // 'Content-Length': data.length
      }
    };

    const req = https.request(options, res => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const responseJson = JSON.parse(responseData);
            const message = responseJson.choices[0].message.content;
            resolve(message);
          } catch (e) {
            reject(new Error('Invalid response from ChatGPT API'));
          }
        } else {
          let errorDetail = '';
          try {
            const errorResponse = JSON.parse(responseData);
            errorDetail = errorResponse.error.message;
          } catch (e) {
            errorDetail = responseData;
          }

          reject(new Error(`ChatGPT API returned status code ${res.statusCode}: ${errorDetail}`));
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    // Pass the data directly to req.end()
    req.end(data);
  });
}


function deactivate() {}

module.exports = {
  activate,
  deactivate
};