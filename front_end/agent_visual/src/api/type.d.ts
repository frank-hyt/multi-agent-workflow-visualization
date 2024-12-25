export interface CodeBlock {
    code: string;
    name: string;
    prefix: string;
    codeType: string;
    numLines: number;
    blockIndex: number;
}

export interface NodeData {
    name: string,
    basicCodeBlocks: CodeBlock[];
    dynamicCodeBlocks: CodeBlock[];
}

export interface agentNode{
    id: string;
    type: string;
    posX: number;
    posY: number;
    data: NodeData;
}

export interface agentEdge{
    id: string;
    source_id: string;
    source_act: string;
    target_id: string;
}


// request
export interface ProjDir{
    value: string;
}

export interface NodeAdd{
    nodeType: string;
}

export interface NodeUpdateByCode{    
    nodeId: string
    wholeNodeCode: string
}

export interface NodeRM{
    nodeId: string;
}

export interface NodeLog{
    nodeId: string;
    nodeAct?: string;
}


export interface ProjUpdate{
    nodes: agentNode[];
    edges: agentEdge[];
}

export interface  RunTask{
    nodeId: string;
    nodeAct: string;
}


// rsp
export interface TaskStatus{
    taskStatus: string|null;
    curNode?: string|null;
    curEdge?: string|null;
    taskAlive: boolean;
}


export type requestData = NodeAdd|NodeUpdate|NodeLog|NodeRM|ProjDir|ProjUpdate|NodeUpdateByCode


