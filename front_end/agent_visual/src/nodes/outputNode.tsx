import { Handle, Position, type NodeProps } from '@xyflow/react';
import {type OutputNode } from './types';
import { useContext, useState, useEffect } from 'react';
import {WorkFlowContext} from '../gobalState/nodeContext'
import { CloseButton } from "../components/ui/close-button"
import { TimelineItem, 
    TimelineRoot, 
    TimelineConnector, 
    TimelineContent } from "../components/ui/timeline"

import {Flex, Text, Box, For, Theme, Spinner} from "@chakra-ui/react"
import {logNode} from '../api/log_op'

function DataInComponent(){

    // componentRef.current?.getBoundingClientRect().top
    return (
        <>
            <Box padding='2px'>
                <Flex justifyContent="start" alignContent="center">
                    <Box bg="blackAlpha.600" p="1px" pl="4px" pr="4px" borderLeftRadius='full' >
                        <Text fontSize="10px" color="gray.300">Process Final Output</Text>
                    </Box>
                </Flex>
            </Box>
            <Handle id="input"
            type='target'
            position={Position.Left}
            style={{
                position: 'absolute',
                top: `30px`, // 自定义位置
                width: '7px',
                height: '7px',
                backgroundColor: '#434343',
            }}
            onConnect={(params) => console.log('handle onConnect', params)}
            />
        </>
    );
}

function DataShow({nodeID}:{nodeID: string}){
    const flowContext = useContext(WorkFlowContext);
    const [logData, setLogData] = useState<string[]>([]);

    

    useEffect(() => {
        let intervalId: number;

        const fetchData = async () => {
            try {
                const logStringList = await logNode({nodeId: nodeID}); // log of node
                if (logStringList.length != logData.length){
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
    }, [flowContext?.isTaskRunning, logData, nodeID]);

    return (
        <>
        <Box className='nodrag' padding={"2px"} maxW="160px" maxHeight={"170px"} overflowY={"auto"}>
            <TimelineRoot bg={"white"} padding={"4px"}>
                <For each={logData}>
                    {(value, idx)=>(
                        <TimelineItem key={idx} mb={"-3"}>
                            <TimelineConnector ml={"0.5"} mr={"-1"} h={"13px"} w={"13px"} fontSize={"5px"}>log</TimelineConnector>
                            <TimelineContent ml={"-2"}>
                                <Text whiteSpace={"pre-wrap"}  fontSize={"8px"}>{value}</Text>
                            </TimelineContent>
                        </TimelineItem>
                    )}
                </For>
            </TimelineRoot>
        </Box>
        </>
    )
}

// 自定义节点
export function OutputNode(props: NodeProps<OutputNode>){
    // global state
    const flowContext = useContext(WorkFlowContext);

    const handleDelete = ()=>{
        flowContext?.reactFlow.deleteElements({nodes:[{id: props.id}]});
        flowContext?.setFocusNodeID(undefined);
    }

    if (flowContext){
        return (
            <Theme appearance="light" roundedTop="md">
                <Box maxWidth={"200px"} fontWeight={"bold"} roundedTop="md" bg="gray.400" _hover={{scale: "1.02"}} borderColor="blackAlpha.600" borderWidth={props.selected ? '1px' : 'none'}>
                {/* <div className='node-common-style' style={{border: props.selected ? '1px solid #000000' : 'none',}}> */}
                    <Box bg="blackAlpha.700" roundedTop="md" >
                        <Flex gap="4" justify="space-between">
                            <Text color="white" paddingLeft="5px" textStyle="xs">{props.data.name}</Text>
                            {flowContext.runningNodeID == props.id ? <Spinner h={"20px"} color={"GrayText"} className='nodrag' ></Spinner>:
                            <CloseButton  className='nodrag' boxSize={"20px"} roundedTop="md" 
                            colorPalette='red' size='2xs' variant='solid'
                            onClick={handleDelete}>
                                </CloseButton>}
                        </Flex>
                    </Box>
                    <DataInComponent></DataInComponent>
                    <DataShow nodeID={props.id}></DataShow>
                {/* </div> */}
                </Box>
            </Theme>
        
        );
    }
}  