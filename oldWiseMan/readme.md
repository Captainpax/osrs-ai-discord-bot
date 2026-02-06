# Old Wise Man API

A robust Node.js 22 API for Old School RuneScape (OSRS) integration, profile management, and server settings.

## Features

- **OSRS Integration**: Fetch player stats, skills, boss kills, clues, and minigame scores using `oldschooljs`.
- **Wiki Search**: Search the OSRS Wiki directly from the API.
- **Profile Management**: Create, login, link OSRS accounts, and manage user profiles.
- **Authentication**: JWT-based security for sensitive operations.
- **Server Settings**: Store and retrieve per-guild settings (e.g., for Discord bots).
- **Custom Logger**: Colorized logging with debug levels and timestamps.
- **Database**: Persistent storage using MongoDB and Mongoose.
- **Clean Boot**: Graceful startup and shutdown sequences.

## Prerequisites

- **Node.js**: Version 22 or higher.
- **MongoDB**: A running MongoDB instance (local or Atlas).

## Installation

1. Navigate to the `oldWiseMan` directory:
   ```bash
   cd oldWiseMan
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the `oldWiseMan` root directory with the following variables:

```env
OLD_WISE_MAN_PORT=8888
DEBUG=true
MONGODB_URI=mongodb://your-mongodb-uri
JWT_SECRET=your-secure-secret-key
```

## Running the Application

To start the server:

```bash
npm start
```

The server will initialize the MongoDB connection and start listening on the configured `OLD_WISE_MAN_PORT`.

## API Documentation

### Public Endpoints

#### Health Check
- **URL**: `GET /health`
- **Description**: Checks if the API is running.
- **Response**: `200 OK`

#### OSRS Ping
- **URL**: `GET /osrs/ping`
- **Description**: Pings OSRS Hiscores to check connectivity and latency.

#### OSRS Wiki
- **URL**: `GET /osrs/wiki/:query`
- **Description**: Searches the OSRS Wiki.

### Profile Endpoints

#### Create Profile
- **URL**: `POST /profile/create`
- **Body**:
  ```json
  { "uuid": "12345", "username": "WiseGuy" }
  ```

#### Login
- **URL**: `POST /profile/login`
- **Description**: Logs in and returns a JWT token.
- **Body**:
  ```json
  { "uuid": "12345" }
  ```

#### Logout
- **URL**: `POST /profile/logout`
- **Body**:
  ```json
  { "uuid": "12345" }
  ```

#### Get Levels
- **URL**: `POST /profile/levels`
- **Description**: Fetches OSRS levels for the linked account.
- **Body**:
  ```json
  { "uuid": "12345" }
  ```

#### Link OSRS Account (Authenticated)
- **URL**: `POST /profile/link`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  { "uuid": "12345", "osrsName": "Zezima" }
  ```

#### Delete Profile (Authenticated)
- **URL**: `DELETE /profile/delete`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  { "uuid": "12345" }
  ```

### OSRS Stats Endpoints

All stats endpoints support `identifier` as a `uuid`, `username`, or `osrsName`.

- **Full Stats**: `GET /osrs/stats/:identifier`
- **Skill**: `GET /osrs/stats/:identifier/skill/:skill`
- **Boss**: `GET /osrs/stats/:identifier/boss/:boss`
- **Clues**: `GET /osrs/stats/:identifier/clues/:clue`
- **Minigames**: `GET /osrs/stats/:identifier/minigames/:minigame`

### Server Settings Endpoints

#### Update Settings
- **URL**: `POST /settings/server`
- **Body**:
  ```json
  { 
    "guildId": "987654321", 
    "prefix": "!", 
    "settings": { "welcomeChannel": "123" } 
  }
  ```

#### Get Settings
- **URL**: `GET /settings/server/:guildId`

## Caching

The API uses a MongoDB-backed caching system for OSRS Wiki data and GE prices to reduce external API load and improve performance.

- **Storage**: Cached data is stored in the `caches` collection.
- **TTL**: Entries automatically expire from the database after 7 days (managed by MongoDB TTL index).
- **Cleanup**: You can manually clear the cache using npm scripts:
  - `npm run cache:clear` — Clears the entire cache.
  - `npm run cache:clear <prefix>` — Clears entries starting with a specific prefix (e.g., `osrs:wiki:`).

## Project Structure

- `src/api/`: Express application, routes, and middleware.
- `src/osrs/`: OSRS specific logic, wiki lookups, and connection utilities.
- `src/storage/`: MongoDB models and connection handling.
- `src/utility/`: Centralized variables and logger.
- `initmain.mjs`: Main entry point.

## License

ISC
