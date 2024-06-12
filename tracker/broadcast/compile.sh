#!/bin/bash

echo "compiling..."
g++ -c *.cpp
gcc -c *.c
echo "done! linking..."
g++ *.o -lwsock32 -lws2_32 -lSDL2_net
echo "done!"
