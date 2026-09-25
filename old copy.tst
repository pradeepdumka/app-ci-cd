services:
  mongo:
    image: mongo:7
    container_name: dckertestapp-mongo
    hostname: mongo
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 15s
    networks:
      - appnet

  backend:
    build: ./backend
    container_name: dckertestapp-backend
    restart: on-failure
    ports:
      - "4000:4000"
    env_file:
      - ./backend/.env
    environment:
      HOST: 0.0.0.0
      PORT: 4000
      MONGODB_URI: mongodb://mongo:27017/user_dashboard
      CLIENT_URL: http://localhost:4200
      NODE_ENV: production
    depends_on:
      mongo:
        condition: service_healthy
    networks:
      - appnet

  frontend:
    build: ./frontend
    container_name: dckertestapp-frontend
    ports:
      - "4200:80"
    depends_on:
      - backend
    networks:
      - appnet

networks:
  appnet:
    driver: bridge

volumes:
  mongo_data:
