#!/bin/bash

# Function to start the backend services
start_backend() {
  backend_dir="./back_end"  # Replace with the actual backend directory path
  cd "$backend_dir" || exit

  # Start FastAPI service
  python3 main.py &
  fastapi_pid=$!

  # Start LSP service
  python3 lsp_server.py &
  lsp_pid=$!

  cd ..
}

# Function to start the frontend service
start_frontend() {
  frontend_dir="./front_end/agent_visual"  # Replace with the actual frontend directory path
  cd "$frontend_dir" || exit

  # Install the serve module globally
  npm install -g serve

  # Start the serve service
  serve -s dist &
  serve_pid=$!

  # Display frontend local URL
  echo "Frontend is running at: http://localhost:3000"
}

# Function to handle script termination
cleanup() {
  echo "Stopping all services..."
  kill $fastapi_pid $lsp_pid $serve_pid
  exit
}

# Trap SIGINT (Ctrl+C) to clean up services
trap cleanup SIGINT

# Start backend and frontend services
start_backend
start_frontend

# Wait for all background processes
wait
