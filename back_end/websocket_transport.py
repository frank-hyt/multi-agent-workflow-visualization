import asyncio
from fastapi import WebSocket
from pygls.protocol import JsonRPCProtocol

class WebSocketTransport:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.protocol = JsonRPCProtocol(self, None)

    async def start(self):
        async for message in self.websocket:
            await self.protocol.data_received(message)

    async def send_data(self, data):
        await self.websocket.send(data)

    def close(self):
        asyncio.create_task(self.websocket.close())
