#include <cstdio>
#include <cstdlib>
#include <cstring>

#include <chrono>
#include <thread>
#include <string_view>
#include <string>
#include <sstream>
#include <mutex>
#include <set>
#include <functional>
#include <memory>

#define SDL_MAIN_HANDLED
#include <SDL2/SDL_net.h>

#include "ws.h"

// NOTE: set Aruo Dictionary to "Original Aruco"


void sleep(int ms = 10) {
  std::this_thread::sleep_for(std::chrono::milliseconds(ms));
}

struct WebServer {
  char host[256];
  ws_server server;

  struct CallBack {
    virtual ~CallBack();
    virtual void onOpen(std::string address, Uint64 port) {
    }
    virtual void onClose(std::string address, Uint64 port) {
    }
  };

  static std::unique_ptr<CallBack> callBack;

  WebServer(std::string_view host, Uint16 port) {
    strncpy(this->host, host.data(), sizeof(this->host));
    server.host = this->host;
    server.port = port;
    server.thread_loop = 1;
    server.timeout_ms = 60000;
    server.evs.onopen = [](ws_cli_conn_t *client) {
      char *addr = ws_getaddress(client);
      Uint16 port = atoi(ws_getport(client));
      printf("connection opened: addr: %s, port: %d\n", addr, port);
      if (callBack)
        callBack->onOpen(addr, port);
    };

    server.evs.onclose = [](ws_cli_conn_t *client) {
      char *addr = ws_getaddress(client);
      Uint16 port = atoi(ws_getport(client));
      printf("connection closed: addr: %s, port: %d\n", addr, port);
      if (callBack)
        callBack->onClose(addr, port);
    };
    server.evs.onmessage = [](ws_cli_conn_t *client, const Uint8 *msg,
                              Uint64 size, int type) {
    };
    ws_socket(&server);
  }

  void broadcastText(std::string_view message) {
    ws_sendframe_txt_bcast(server.port, message.data());
  }
};

std::unique_ptr<WebServer::CallBack> WebServer::callBack = nullptr;


class UDPReader {

  Uint16 port = 0;
  UDPsocket udpSocket = nullptr;
  UDPpacket *udpPacket = nullptr;
  SDLNet_SocketSet socketSet = nullptr;

  static const int MAX_PACKET_SIZE = 1024;
  static bool sdlNetInited;
 public:
  struct Exception : public std::exception {
    std::string e = "error";
    Exception() = default;
    Exception(std::string_view e_)
        :
        e(e_) {
    }
    const char* what() {
      return e.c_str();
    }
  };

  static bool init() {
    if (sdlNetInited)
      return true;
    if (SDLNet_Init() < 0) {
      printf("UDPReceiver::init - couldn't initialize SDL Net");
      throw Exception(SDLNet_GetError());
    }
    return sdlNetInited = true;
  }

  ~UDPReader() {
    port = 0;
    SDLNet_UDP_Close(udpSocket);
    udpSocket = nullptr;
    SDLNet_FreeSocketSet(socketSet);
    socketSet = nullptr;
    SDLNet_FreePacket(udpPacket);
    udpPacket = nullptr;
  }

  UDPReader(Uint16 port_)
      :
      port(port_) {

    auto term = [&]() {
      const auto err = SDLNet_GetError();
      port = 0;
      if (udpSocket)
        SDLNet_UDP_Close(udpSocket);
      udpSocket = nullptr;
      if (socketSet)
        SDLNet_FreeSocketSet(socketSet);
      socketSet = nullptr;
      if (udpPacket)
        SDLNet_FreePacket(udpPacket);
      udpPacket = nullptr;
      throw Exception(err);
    };

    udpSocket = SDLNet_UDP_Open(port);
    if (!udpSocket) {
      printf("UDPReceiver - SDLNet_UDP_Open error\n");
      term();
    }

    socketSet = SDLNet_AllocSocketSet(2);
    if (!socketSet) {
      printf("UDPReceiver - SDLNet_AllocSocketSet error\n");
      term();
    }

    int numUsed = SDLNet_UDP_AddSocket(socketSet, udpSocket);
    if (numUsed < 0) {
      printf("UDPReceiver - SDLNet_AddSocket error\n");
      term();
    }

    udpPacket = SDLNet_AllocPacket(MAX_PACKET_SIZE);
    if (!udpPacket) {
      printf("UDPReceiver - SDLNet_AllocPacket error\n");
      term();
    }
  }

  bool checkReady() {
    SDLNet_CheckSockets(socketSet, 16);
    return SDLNet_SocketReady(udpSocket);
  }

  template<typename T> const T* recv(const T *other = nullptr) {
    if (SDLNet_UDP_Recv(udpSocket, udpPacket)) {
      if (udpPacket->len >= (int) sizeof(T)) {
        return (T*) udpPacket->data;
      }
    }
    return other;
  }
};

bool UDPReader::sdlNetInited = false;


int main(int argc, char *args[]) {
  setbuf(stdout, 0);
  printf("Hello...\n");

  std::unique_ptr<UDPReader> udpReader = nullptr;
  try {
    UDPReader::init();
    udpReader = std::make_unique<UDPReader>(7860);
  } catch (UDPReader::Exception &e) {
    printf("exception:\n");
    printf("%s\n", e.what());
    exit(0);
  }

  WebServer server("192.168.68.90", 8910);

  struct Data {
    double xyz[3], ypr[3];
  };

  printf(" * started ('192.168.68.90:8910'):\n");
  Uint32 ticks = 0;
  while (1) {
    if (udpReader->checkReady()) {
      auto data = udpReader->recv<Data>();
      if (data) {
        //printf("[%d]: %f, %f, %f | %f, %f, %f\n", ticks, data->xyz[0],
        //       data->xyz[1], data->xyz[2], data->ypr[0], data->ypr[1],
        //       data->ypr[2]);
        std::stringstream ss;
        ss << "{ \"yaw\": " << data->ypr[0];
        ss << ", \"pitch\": " << data->ypr[1];
        ss << ", \"roll\": " << data->ypr[2] << " }";
        auto text = ss.str();
        server.broadcastText(text);
      }
      ticks++;
    }
  }

  printf(" * stopped!\n");

  printf("Goodbye!\n");
  return 0;
}
