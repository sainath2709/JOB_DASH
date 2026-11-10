"""
Lightweight development server for Job Dashboard.
Serves static files and adds no-cache headers for instant sync testing.
"""

import http.server
import socketserver
import os
import sys

PORT = 8080

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent browser caching of JSON and scripts during development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    handler = NoCacheHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print("\n" + "=" * 60)
        print(f" 🚀 FresherTrack 2026 Dashboard Server Running!")
        print(f" 👉 Local URL: http://localhost:{PORT}")
        print(f" Press Ctrl+C to stop the server.")
        print("=" * 60 + "\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer shutting down gracefully.")
            httpd.server_close()

if __name__ == "__main__":
    run_server()
