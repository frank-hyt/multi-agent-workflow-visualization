class agentName:

    def __init__(self):
        # memory
        pass

    def preprocess(self, input_dict):
        # preprocess to
        # input: output from other node
        # output: processed dict
        return input_dict

    def decision_make(self, processed_dict):
        # palnning to
        # input: output of process
        # output: action name
        return 'something'

    def act_something(self, processed_dict):
        # take am action
        # input: output of process
        # output: dict
        return processed_dict

