from enum import Enum


class ClassTypeEnum(Enum):
    agent_node = "agent"
    input_node = "inputnode"
    output_node = "outputnode"
    

class PredefineFunc(Enum):
    initFunc = "__init__"
    preprocessFunc = "preprocess"
    planningFunc = "decision_make"
    runningFunc = "running"


class PrefixDynamicFunc(Enum):
    actFunc = "act"


NodeRestriction = {
    ClassTypeEnum.agent_node.value: [PredefineFunc.initFunc.value, PredefineFunc.preprocessFunc.value, PredefineFunc.planningFunc.value],
    ClassTypeEnum.input_node.value: [PredefineFunc.runningFunc.value],
    ClassTypeEnum.output_node.value: [PredefineFunc.runningFunc.value]
}


class CodeTypeEnum(Enum):
    className = "className"
    fixNameFunc = "fixNameFunction"
    renameAbleFunc = "renameAbleFunction"
    unknow = "unknow"
