import type { Node } from '@xyflow/react';
import {CodeBlock}  from '../api/type'

export enum CodeTypeEnum {
    className = "className",
    fixNameFunc = "fixNameFunction",
    renameAbleFunc = "renameAbleFunction",
    unknow = "unknow"
}

export type codeItem = CodeBlock

export type AgentNode = Node<{ 
    name: string,
    basicCodeBlocks: Array<codeItem>,
    dynamicCodeBlocks: Array<codeItem>}, 'agent'>;
    
export type InputNode = Node<{ 
    name: string,
    basicCodeBlocks: Array<codeItem>,
    dynamicCodeBlocks: Array<codeItem>}, 'inputNode'>;

export type OutputNode = Node<{ 
    name: string,
    basicCodeBlocks: Array<codeItem>,
    dynamicCodeBlocks: Array<codeItem>}, 'outputNode'>;


export type AppNode =  AgentNode | InputNode | OutputNode;





