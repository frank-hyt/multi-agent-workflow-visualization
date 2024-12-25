import { useContext, useState, useEffect } from 'react';
import {WorkFlowContext} from '../gobalState/nodeContext'
import { TimelineItem, 
    TimelineRoot, 
    TimelineConnector, 
    TimelineContent } from "../components/ui/timeline"

import { Text, Box, For} from "@chakra-ui/react"
import {logNode} from '../api/log_op'



export default function SideBarLog(){
    const flowContext = useContext(WorkFlowContext);
    const [logData, setLogData] = useState<string[]>([]);    

    useEffect(() => {
        let intervalId: number;

        const fetchData = async () => {
            try {
                let logStringList;
                if (flowContext?.focusNodeID){
                    logStringList = await logNode({nodeId: flowContext?.focusNodeID});
                }else{
                    if (flowContext?.focusEdgeID){
                        const edgeInstance = flowContext.reactFlow.getEdge(flowContext?.focusEdgeID)
                        logStringList = await logNode({nodeId: edgeInstance?.source as string, nodeAct: edgeInstance?.sourceHandle as string});
                    }
                }
                 // log of node
                if (logStringList){
                    setLogData(logStringList);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();

        if (flowContext?.isTaskRunning) {
            // start periodically call per 5s
            intervalId = setInterval(fetchData, 1000);
        }
        return () => {
            // uninstall when isTaskRunning beacome false
            if (intervalId) clearInterval(intervalId);
        };
    }, [flowContext?.isTaskRunning, flowContext?.reactFlow, flowContext?.focusNodeID, flowContext?.focusEdgeID]);

    return (
        <>
        <Box padding={"2px"} w={"99%"} overflowY={"auto"}>
            <TimelineRoot bg={"white"} padding={"4px"}>
                <For each={logData}>
                    {(value, idx)=>(
                        <TimelineItem key={idx} mb={"-3"}>
                            <TimelineConnector ml={"0.5"} mr={"-1"} h={"13px"}  w={"13px"} fontSize={"5px"}>log</TimelineConnector>
                            <TimelineContent ml={"-2"}>
                                <Text whiteSpace={"pre-wrap"} fontSize={"13px"}>{value}</Text>
                            </TimelineContent>
                        </TimelineItem>
                    )}
                </For>
            </TimelineRoot>
        </Box>
        </>
    )
}