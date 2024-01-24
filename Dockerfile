FROM node:lts-slim

WORKDIR /usr/src/app

ENV PORT 80

COPY package*.json ./

RUN npm install

COPY . ./

RUN node -v

CMD [ "npm", "start" ]