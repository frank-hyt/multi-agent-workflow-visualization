import { Handle, Position, type NodeProps } from '@xyflow/react';
import { type InputNode } from './types';
import { useContext, useState } from 'react';
import {WorkFlowContext} from '../gobalState/nodeContext'
import { CloseButton } from "../components/ui/close-button"
import {Flex, Text, Box, Textarea, HStack, Button, Spinner } from "@chakra-ui/react"
import { Switch } from "../components/ui/switch"
import {runProj} from '../api/proj_op'
import {updateNode, frontNode2back} from '../api/basic_op'


interface NodeSubProps {
    node_id: string;
    checked: boolean;
    setChecked: (v:boolean)=>void;
    content: string;
    setContent: (v:string)=>void;
  }
  
  function LoadingButton({node_id, checked, content, }: NodeSubProps){
    const flowContext = useContext(WorkFlowContext);
    const currentNode = flowContext?.reactFlow.getNode(node_id) as InputNode

    const handleRunProj = async () => {
        if (checked){
            const funcCode = [
                " ".repeat(4)+"def running(self):",
                " ".repeat(8)+`return {"data": """${content}"""}`
            ].join("\n");
            const numLines = funcCode.split("\n").length
            const newBasicBlocks = currentNode?.data.basicCodeBlocks.map((value)=>{
                if (value.name == "running") return {...value, code: funcCode, numLines:numLines}
                else return value
            })
            // update node
            await updateNode(frontNode2back({...currentNode, data: {...currentNode.data, basicCodeBlocks: newBasicBlocks}}));
            // start task
            await runProj({nodeId: node_id, nodeAct: "dataGen"});
            // task status
            flowContext?.setTaskRunning(true)
            // alert(funcCode);
        }else{
            // start task
            await runProj({nodeId: node_id, nodeAct: "dataGen"});
            // task status
            flowContext?.setTaskRunning(true)
        }
    };

    return (
      <Button className='nodrag' h={"20px"} w={"54px"} size={"2xs"} p={"-0.5"} bg={checked? "teal" : "blackAlpha.500"} 
            _hover={{scale: "1.04"}} fontSize={"8px"} fontWeight={"bold"} onClick={handleRunProj}>
          {flowContext?.isTaskRunning ? (
            <HStack gap={"2px"}>
                <Text>Running</Text>
                <Spinner size="xs"/> 
            </HStack>
          ) : (
            <HStack justifyContent={"space-between"}>
                <Text>Start</Text> 
                <Text fontSize={"18px"}>▶</Text>
            </HStack>
          )}
      </Button>
    );
  }

function DataOutComponent() {
    return (
        <>
            <Box bg="blackAlpha.600" p="1px" pl="0px" pr="4px" borderRightRadius={"full"} w="100vw">
                <Flex justifyContent={"end"} alignContent={"center"}>
                <Text fontSize="9px" color="gray.300">Generate Data</Text>
                </Flex>
            </Box>
        <Handle id="dataGen"
        type='source'
        position={Position.Right}
        style={{
            position: 'absolute',
            top: `35px`, // 自定义位置
            width: '7px',
            height: '7px',
            backgroundColor: '#434343',
          }}
        onConnect={(params) => console.log('handle onConnect', params)}
        />
      </>
    );
  }


function HumanInputBox({setContent, setChecked, checked, content,}: NodeSubProps){
    
    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(event.target.value);
    };

    return (
        <Box className='nodrag' bg={"blackAlpha.400"} p={"2px"}>
            <HStack justifyContent={"space-between"} gap={"4px"}>
                <Text cursor={"auto"} pl={"2px"} fontSize={"8px"}>Use Input Text?</Text>
                <Switch h={"15px"} colorPalette={"teal"} size={"xs"} checked={checked} onCheckedChange={(e) => setChecked(e.checked)} />
            </HStack>
            <Textarea bg={"white"} overflow={"scroll"} resize="none" 
            h={"60px"} p={"1"} fontSize={"6px"} 
            lineHeight={"shorter"} disabled={!checked}
            value={content}
            onChange={handleChange}>
            </Textarea>
        </Box>
    )
}


// 自定义节点
export function InputNode(props: NodeProps<InputNode>){
    // global state
    const flowContext = useContext(WorkFlowContext);
    const [checked, setChecked] = useState(false);
    const [content, setContent] = useState("");

    const subProps = {
        node_id: props.id,
        checked: checked,
        setChecked: setChecked,
        content: content,
        setContent: setContent
    }


    const handleDelete = ()=>{
        flowContext?.reactFlow.deleteElements({nodes:[{id: props.id}]});
        flowContext?.setFocusNodeID(undefined);
    }

    if (flowContext){
        return (
            <Box maxW="140px" fontWeight={"bold"} roundedTop="md" bg="gray.400" _hover={{scale: "1.02"}} borderColor="blackAlpha.600" borderWidth={props.selected ? '1px' : 'none'}>
                <Box bg="blackAlpha.700" roundedTop="md" >
                    <Flex gap="4" justify="space-between">
                        <Text color="white" paddingLeft="5px" textStyle="xs">{props.data.name}</Text>
                        {flowContext.runningNodeID == props.id ? <Spinner h={"20px"} color={"GrayText"} className='nodrag' ></Spinner>:
                        <CloseButton className='nodrag' boxSize={"20px"} roundedTop="md" colorPalette='red' size='2xs' variant='solid'
                        onClick={handleDelete}>
                        </CloseButton>}
                    </Flex>
                </Box>
                <HStack padding={"2px"} pt={"5px"} pb={"5px"} justifyContent={""} alignContent={"center"} gap={"-0.5"}>
                    <DataOutComponent></DataOutComponent>
                    <LoadingButton {...subProps}> </LoadingButton>
                </HStack>
                <HumanInputBox {...subProps}></HumanInputBox> 
            </Box>
        );
    }
}  