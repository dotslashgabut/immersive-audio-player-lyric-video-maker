@echo off
title Server Launcher
echo Starting server...

if exist port.txt del port.txt

start /B node server.js

:wait
if not exist port.txt timeout /t 1 >nul && goto wait

set /p PORT=<port.txt

start http://localhost:%PORT%

echo Server running at http://localhost:%PORT%
echo Press any key to stop server and exit...
pause >nul

taskkill /F /IM node.exe >nul 2>&1
if exist port.txt del port.txt
echo Server stopped.