import jedi

import ast
from pyflakes.api import check
from pyflakes.reporter import Reporter


code = """
import time
from custom_lib.module import THE_STR

i

class agentName:

    def __init__(self):
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
        print("something doing")
        time.sleep(4)
        return processed_dict

          """
import io
err_io = io.StringIO()
reporter = Reporter(err_io, err_io)

# Run Pyflakes check
check(code, filename="/Users/heyitao/program_project/agent_visualization/back_end/default_proj/nodes/node_8d1d26.py", reporter=reporter)

err_io.seek(0)
for line in err_io:
    parts = line.split(':', 3)
    print(parts)
    # if len(parts) == 4:
    #     try:
    #         line_num = int(parts[1]) - 1
    #         col_num = int(parts[2]) - 1
    #         message = parts[3].strip()
    #         diagnostic = Diagnostic(
    #             range=Range(
    #                 start=Position(line=line_num, character=col_num),
    #                 end=Position(line=line_num, character=col_num + 1),
    #             ),
    #             message=message,
    #             severity=DiagnosticSeverity.Error,
    #             source='pyflakes',
    #         )
    #         diagnostics.append(diagnostic)
    #     except ValueError:
    #         # Handle cases where line/column numbers are not integers
    #         continue