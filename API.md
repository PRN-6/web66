# API Documentation

## Base URL
`http://localhost:3000/api/v1`

## Endpoints

### GET /health
Returns the status of the server.
- **Response**: `200 OK` { "status": "up" }

### POST /data
Submits data to the system.
- **Payload**: { "name": "string", "value": "number" }
- **Response**: `201 Created`
