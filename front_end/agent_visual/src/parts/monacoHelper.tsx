import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import {codeItem } from "../nodes/types";

export interface textDocument{
    uri: string,
    languageId?: string, 
    text?: string, 
    version?: number
}

export interface MonacoPositionReq{
    line: number,
    character: number,
}

export interface CompleteContet{
    triggerKind: number
}

export interface completReq{
    textDocument: textDocument,
    position: MonacoPositionReq
    context: CompleteContet
}

export interface openReq{
    textDocument: textDocument,
}

interface initReq{
    capabilities: object,  
    rootUri: string,
}


export interface suggestionLSP{
    label: string,
    kind: number,
    detail: string,
    documentation: string,
    insertText: string,
    text_edit:{
        range: rangeLSP,
        new_text: string
    }
}

export interface completeRsp{
    is_incomplete: boolean,
    items: suggestionLSP[],
}

interface rangeLSP {
    start: {
        line: number,
        character: number,
    },
    end: {
        line: number,
        character: number,
    },
}

export interface diagnosticRsp{
    range: rangeLSP,  
    message: string,
    severity: number
    source: string,
}


export type Monaco = typeof monaco;


export const sendRequest = (socket: WebSocket, method: string, params: completReq|openReq|initReq) => {
    return new Promise<diagnosticRsp[]|completeRsp>((resolve) => {
        const id = Math.floor(Math.random() * 10000);
        const request = {
            jsonrpc: '2.0',
            id,
            method,
            params,
        };
        socket.send(JSON.stringify(request));
        socket.onmessage = (event) => {
        const response = JSON.parse(event.data);
        // console.log(response)
        if (response.id === id) {
            resolve(response.result);
        }
        };
    });
}


export const joinCode = (codeItems: codeItem[]) => {
    return codeItems.map((value) => {
        if (value.name == "import"){
            return value.code
        }
        return value.code+"\n"
    }).join("\n")
}


