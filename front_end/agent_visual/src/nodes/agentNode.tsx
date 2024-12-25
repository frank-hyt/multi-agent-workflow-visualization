import { Handle, Position, type NodeProps } from '@xyflow/react';
import { type AgentNode, codeItem } from './types';
import { useContext } from 'react';
import {WorkFlowContext} from '../gobalState/nodeContext'
import '@xyflow/react/dist/style.css';
import { CloseButton } from "../components/ui/close-button"
import {Flex, Text, Box, Spinner} from "@chakra-ui/react"


function InputItem(){
    // componentRef.current?.getBoundingClientRect().top
    return (
        <>
            <Box padding='2px'>
                <Flex justifyContent="start" alignContent="center">
                    <Box bg="blackAlpha.600" p="1px" pl="4px" pr="4px" borderLeftRadius='full' >
                        <Text fontSize="10px" color="gray.300">Preprocess Input</Text>
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


function CoreItem(){
    return (
        <Box padding='2px'>
            <Box border="dashed" borderColor="white">
                <Flex justifyContent="space-between" alignContent={"center"}>
                    <Box bg="blackAlpha.600" p="1px" pl="4px" pr="4px" borderRadius='full' >
                        <Text fontSize="8px" color="gray.300">Memory</Text>
                    </Box>
                    <Box bg="blackAlpha.600" p="1px" pl="4px" pr="4px" borderRadius='full' >
                        <Text fontSize="8px" color="gray.300">Decision</Text>
                    </Box>
                </Flex>
            </Box>
        </Box>
    );

}


function ActionItem({actIDX, actioName, actionID}: {actIDX: number, actioName: string, actionID: string}) {
    return (
      <Box border="0.5px solid" borderColor={"gray.400"} pr="2px" h="17px">
            <Box bg="blackAlpha.600" p="1px" pl="4px" pr="4px" borderRightRadius={"full"}  >
                <Flex justifyContent={"end"} alignContent={"center"}>
                <Text fontSize="8px" color="gray.300">Act-{actioName}</Text>
                </Flex>
            </Box>
        <Handle id={actionID}
        type='source'
        position={Position.Right}
        style={{
            position: 'absolute',
            top: `${71 + 17*actIDX}px`, // 自定义位置
            width: '7px',
            height: '7px',
            backgroundColor: '#434343',
          }}
        onConnect={(params) => console.log('handle onConnect', params)}
        />
      </Box>
    );
  }
  
function ActionPart({actions}: {actions: Array<codeItem>}){
    if (actions.length == 0){
        return (
            <Box bg="blackAlpha.600"  border="dashed" borderColor={"gray"}>
                <Flex justifyContent={"center"} alignContent={"center"}>
                    <Text fontSize="10px" color="red">Need Add Action!</Text>
                </Flex>
            </Box>
            );
    }else{
        return (<div>
            {actions.map((item, index) => (
                <ActionItem  key={item.name} actIDX={index} actioName={item.name} actionID={item.name} />
            ))}
        </div>);
    }

}

// 自定义节点
export function AgentNode(props: NodeProps<AgentNode>){
    // global state
    const flowContext = useContext(WorkFlowContext);

    const handleDelete = ()=>{
        flowContext?.reactFlow.deleteElements({nodes:[{id: props.id}]});
        flowContext?.setFocusNodeID(undefined);
    }
    

    if (flowContext){
        return (
            <Box fontWeight={"bold"} roundedTop="md" bg="gray.400" _hover={{scale: "1.02"}} borderColor="blackAlpha.600" borderWidth={props.selected ? '1px' : 'none'}>
            {/* <div className='node-common-style' style={{border: props.selected ? '1px solid #000000' : 'none',}}> */}
                <Box bg="blackAlpha.700" roundedTop="md" >
                    <Flex gap="4" justify="space-between">
                        <Text color="white" paddingLeft="5px" textStyle="xs">{props.data.name}</Text>
                        {flowContext.runningNodeID == props.id ? <Spinner h={"20px"} color={"GrayText"} className='nodrag' ></Spinner>:
                        <CloseButton className='nodrag' boxSize={"20px"}  roundedTop="md" colorPalette='red' size='2xs' variant='solid'
                        onClick={handleDelete}></CloseButton>}
                    </Flex>
                </Box>
                <InputItem></InputItem>
                <CoreItem></CoreItem>
                <Box p={"1px"}>
                    <ActionPart actions={props.data.dynamicCodeBlocks}></ActionPart>
                </Box>
                
            {/* </div> */}
            </Box>
        
        );
    }
}  

