Milestone 2: Local File System Access
The goal is to read and write to user-selected project folders, replacing the native SAF/JGit calls with their JavaScript equivalents.

Install File System Libraries:

File Picker (The SAF wrapper): npx expo install react-native-document-picker

File System API: npx expo install react-native-fs. This library can read/write files using the URIs provided by the document picker.

Implement Folder Picker: Create an "Open Folder" button that calls DocumentPicker.pickDirectory(). This returns a URI for the user-selected folder. Persist this URI in your app's state (e.g., using Zustand or Redux).

Build File Tree Component: Use RNFS.readDir(uri) to recursively list the files and folders from the selected URI. Render this as a tappable list in a navigation drawer.

Wire Read/Write:

Read: On file tap, use RNFS.readFile(fileUri, 'utf8') to get the text content. Pass this content string to your <CodeEditor> component's state, which then injects it into the WebView.

Write (Save): Create a save button that gets the latest content from the editor (via onMessage or an injected JS call) and writes it back using RNFS.writeFile(fileUri, content, 'utf8').

This is phase 2 of my project, but since this is running on an android app what code is this even going to look at. my android phone doesn't have any local code