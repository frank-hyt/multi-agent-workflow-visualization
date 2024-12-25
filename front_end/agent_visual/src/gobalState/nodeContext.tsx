import { ReactNode, createContext, useState, useCallback, useEffect, } from "react";
import {
    addEdge,
    useNodesState,
    useEdgesState,
    useReactFlow,
    ReactFlowInstance,
    type OnConnect,
  } from '@xyflow/react';

import type { Edge, EdgeChange, NodeChange, OnEdgesChange, OnNodesChange } from '@xyflow/react';


import { initialNodes } from '../nodes';
import { initialEdges } from '../edges';
import type {AppNode} from '../nodes/types';
import {edgeBasic} from '../edges/index'

import {deleteNode, backNode2front, backEdge2front, 
    updateNode, frontNode2back, addNewEdge, deleteEdge,
    frontEdge2back} from '../api/basic_op'
import {readProj, getTaskStatus, getProjDir} from '../api/proj_op'


export interface ContextType {
    reactFlow: ReactFlowInstance,
    // nodes flow control
    nodes: Array<AppNode>, 
    edges: Array<Edge>, 
    onConnect: OnConnect,
    onEdgesChange: OnEdgesChange, 
    // single nodes control
    focusEdgeID: string|undefined,
    setFocusEdgeID: (v:string|undefined)=>void,
    focusNodeID: string|undefined,
    setFocusNodeID: (v:string|undefined)=>void,
    // setFocusNodeID: (node_id: string|undefined)=>void,
    onNodesChange: OnNodesChange<AppNode>,
    isFloatWinVisible: boolean,
    setFloatIsVisible: (value: boolean) => void,
    focusCodeIndex: number|undefined, 
    setFocusCodeIndex: (state: number|undefined) => void,
    projDir: string,
    setProjDir: (state:string) => void,
    // task info
    isTaskRunning: boolean,
    setTaskRunning: (state: boolean) => void,
    runningNodeID: string|undefined,
}


// 创建 Context
export const WorkFlowContext = createContext<ContextType|null>(null);


