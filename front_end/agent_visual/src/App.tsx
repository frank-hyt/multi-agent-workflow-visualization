import {FlowControl} from './parts/workflowView'
import {FlowProvider} from './gobalState/nodeContext'
import FloatingWindow from './parts/floatWindow'
import { ReactFlowProvider } from '@xyflow/react';
import {WorkFlowContext}  from './gobalState/nodeContext'
import {useContext} from 'react'
import { Provider } from './components/ui/provider';

import '@xyflow/react/dist/style.css';
import { Theme } from '@chakra-ui/react';


function WraperWindow(){
  const flowContext = useContext(WorkFlowContext)
  // console.log("flowContext?.focusNodeID", flowContext?.focusNodeID)

  return (
    <Provider>
      <Theme h={"100vh"} w={"100vw"} appearance="light" >
        {flowContext?.focusNodeID && <FloatingWindow></FloatingWindow>}
        <FlowControl></FlowControl>
      </Theme>
    </Provider>
  )

}


export default function App() {

  return (
    <>
      <ReactFlowProvider>
        <FlowProvider>
          <WraperWindow></WraperWindow>
        </FlowProvider>
      </ReactFlowProvider>
    </>
  );
}
