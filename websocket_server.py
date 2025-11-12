#!/usr/bin/env python3
"""
WebSocket Server для Email Checker
Обеспечивает real-time обновления через WebSocket соединения
"""

import asyncio
import websockets
import json
import threading
from datetime import datetime
from typing import Set
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Множество подключенных клиентов
connected_clients: Set[websockets.WebSocketServerProtocol] = set()

# Очередь сообщений для broadcast
broadcast_queue = None

# Lock для thread-safe операций
clients_lock = threading.Lock()

# Event loop для asyncio (будет установлен при запуске)
ws_loop = None


async def handle_client(websocket):
    """
    Обработка нового WebSocket клиента
    (websockets 15.x API - один параметр)

    Args:
        websocket: WebSocket соединение
    """
    # Добавляем клиента в множество
    with clients_lock:
        connected_clients.add(websocket)

    # Получаем информацию о клиенте
    try:
        client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    except:
        client_id = "unknown"

    logger.info(f"🔌 WebSocket client connected: {client_id} (total: {len(connected_clients)})")

    try:
        # Отправляем welcome сообщение
        welcome_message = {
            "type": "connected",
            "timestamp": datetime.now().isoformat(),
            "message": "WebSocket connection established"
        }
        await websocket.send(json.dumps(welcome_message))

        # Ждем сообщения от клиента (для keep-alive)
        async for message in websocket:
            try:
                data = json.loads(message)
                # Обработка команд от клиента (если нужно)
                if data.get("type") == "ping":
                    await websocket.send(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    }))
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from client {client_id}: {message}")
            except Exception as e:
                logger.error(f"Error processing message from {client_id}: {e}")

    except websockets.exceptions.ConnectionClosed:
        logger.info(f"🔌 WebSocket client {client_id} closed connection normally")
    except Exception as e:
        logger.error(f"🔌 WebSocket error for client {client_id}: {e}")
    finally:
        # Удаляем клиента из множества
        with clients_lock:
            if websocket in connected_clients:
                connected_clients.remove(websocket)
        logger.info(f"🔌 WebSocket client {client_id} disconnected (total: {len(connected_clients)})")


async def broadcast_worker():
    """
    Фоновый worker для broadcast сообщений всем подключенным клиентам
    Читает сообщения из очереди и рассылает их
    """
    global broadcast_queue

    while True:
        try:
            # Получаем сообщение из очереди
            message = await broadcast_queue.get()

            # Если нет подключенных клиентов, пропускаем
            if not connected_clients:
                continue

            # Подготавливаем JSON
            json_message = json.dumps(message)

            # Отправляем всем подключенным клиентам
            disconnected = set()
            with clients_lock:
                clients_copy = connected_clients.copy()

            for client in clients_copy:
                try:
                    await client.send(json_message)
                except websockets.exceptions.ConnectionClosed:
                    disconnected.add(client)
                except Exception as e:
                    logger.error(f"Error broadcasting to client: {e}")
                    disconnected.add(client)

            # Удаляем отключенных клиентов
            if disconnected:
                with clients_lock:
                    connected_clients.difference_update(disconnected)
                logger.info(f"🔌 Removed {len(disconnected)} disconnected clients (total: {len(connected_clients)})")

        except Exception as e:
            logger.error(f"Error in broadcast worker: {e}")
            await asyncio.sleep(1)  # Небольшая пауза при ошибке


async def start_server(host="0.0.0.0", port=8089):
    """
    Запуск WebSocket сервера

    Args:
        host: Хост для прослушивания (default: 0.0.0.0)
        port: Порт для прослушивания (default: 8089)
    """
    global broadcast_queue, ws_loop

    # Получаем текущий event loop
    ws_loop = asyncio.get_event_loop()

    # Создаем очередь для broadcast
    broadcast_queue = asyncio.Queue()

    # Запускаем broadcast worker
    asyncio.create_task(broadcast_worker())

    # Запускаем WebSocket сервер на /ws endpoint
    logger.info(f"🚀 Starting WebSocket server on ws://{host}:{port}/ws")

    async with websockets.serve(
        handle_client,
        host,
        port,
        ping_interval=30,  # Ping каждые 30 секунд
        ping_timeout=10,   # Timeout 10 секунд
        max_size=10 * 1024 * 1024  # Max message size: 10MB
    ):
        logger.info(f"✅ WebSocket server started successfully on ws://{host}:{port}/ws")
        await asyncio.Future()  # Run forever


def run_websocket_server(host="0.0.0.0", port=8089):
    """
    Запуск WebSocket сервера в asyncio event loop
    Эта функция вызывается в отдельном потоке

    Args:
        host: Хост для прослушивания
        port: Порт для прослушивания
    """
    try:
        asyncio.run(start_server(host, port))
    except Exception as e:
        logger.error(f"❌ WebSocket server error: {e}")


def broadcast_message(message_type: str, data: dict):
    """
    Thread-safe функция для отправки broadcast сообщения
    Может вызываться из любого потока

    Args:
        message_type: Тип сообщения (task.started, task.progress, task.completed, etc.)
        data: Данные сообщения (dict)
    """
    global broadcast_queue, ws_loop

    # Если WebSocket еще не запущен, игнорируем
    if broadcast_queue is None or ws_loop is None:
        return

    # Подготавливаем сообщение
    message = {
        "type": message_type,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }

    # Добавляем в очередь thread-safe способом
    try:
        # Используем call_soon_threadsafe для добавления задачи в event loop из другого потока
        future = asyncio.run_coroutine_threadsafe(
            broadcast_queue.put(message),
            ws_loop
        )
        # Ждем до 1 секунды (не блокируем основной поток надолго)
        future.result(timeout=1.0)
    except asyncio.TimeoutError:
        logger.warning(f"Timeout broadcasting {message_type} message")
    except RuntimeError as e:
        # Event loop не запущен или закрыт - нормальная ситуация при shutdown
        logger.debug(f"Cannot broadcast (loop not running): {e}")
    except Exception as e:
        logger.error(f"Error broadcasting {message_type} message: {e}")


def get_connected_clients_count() -> int:
    """
    Получить количество подключенных клиентов

    Returns:
        int: Количество подключенных клиентов
    """
    with clients_lock:
        return len(connected_clients)


# Для тестирования
if __name__ == "__main__":
    print("🚀 Starting WebSocket server (standalone mode)")
    print("📍 Listening on ws://localhost:8089/ws")
    print("Press Ctrl+C to stop")

    try:
        run_websocket_server("0.0.0.0", 8089)
    except KeyboardInterrupt:
        print("\n👋 WebSocket server stopped")
