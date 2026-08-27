import socketio

from app.main import app
from app.socket import sio

application = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="socket.io")