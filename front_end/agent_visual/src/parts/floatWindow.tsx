import './floatWindow.css';
import {WorkFlowContext}  from '../gobalState/nodeContext'
import {backNode2front, parserNodeByCode} from "../api/basic_op"
import { useState, useRef, useContext } from 'react';
import {Editor} from "@monaco-editor/react";
import { editor, Position, IDisposable } from 'monaco-editor';
import {AppNode } from "../nodes/types";

import {Monaco, joinCode, sendRequest, completeRsp, diagnosticRsp, suggestionLSP} from './monacoHelper'


export default function FloatingWindow() {
    const flowContext = useContext(WorkFlowContext)
    const currentNodeID = flowContext?.focusNodeID as string
    const [codeEdit, setCodeEdit] = useState<string|undefined>();
    const editorRef = useRef<editor.IStandaloneCodeEditor>();
    const monacoRef = useRef<Monaco>();
    const socketRef = useRef<WebSocket>();
    const disposableRef = useRef<IDisposable>();
    const currentNode = flowContext?.reactFlow.getNode(currentNodeID) as AppNode
    const codeIndex =  flowContext?.focusCodeIndex
    const curProj = flowContext?.projDir as string
   
    const handleContentChange = (value: string | undefined, ev: editor.IModelContentChangedEvent) => {
        setCodeEdit(value);
        // console.log("ev.changes", ev.changes)
        console.log("onChange-flowContext?.focusNodeID", flowContext?.focusNodeID)
        const params = {
            textDocument: { uri: `${flowContext?.projDir}/${flowContext?.focusNodeID}`, version: 1},
            contentChanges: ev.changes.map((change) => ({
            range: {
                start: { line: change.range.startLineNumber - 1, character: change.range.startColumn - 1 },
                end: { line: change.range.endLineNumber - 1, character: change.range.endColumn - 1 },
            },
            text: change.text,
            })),
        };
        sendRequest(socketRef.current as WebSocket,"textDocument/didChange", params).then(()=> console.log("update code content"));
    }

    const handleEditorMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco)=>{
        const socket = new WebSocket('ws://localhost:5001');
        socketRef.current = socket;
        editorRef.current = editor;
        monacoRef.current = monaco;

        const code_blocks = currentNode.data.basicCodeBlocks.concat(currentNode.data.dynamicCodeBlocks)
        const initCode = joinCode(code_blocks)
        setCodeEdit(initCode)

        // @ts-expect-error provideCompletionItems permit a promise return
        const handleProvideCompletionItems = async (_, position: Position)=>{
            // 构建 LSP 的 completion 请求参数
            console.log("onCompletion-flowContext?.focusNodeID", flowContext?.focusNodeID)
            const params = {
                textDocument: { uri: `${flowContext?.projDir}/${flowContext?.focusNodeID}` },
                position: {
                    line: position.lineNumber - 1,
                    character: position.column - 1,
                },
                context: { triggerKind: 1 }, // 1 表示手动触发
            };
        
            // 发送 LSP 请求到服务器
            const result = await sendRequest(socketRef.current as WebSocket, 'textDocument/completion', params) as completeRsp;
            // 将 LSP 补全结果转换为 Monaco 格式
            const suggestions = result.items.map((item: suggestionLSP) => ({
                label: item.label,
                kind: monaco.languages.CompletionItemKind[item.kind] || monaco.languages.CompletionItemKind.Text,
                insertText: item.insertText || item.label,
                range: {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endColumn: position.column,
                },
            }));
            return {suggestions};
        }

        socket.onopen = () => {
            // 初始化 LSP 客户端
            // console.log("onopen-flowContext?.focusNodeID", flowContext?.focusNodeID)
            sendRequest(socket, 'initialize', { capabilities: {},  rootUri: curProj, }).then(() => {console.log('LSP initialized');});
            sendRequest(socket, 'textDocument/didOpen',{
                    textDocument: { uri: `${flowContext?.projDir}/${flowContext?.focusNodeID}`, languageId: "python", text: initCode, version: 1},
                }
            ).then(() => {console.log('LSP open file');});
        };

        if (codeIndex){
            const code_blocks = currentNode.data.basicCodeBlocks.concat(currentNode.data.dynamicCodeBlocks)
            const initalCodeIndex = code_blocks[codeIndex].blockIndex
            code_blocks.sort((a, b) => a.blockIndex - b.blockIndex);
            const codePos = code_blocks.filter((value)=>value.blockIndex<initalCodeIndex).map((value)=>value.numLines).reduce((accumulator, currentValue) => accumulator + currentValue+1, 0)
            // console.log("codePos", codePos)
            editor.focus()
            editor.setPosition({ lineNumber: codePos, column: 1 });
            editor.revealLineInCenter(codePos);
            
        }

        const disposable = monaco.languages.registerCompletionItemProvider('python', {
            // 补全触发字符
            triggerCharacters: ['.', ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'],
        
            // 提供补全项
            // @ts-expect-error provideCompletionItems permit a promise return
            provideCompletionItems:  handleProvideCompletionItems
        });
        disposableRef.current = disposable
    };
        
    const handleClose = async () => {
        const params = {
            textDocument: { uri: `${flowContext?.projDir}/${flowContext?.focusNodeID}` }
        };
        // 发送 LSP 请求到服务器
        const diagnostics = await sendRequest(socketRef.current as WebSocket, 'textDocument/diagnostic', params) as Array<diagnosticRsp>;
        console.log(diagnostics)
        if (diagnostics.length>0){
            // 处理返回的诊断信息，更新编辑器中的高亮显示
            const markers = diagnostics.map(diagnostic => ({
                severity: (monacoRef.current as Monaco).MarkerSeverity.Error,
                startLineNumber: diagnostic.range.start.line + 1,
                startColumn: diagnostic.range.start.character + 1,
                endLineNumber: diagnostic.range.end.line + 1,
                endColumn: diagnostic.range.end.character + 1,
                message: diagnostic.message,
            }));
            if (editorRef.current){
                (monacoRef.current as Monaco).editor.setModelMarkers((editorRef.current.getModel() as editor.ITextModel), 'python', markers);
            }
            return
        }
        disposableRef.current?.dispose()
        const newNode = await parserNodeByCode({nodeId: currentNodeID, wholeNodeCode: codeEdit as string})
        flowContext?.reactFlow.updateNode(currentNodeID, backNode2front(newNode))
        flowContext?.setFloatIsVisible(false)
        socketRef.current?.close()
    };
    
    return (
        <div>
            {/* floatWindow */}
            {flowContext?.isFloatWinVisible && (
            <div className="floating-window">
                <div className="floating-header">
                    <span>Python Editor</span>
                    <button className="close-button" onClick={handleClose}>
                        Submit
                    </button>
                </div>
                <div className="floating-body">
                    <Editor
                    height='100%' 
                    language="python"
                    theme="vs-dark"
                    value={codeEdit}
                    options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                    }}
                    onMount={handleEditorMount}
                    onChange={handleContentChange}
                    />
                </div>
            </div>
            )}
    
            {/* back bg */}
            {flowContext?.isFloatWinVisible && <div className="overlay" />}
        </div>
    );
}

