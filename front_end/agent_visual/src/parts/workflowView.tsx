import { useContext} from 'react';

import {
    Panel,
    ReactFlow,
    Background,
    Controls,
    MiniMap,
  } from '@xyflow/react';
  
import {WorkFlowContext}  from '../gobalState/nodeContext'
import '@xyflow/react/dist/style.css';
import SideBarCode from './sideBarCode'
import SideBarLog from './sideBarLog'
import SingleButton from './singleButton'

import { nodeTypes } from '../nodes';
import { edgeTypes } from '../edges';
import './workflowView.css'

import {addNode, backNode2front} from '../api/basic_op'
import {saveProj} from '../api/proj_op'
import { Tabs, Box, Theme} from "@chakra-ui/react"


export function FlowControl(){
    const flowContext = useContext(WorkFlowContext);

    const handleAddNode = async (type:string) => {
      const newNodeData = await addNode({nodeType: type})
      const newNode = backNode2front(newNodeData)
      flowContext?.reactFlow.addNodes(newNode)
      console.log("add node", type);
    }

    const handleSaveProj = async () => {
      await saveProj();
    }

    if (flowContext){
    return (
        <div style={{display: 'inline-flex',  width: '100%', height: '100%'}}>
          <div style={{flexGrow: 1, backgroundColor: 'lightblue',}}>
            <ReactFlow
              nodes={flowContext.nodes}
              nodeTypes={nodeTypes}
              onNodesChange={flowContext.onNodesChange}
              edges={flowContext.edges}
              edgeTypes={edgeTypes}
              onEdgesChange={flowContext.onEdgesChange}
              onConnect={flowContext.onConnect}
              onNodeClick={(_, node)=> {
                flowContext.setFocusNodeID(node.id);
                flowContext.setFocusEdgeID(undefined);}}
              onEdgeClick={(_, e)=> {
                flowContext.setFocusNodeID(undefined);
                flowContext.setFocusEdgeID(e.id)}}
              fitView
              zoomOnScroll={false}
            >
            <Panel position="top-right">
            <div style={{display: 'flex', columnGap: '4px' }}>
              <SingleButton icon='➕' text='Agent' onClick={() => handleAddNode('agent')}></SingleButton>
              <SingleButton icon='➕' text='Input' onClick={() => handleAddNode('inputnode')}></SingleButton>
              <SingleButton icon='➕' text='Output' onClick={() => handleAddNode('outputnode')}></SingleButton>
              {/* <SingleButton icon='➕' text='Interact' onClick={() => handleAddNode('outputnode')}></SingleButton> */}
              <SingleButton icon='💾' text='SaveProj' onClick={() => handleSaveProj()}></SingleButton>
            </div>
            </Panel>
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
          </div>
          <Theme appearance="light">
            <Box w={"350px"} h={"100vh"} bg={"blackAlpha.700"}>
              <Tabs.Root bg={"blackAlpha.500"} borderColor={"white"} defaultValue={"PythonCode"} variant="outline">
                <Tabs.List>
                  {flowContext.focusEdgeID == undefined  && 
                  <Tabs.Trigger color={"white"} value="PythonCode" _hover={{scale: "1.03"}}>
                    PythonCode
                  </Tabs.Trigger>}
                  <Tabs.Trigger color={"white"} value="TaskLog" _hover={{scale: "1.03"}}>
                    TaskLog
                  </Tabs.Trigger>
                </Tabs.List>
                {flowContext.focusEdgeID == undefined  && 
                <Tabs.Content value="PythonCode">
                  <Box maxH={"90vh"} overflowY={"auto"}>
                  <SideBarCode></SideBarCode>
                  </Box>
                </Tabs.Content>}
                <Tabs.Content value="TaskLog">
                  <Box maxH={"90vh"} overflowY={"auto"}>
                  <SideBarLog></SideBarLog>
                  </Box>
                </Tabs.Content>
              </Tabs.Root>
            </Box>
          </Theme>
        </div>
        
      );
    }
}

