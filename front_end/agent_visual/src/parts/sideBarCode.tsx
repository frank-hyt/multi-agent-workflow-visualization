import {WorkFlowContext}  from '../gobalState/nodeContext'
import {useContext} from 'react'
import type {AppNode, codeItem } from '../nodes/types';
import {CodeTypeEnum} from '../nodes/types';
import { nanoid } from 'nanoid';

import { CodeBlock, dracula } from 'react-code-blocks';

import "./sideBarContent.css";
import { Box, VStack, Text, Flex } from '@chakra-ui/react';



function CodeThumbnail({codeIdx, code, numLines }: {codeIdx: number, code: string, numLines: number}) {
    const snippet = code.split('\n').slice(0, numLines).join('\n');
    const flowContext = useContext(WorkFlowContext);

    const handleClickCodeBlock = ()=>{
        flowContext?.setFocusCodeIndex(codeIdx)
        flowContext?.setFloatIsVisible(true)
    }

    return (
      <div onClick={handleClickCodeBlock}>
        <CodeBlock text={snippet} language="python"  showLineNumbers={false} theme={dracula} />
      </div>
    );
}


function CodeBlockOperationButton({codeIdx}: {codeIdx: number}){
    const flowContext = useContext(WorkFlowContext);
    const currentNode = flowContext?.reactFlow.getNode(flowContext.focusNodeID as string) as AppNode
    const removable = codeIdx >= currentNode.data.basicCodeBlocks.length

    const handleRemoveCodeBlock = () =>{
        const idxDynamic = codeIdx-currentNode.data.basicCodeBlocks.length
        const newDynamicCodeBlocks = currentNode.data.dynamicCodeBlocks.filter((_, index) => index !== idxDynamic)
        flowContext?.reactFlow.updateNodeData(currentNode.id, {...currentNode.data, dynamicCodeBlocks: newDynamicCodeBlocks} )
    }

    if (removable ){
        return (
                <button className='delete-button' onClick={handleRemoveCodeBlock}> 
                <img
                    src="https://www.svgrepo.com/download/171102/delete.svg"  // SVG 文件路径
                    alt="SVG Button"
                    style={{width: '20px',  height: '100%',}}/>
                </button>
            )
    }
    
}


function CodeBlockComponent({codeIdx, codeInfo}:{
    codeIdx: number, 
    codeInfo: codeItem, 
}){
    
    return (
        <Flex w={"100%"} className='item-rectangle clickable-rectangle' justifyContent={"space-between"}>
            <CodeThumbnail codeIdx={codeIdx} code={codeInfo.code} numLines={3}></CodeThumbnail>
            <CodeBlockOperationButton  codeIdx={codeIdx}></CodeBlockOperationButton>
        </Flex>
    ) 
}


function AddBlockComponent(){
    const flowContext = useContext(WorkFlowContext);
    const currentNode = flowContext?.reactFlow.getNode(flowContext.focusNodeID as string) as AppNode

    const handleAddBlock = () => {
        const newName = nanoid(8).replace(/[^a-zA-Z0-9]/g, '')
        let newBlockIndex;
        if (currentNode.data.dynamicCodeBlocks.length == 0){
            const basefuncIdxs = currentNode.data.basicCodeBlocks.filter(
                (value)=> value.codeType=="fixNameFunction").map((value)=>value.blockIndex)
            newBlockIndex = Math.max(...basefuncIdxs) + 0.001
        }else{
            const tmpIDX = currentNode.data.dynamicCodeBlocks.length-1
            newBlockIndex = currentNode.data.dynamicCodeBlocks[tmpIDX].blockIndex + 0.001
        }
        
        const newDynamicCodeBlocks = [...currentNode.data.dynamicCodeBlocks, 
            {code: [
                ' '.repeat(4)+`def act_${newName}(processed_input):`,
                ' '.repeat(8)+'# processed_input: dict',
                ' '.repeat(8)+'# output: string (action name)',
                ' '.repeat(8)+'pass',
            ].join('\n'),
            name: newName,
            prefix: "act",
            codeType: CodeTypeEnum.renameAbleFunc,
            numLines: 4,
            blockIndex: newBlockIndex
        }];
        flowContext?.reactFlow.updateNodeData(currentNode.id, {...currentNode.data, dynamicCodeBlocks: newDynamicCodeBlocks})
    }

    return (
    <Box w="100%" justifyContent={"center"} className="item-rectangle clickable-rectangle" 
            onClick={handleAddBlock}>
                <Text fontSize={'25px'}>+ </Text>
    </Box>)
    
}


export default function SideBarCode(){
    const flowContext = useContext(WorkFlowContext);
    const currentNode = flowContext?.reactFlow.getNode(flowContext.focusNodeID as string) as AppNode
    if (flowContext && flowContext.focusNodeID){
        return (
        <Box>
            <VStack fontSize={"14px"} gapY={"4px"} alignItems={"start"}>
            {currentNode && currentNode.data.basicCodeBlocks.map((item, index) => (
                    <div key={`${index}`}>
                        <CodeBlockComponent
                            codeIdx={index}
                            codeInfo={item}>
                        </CodeBlockComponent> 
                    </div>
                ))}

                {currentNode.data.dynamicCodeBlocks.map((item, index) => (
                    <div key={`${index}`} >
                        <CodeBlockComponent
                            codeIdx={index+currentNode.data.basicCodeBlocks.length}
                            codeInfo={item}></CodeBlockComponent> 
                    </div>
                ))}

                {currentNode.type=="agent" && <AddBlockComponent></AddBlockComponent>}
            </VStack>
        </Box>
        );
    }
}
