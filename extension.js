// Copyright 2024 Neospace.AI

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


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

      // Restore the original clipboard content
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
                language = 'markdown'; // Adjust based on response format
                done = true;
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
      panel.webview.html = getWebviewContent(formattedText, language, fontSize);


      // Restore the original clipboard content
      await vscode.env.clipboard.writeText(previousClipboard);

    } catch (error) {
      await vscode.env.clipboard.writeText(previousClipboard);
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
  });
  context.subscriptions.push(disposable);
}

function getWebviewContent(content, language, fontSize) {
  // Escape HTML special characters
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Include Highlight.js for syntax highlighting
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Terminal Selection</title>
    <style>
        body {
            font-family: monospace;
            margin: 0;
            padding: 10px;
            background-color: transparent;
            color: #d4d4d4;
            font-size: ${fontSize}px;
        }
        pre, code {
            background-color: transparent; 
        }
        .hljs {
            background-color: transparent;
        }
        /* Highlight.js styles */
        ${getHighlightStyles()}
    </style>
</head>
<body>
    <pre><code class="${language}">${escapedContent}</code></pre>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
    <script>
        hljs.highlightAll();
    </script>
</body>
</html>`;
}


function getHighlightStyles() {
  // Optional: You can include a custom style or link to a CDN
  return `
        /* Example style for JSON */
        .hljs-keyword { color: #569CD6; }
        .hljs-string { color: #CE9178; }
        .hljs-number { color: #B5CEA8; }
        .hljs-attribute { color: #9CDCFE; }
    `;
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