// Provider 组件
export const FlowProvider = ({ children }: {children: ReactNode}) => {
    const reactFlow = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [projDir, setProjDir] = useState("./default_proj/");
    const [focusEdgeID, setFocusEdgeID] = useState<string|undefined>(undefined);
    const [focusNodeID, setFocusNodeID] = useState<string|undefined>(undefined);
    const [focusCodeIndex, setFocusCodeIndex] = useState<number|undefined>(undefined);
    const [isFloatWinVisible, setFloatIsVisible] = useState(false);
    // runtime
    const [isTaskRunning, setTaskRunning] = useState(false);
    const [runningNodeID, setRunningNodeID] = useState<string|undefined>();
    const [runningEdgeID, setRunningEdgeID] = useState<string|undefined>();


    

    useEffect(() => {
        let intervalId: number;
            
        // status load
        const fetchTaskStatus = async () => {
            try {
                if (isTaskRunning){
                    const taskStatus = await getTaskStatus();
                    if (!taskStatus.taskAlive || taskStatus.taskStatus != 'running'){
                        setTaskRunning(false);
                        setRunningNodeID(undefined);
                        if (runningEdgeID){
                            reactFlow.updateEdge(runningEdgeID, {animated: false});
                            setRunningEdgeID(undefined);
                        }
                        return
                    }
                    // update cur node
                    if (taskStatus.curNode){
                        setRunningNodeID(taskStatus.curNode);
                    }
                    if (taskStatus.curEdge){
                        if (runningEdgeID){
                            reactFlow.updateEdge(runningEdgeID, {animated: false});
                        }
                        reactFlow.updateEdge(taskStatus.curEdge, {animated: true});
                        setRunningEdgeID(taskStatus.curEdge)
                    } 
                }
    
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        if (isTaskRunning) {
            // start periodically get status per 2s
            intervalId = setInterval(fetchTaskStatus, 1000);
        }
        return () => {
            // uninstall when isTaskRunning beacome false
            if (intervalId) clearInterval(intervalId);
        };
    }, [isTaskRunning, reactFlow, runningNodeID, runningEdgeID]);


    const handleNodesChange: OnNodesChange<AppNode> = (nodeChages: NodeChange<AppNode>[]) => {
        nodeChages.map(async (value, index) => {
            try{
                switch (value.type ){
                    case "remove": {
                        await deleteNode({nodeId: value.id})
                        setFocusNodeID(undefined)
                        break
                    }
                    case "position":{
                        if (!value.dragging){
                            const oldNode = reactFlow.getNode(value.id)
                            const newPosNode = {...oldNode, position: value.position}
                            await updateNode(frontNode2back(newPosNode as AppNode))
                        }
                        break
                    }
                    case "replace":{
                        const newNode = value.item
                        await updateNode(frontNode2back(newNode))
                        break
                    }
                    case "select":{
                        if (value.selected){
                            // console.log("setFocusNodeID", value.id)
                            // setFocusNodeID(value.id)
                            // setFocusEdgeID(undefined)
                        }
                        break
                    }
                }
                
            }catch (error){
                console.log("handleNodeChange", index, 'type', value)
                console.error("Error update nodes:", error);
                return
            }
        })
        return onNodesChange(nodeChages)
    }

    const handleEdgesChange: OnEdgesChange = (edgeChages: EdgeChange[]) => {
        edgeChages.map( async (value, index) => {
            try{
                switch (value.type ){
                    case "remove": {
                        const oldEdge = reactFlow.getEdge(value.id)
                        await deleteEdge(frontEdge2back({
                            id: oldEdge?.id as string, 
                            source: oldEdge?.source as string,
                            sourceHandle: oldEdge?.sourceHandle as string,
                            target: oldEdge?.target as string,
                            targetHandle: oldEdge?.targetHandle as string}))
                        break
                    }
                    case "select": {
                        // setFocusEdgeID(value.id)
                        // setFocusNodeID(undefined)
                        break
                    }
                }
            }catch (error){
                console.log("handleEdgesChange", index, 'type', value)
                console.error("Error update edges:", error);
                return
            }
        })
        return onEdgesChange(edgeChages)
    }

    // init data
    useEffect(() => {
        const fetchData = async () => {
            const response = await readProj();
            const newNodes = response.nodes.map((value) => backNode2front(value))
            setNodes(newNodes)
            const newEdges = response.edges.map((value) => backEdge2front(value))
            setEdges(newEdges)
            const projRsp = await getProjDir()
            setProjDir(projRsp)
        };
        fetchData();
      }, [projDir, setNodes, setEdges]); // only refresh all when dir change


    const onConnect: OnConnect = useCallback(
        async (connection) => {
            try{
                await addNewEdge(frontEdge2back({...connection, id: "new"} as edgeBasic));
            }catch (error){
                console.log("onConnect")
                console.error("Error onConnect edge:", error);
                return
            }
        setEdges((edges) => addEdge(connection, edges));},
      [setEdges]
    );

    const contextManager: ContextType = {
        reactFlow: reactFlow,
        nodes: nodes,
        edges: edges,
        onConnect: onConnect,
        onEdgesChange: handleEdgesChange, 
        focusEdgeID: focusEdgeID,
        setFocusEdgeID: setFocusEdgeID,
        focusNodeID: focusNodeID,
        setFocusNodeID: setFocusNodeID,
        // setFocusNodeID: setFocusNodeID,
        onNodesChange: handleNodesChange,

        isFloatWinVisible: isFloatWinVisible,
        setFloatIsVisible: setFloatIsVisible,
        focusCodeIndex: focusCodeIndex, 
        setFocusCodeIndex: setFocusCodeIndex,
        projDir: projDir,
        setProjDir: setProjDir,
        // task
        isTaskRunning: isTaskRunning,
        setTaskRunning: setTaskRunning,
        runningNodeID: runningNodeID,
    }

    return (
        <WorkFlowContext.Provider value={contextManager}>
        {children}
        </WorkFlowContext.Provider>
    );
};