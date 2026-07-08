// swagger.js
// Minimal OpenAPI/Swagger spec for the Kindred Connect backend.
// This powers the interactive API docs at /api-docs.

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Kindred Connect Admin API',
    version: '1.0.0',
    description:
      'Admin-only backend for managing profiles, sessions, and feedback in Kindred Connect.',
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local dev',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/login': {
      post: {
        summary: 'Admin login using Firebase ID token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  idToken: { type: 'string' },
                },
                required: ['idToken'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Backend JWT issued',
          },
          400: { description: 'Missing or invalid token' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/users': {
      post: {
        summary: 'Create elder/orphan profile',
        responses: {
          201: { description: 'Profile created' },
        },
      },
      get: {
        summary: 'List/search profiles',
        parameters: [
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['elder', 'orphan'] },
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Profiles list' },
        },
      },
    },
    '/api/matches': {
      post: {
        summary: 'Get ML-based match recommendations',
        responses: {
          200: { description: 'Ranked matches returned' },
        },
      },
    },
    '/api/sessions': {
      post: {
        summary: 'Schedule session between elder and orphan',
        responses: {
          201: { description: 'Session created with video link' },
        },
      },
      get: {
        summary: 'List sessions',
        responses: {
          200: { description: 'Sessions list' },
        },
      },
    },
    '/api/feedback': {
      post: {
        summary: 'Submit post-session feedback + sentiment analysis',
        responses: {
          201: { description: 'Feedback stored' },
        },
      },
    },
  },
};

export default swaggerSpec;

