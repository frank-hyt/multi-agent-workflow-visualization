import {agentEdge, agentNode, NodeAdd, NodeRM, NodeUpdateByCode} from './type';
import { post } from './index';
import {AppNode} from '../nodes/types'
import {edgeBasic} from '../edges/index'

// addNode
export const addNode = (data: NodeAdd): Promise<agentNode> =>
  post('/add_one_node', data);

// updateNode
export const updateNode = (data: agentNode): Promise<string> =>
    post('/update_one_node', data);

// updateNode
export const parserNodeByCode = (data: NodeUpdateByCode): Promise<agentNode> =>
    post('/parser_node_by_code', data);

// deleteNode
export const deleteNode = (data: NodeRM): Promise<null> =>
    post('/delete_one_node', data);

// addedge
export const addNewEdge = (data: agentEdge): Promise<null> =>
    post('/add_one_edge', data);

// deleteedge
export const deleteEdge = (data: agentEdge): Promise<null> =>
    post('/delete_one_edge', data);


export const backNode2front = (data: agentNode) => {
    const newNode = {
        id: data.id,
        type: data.type,
        position: { x: data.posX, y: data.posY },
        data: {
            name: data.data.name,
            basicCodeBlocks: data.data.basicCodeBlocks,
            dynamicCodeBlocks: data.data.dynamicCodeBlocks,
        }
    } as AppNode;
    return newNode
}


export const frontNode2back = (data: AppNode) => {
    const newNode = {
        id: data.id,
        type: data.type,
        posX: data.position.x,
        posY: data.position.y,
        data: {
            name: data.data.name,
            basicCodeBlocks: data.data.basicCodeBlocks,
            dynamicCodeBlocks: data.data.dynamicCodeBlocks
        }
    } as agentNode;
    return newNode
}


export const backEdge2front = (data: agentEdge) => {
    const newNode = {
        id: data.id,
        source: data.source_id,
        target: data.target_id,
        sourceHandle: data.source_act,
        targetHandle: 'input',
    } as edgeBasic;
    return newNode
}


export const frontEdge2back = (data: edgeBasic) => {
    const newNode = {
        id: data.id,
        source_id: data.source,
        target_id: data.target,
        source_act: data.sourceHandle,
    } as agentEdge;
    return newNode
}




