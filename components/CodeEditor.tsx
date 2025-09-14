import React, { useRef, useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';

interface CodeEditorProps {
    initialCode: string;
    onCodeChange: (code: string) => void;
    fileName?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ initialCode, onCodeChange, fileName }) => {
    const webViewRef = useRef<WebView>(null);
    const [isEditorReady, setIsEditorReady] = useState(false);

    // Get editor mode based on file extension
    const getEditorMode = (fileName?: string) => {
        if (!fileName) return 'ace/mode/javascript';

        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'py':
                return 'ace/mode/python';
            case 'js':
            case 'jsx':
                return 'ace/mode/javascript';
            case 'ts':
            case 'tsx':
                return 'ace/mode/typescript';
            case 'json':
                return 'ace/mode/json';
            case 'html':
            case 'htm':
                return 'ace/mode/html';
            case 'css':
                return 'ace/mode/css';
            case 'md':
                return 'ace/mode/markdown';
            case 'xml':
                return 'ace/mode/xml';
            case 'yaml':
            case 'yml':
                return 'ace/mode/yaml';
            default:
                return 'ace/mode/text';
        }
    };

    // Track if this is the first load to avoid cursor position issues
    const [hasLoadedInitialContent, setHasLoadedInitialContent] = useState(false);
    const [lastFileName, setLastFileName] = useState<string | undefined>(undefined);

    // Update editor content and mode when initialCode or fileName changes
    useEffect(() => {
        if (isEditorReady && webViewRef.current) {
            const mode = getEditorMode(fileName);
            let script = `
                if (window.setEditorMode) {
                    window.setEditorMode("${mode}");
                }
            `;

            // Only set content if it's a new file or first load
            const isNewFile = fileName !== lastFileName;
            if (initialCode && (isNewFile || !hasLoadedInitialContent)) {
                script += `
                    if (window.setEditorContent) {
                        window.setEditorContent(\`${initialCode.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);
                    }
                `;
                setHasLoadedInitialContent(true);
                setLastFileName(fileName);
            } else if (isNewFile) {
                setHasLoadedInitialContent(false);
                setLastFileName(fileName);
            }

            webViewRef.current.injectJavaScript(script);
        }
    }, [initialCode, fileName, isEditorReady, hasLoadedInitialContent, lastFileName]);

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'ready') {
                console.log('Editor is ready');
                setIsEditorReady(true);
                // Set initial mode and content if provided
                const mode = getEditorMode(fileName);
                let script = `
                    if (window.setEditorMode) {
                        window.setEditorMode("${mode}");
                    }
                `;

                if (initialCode) {
                    script += `
                        if (window.setEditorContent) {
                            window.setEditorContent(\`${initialCode.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);
                        }
                    `;
                }

                webViewRef.current?.injectJavaScript(script);
            } else if (data.type === 'change') {
                onCodeChange(data.content);
            }
        } catch (error) {
            // Handle non-JSON messages (fallback for plain text)
            console.log("Non-JSON message from WebView:", event.nativeEvent.data);
            onCodeChange(event.nativeEvent.data);
        }
    };

    const handleError = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        console.warn('WebView error: ', nativeEvent);
    };

    const handleLoadEnd = () => {
        console.log("WebView finished loading editor");
    };

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code Editor</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: monospace;
                    overflow: hidden;
                }
                #editor {
                    height: 100vh;
                    width: 100vw;
                }
            </style>
        </head>
        <body>
            <div id="editor"></div>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.8/ace.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.8/mode-javascript.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.8/mode-python.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.8/mode-typescript.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.8/mode-json.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.8/mode-html.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.8/mode-css.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.8/mode-markdown.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.8/mode-xml.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.8/mode-yaml.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.8/mode-text.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.8/theme-monokai.min.js"></script>
            <script>
                // Initialize Ace Editor
                const editor = ace.edit("editor");

                // Set editor configuration
                editor.setTheme("ace/theme/monokai");
                editor.session.setMode("ace/mode/javascript");
                editor.setOptions({
                    enableBasicAutocompletion: true,
                    enableSnippets: true,
                    enableLiveAutocompletion: true,
                    fontSize: 14,
                    wrap: true
                });

                // Set initial value
                editor.setValue("// Start coding here!", -1);

                // Listen for content changes and send to React Native
                editor.session.on('change', function(delta) {
                    const content = editor.getValue();
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'change',
                            content: content
                        }));
                    }
                });

                // Global function to set editor content from React Native
                window.setEditorContent = function(content) {
                    const cursorPosition = editor.getCursorPosition();
                    editor.setValue(content, -1);
                    // Restore cursor position if it was valid
                    try {
                        editor.moveCursorToPosition(cursorPosition);
                        editor.clearSelection();
                    } catch (e) {
                        // If position is invalid, just move to end
                        editor.navigateFileEnd();
                    }
                };

                // Global function to set editor mode from React Native
                window.setEditorMode = function(mode) {
                    editor.session.setMode(mode);
                };

                // Global function to get editor content
                window.getEditorContent = function() {
                    return editor.getValue();
                };

                // Notify React Native that editor is ready
                window.addEventListener('load', function() {
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'ready',
                            content: editor.getValue()
                        }));
                    }
                });

                // Focus editor when page loads
                editor.focus();
            </script>
        </body>
        </html>
    `;

    return (
        <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            onMessage={handleMessage}
            onError={handleError}
            onLoadEnd={handleLoadEnd}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            mixedContentMode="always"
            originWhitelist={['*']}
            style={{ flex: 1 }}
        />
    );
};

export default CodeEditor;
