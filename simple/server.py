from http.server import SimpleHTTPRequestHandler, HTTPServer

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*') # Allow requests from any origin
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

if __name__ == '__main__':
    server_address = ('192.168.68.90', 9876)  # Change the port if needed
    httpd = HTTPServer(server_address, CORSRequestHandler)
    print('Server running at:')
    print('http://192.168.68.90:9876')
    httpd.serve_forever()