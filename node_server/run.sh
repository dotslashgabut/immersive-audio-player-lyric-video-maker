#!/bin/bash
echo "Starting server..."

rm -f port.txt

node server.js &

while [ ! -f port.txt ]; do
  sleep 1
done

PORT=$(cat port.txt)

if command -v xdg-open > /dev/null; then
  xdg-open "http://localhost:$PORT"
elif command -v open > /dev/null; then
  open "http://localhost:$PORT"
else
  echo "Could not detect browser opener. Open http://localhost:$PORT manually."
fi

echo "Server running at http://localhost:$PORT"
echo "Press ENTER to stop server and exit..."
read

pkill -f "node server.js"
rm -f port.txt
echo "Server stopped."