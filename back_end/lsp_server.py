from pygls.server import LanguageServer
from lsprotocol import types
from lsprotocol.types import CompletionItemKind
import logging
import jedi
from pyflakes.api import check
from pyflakes.reporter import Reporter
import os
import io
from jedi.api import Project


class PythonLanguageServer(LanguageServer):
    def __init__(self):
        super().__init__("python-lsp", "0.1")
        self.virtual_file = {}
        self.project = None

pyls = PythonLanguageServer()


def map_jedi_type_to_lsp_kind(jedi_type):
    mapping = {
        "module": CompletionItemKind.Module,
        "class": CompletionItemKind.Class,
        "instance": CompletionItemKind.Variable,
        "function": CompletionItemKind.Function,
        "param": CompletionItemKind.Variable,
        "path": CompletionItemKind.File,
        "keyword": CompletionItemKind.Keyword,
        "statement": CompletionItemKind.Text,
        "field": CompletionItemKind.Field,
        "property": CompletionItemKind.Property,
    }
    return mapping.get(jedi_type, CompletionItemKind.Text)  # 默认返回文本类型


def apply_incremental_change(content: str, change: types.TextDocumentContentChangeEvent_Type1):
    lines = content.split("\n")
    if not lines:
        return change.text
    start_line, start_char = change.range.start.line, change.range.start.character
    end_line, end_char = change.range.end.line, change.range.end.character
    
    # 获取修改的区域
    # print("lines", lines)
    start_line_content = lines[start_line][:start_char]
    end_line_content = lines[end_line][end_char:]
    
    # 替换区域内容
    new_lines = lines[:start_line]
    new_lines.append(start_line_content + change.text + end_line_content)
    new_lines.extend(lines[end_line+1:])
    
    return '\n'.join(new_lines)


@pyls.feature(types.TEXT_DOCUMENT_DID_OPEN)
def on_did_open(ls: PythonLanguageServer, params: types.DidOpenTextDocumentParams):
    ls.virtual_file = {
        "text": params.text_document.text,
        "lang": params.text_document.language_id,
        "uri": params.text_document.uri
    }
    # print("virtual_file", ls.virtual_file)
    proj_path = os.path.abspath(os.path.dirname(params.text_document.uri))
    ls.project = Project(path=proj_path)
    print("proj path", proj_path)
    return 


@pyls.feature(types.TEXT_DOCUMENT_DID_CHANGE)
def on_did_change(ls: PythonLanguageServer, params: types.DidChangeTextDocumentParams):
    uri = params.text_document.uri
    changes = params.content_changes

    # print("virtual_file", ls.virtual_file)
    if uri  != ls.virtual_file["uri"]:
        print(f"{uri} Now not editing.")
        return

    content = ls.virtual_file["text"]
    
    # 处理增量更新
    for change in changes:
        if hasattr(change, "range"):
            content = apply_incremental_change(content, change)
        elif hasattr(change, "text"):
            content = change.text  # 全量替换
        else:
            print(f"Unsupported change format: {change}")
    
    ls.virtual_file["text"] = content
    # print(f"Updated content for {uri}:\n{ls.virtual_file['text']}")


@pyls.feature(types.TEXT_DOCUMENT_COMPLETION)
def on_did_complment_hint(ls: PythonLanguageServer, params: types.CompletionParams):
    # 获取文档的 URI 和位置
    uri = params.text_document.uri
    position = params.position

    # print("virtual_file", ls.virtual_file)
    if uri != ls.virtual_file["uri"]:
        print(f"{uri} is not the currently edited virtual file.")
        return types.CompletionList(is_incomplete=False, items=[])

    # 获取虚拟文档的内容
    document = ls.virtual_file["text"]
    line = position.line + 1  # Jedi 行号从 1 开始
    column = position.character

    # 使用 Jedi 提供补全
    script = jedi.Script(document, project=ls.project)
    completions = script.complete(line=line, column=column)

    # 生成补全项
    items = []
    for completion in completions:
        # 计算补全范围
        completion_start = column - completion.get_completion_prefix_length()
        range_start = types.Position(line=position.line, character=completion_start)
        range_end = types.Position(line=position.line, character=column)

        items.append(
            types.CompletionItem(
                label=completion.name,
                kind=map_jedi_type_to_lsp_kind(completion.type),
                detail=completion.type,
                documentation=completion.docstring(),
                insert_text=completion.complete,
                text_edit=types.TextEdit(
                    range=types.Range(start=range_start, end=range_end),
                    new_text=completion.name,
                ),
            )
        )

    # 返回补全列表
    return types.CompletionList(is_incomplete=False, items=items)

from pygls.server import LanguageServer


@pyls.feature(types.TEXT_DOCUMENT_DIAGNOSTIC)
def diagnostics(ls: PythonLanguageServer, params: types.DocumentDiagnosticParams):
    """
    提供语法检查和诊断信息。
    """
    uri = params.text_document.uri

    if uri != ls.virtual_file["uri"]:
        print(f"{uri} is not the currently edited virtual file.")
        return []

    # 获取文档内容
    code = ls.virtual_file["text"]

    diagnostics = []

    # Capture Pyflakes output
    err_io = io.StringIO()
    reporter = Reporter(err_io, err_io)

    # Run Pyflakes check
    check(code, filename=uri, reporter=reporter)

    # Process Pyflakes output
    err_io.seek(0)
    for line in err_io:
        parts = line.split(':', 3)
        if len(parts) == 4:
            try:
                line_num = int(parts[1]) - 1
                col_num = int(parts[2]) - 1
                message = parts[3].strip()
                diagnostic = types.Diagnostic(
                    range=types.Range(
                        start=types.Position(line=line_num, character=col_num),
                        end=types.Position(line=line_num, character=col_num + 1),
                    ),
                    message=message,
                    severity=types.DiagnosticSeverity.Error,
                    source='pyflakes',
                )
                diagnostics.append(diagnostic)
            except ValueError:
                # Handle cases where line/column numbers are not integers
                continue

    return diagnostics



if __name__=="__main__":
    logging.basicConfig(level=logging.ERROR, format="%(message)s")

    pyls.start_ws("localhost", 5001)
