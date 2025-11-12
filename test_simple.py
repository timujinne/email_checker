#!/usr/bin/env python3
"""Ultra simple test - just checks if endpoint exists"""
import socket
import time

def find_server_port():
    """Find which port server is running on"""
    for port in range(8080, 8180):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            result = sock.connect_ex(('localhost', port))
            sock.close()
            if result == 0:
                return port
        except:
            pass
    return None

def test_endpoint(port):
    """Test endpoint with raw HTTP"""
    import socket

    # Create socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)

    try:
        # Connect
        sock.connect(('localhost', port))

        # Send HTTP request
        request = f"""POST /api/smart-filter/apply HTTP/1.1\r
Host: localhost:{port}\r
Content-Type: application/json\r
Content-Length: 203\r
\r
{{"config":{{"metadata":{{"name":"Test"}}}}, "timestamp":"2025-10-30T12:00:00Z"}}"""

        sock.sendall(request.encode())

        # Receive response
        response = sock.recv(4096).decode()

        # Parse response
        lines = response.split('\r\n')
        status_line = lines[0]

        print(f"Response: {status_line}")

        if '200 OK' in status_line:
            print("✅ Endpoint working!")
            # Find JSON body
            body_start = response.find('\r\n\r\n')
            if body_start > 0:
                body = response[body_start+4:]
                print(f"Body: {body[:200]}")
        elif '404' in status_line:
            print("❌ Endpoint not found (404)")
        else:
            print(f"⚠️ Unexpected response: {status_line}")

    except socket.timeout:
        print("❌ Timeout - server might be hanging")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        sock.close()

if __name__ == "__main__":
    print("Looking for server...")
    port = find_server_port()

    if port:
        print(f"✅ Server found on port {port}")
        print(f"Testing /api/smart-filter/apply...")
        print("-" * 50)
        test_endpoint(port)
    else:
        print("❌ Server not found on ports 8080-8180")
        print("Start server with: python web_server.py")
