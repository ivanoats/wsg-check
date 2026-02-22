export const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'WSG-Check API',
    version: '1.0.0',
    description:
      'REST API for website sustainability analysis against the W3C Web Sustainability Guidelines.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': { description: 'Service is healthy' },
        },
      },
    },
    '/api/check': {
      post: {
        summary: 'Run a sustainability check',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', format: 'uri' },
                  categories: {
                    type: 'array',
                    items: { type: 'string', enum: ['ux', 'web-dev', 'hosting', 'business'] },
                  },
                  guidelines: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  format: { type: 'string', enum: ['json', 'html', 'markdown'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Completed sustainability report' },
          '400': { description: 'Invalid request payload or URL' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/check/{id}': {
      get: {
        summary: 'Fetch a completed check by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Check found' },
          '404': { description: 'Check not found' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/guidelines': {
      get: {
        summary: 'List all WSG guidelines',
        responses: {
          '200': { description: 'Guideline list' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/guidelines/{id}': {
      get: {
        summary: 'Get a single guideline by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Guideline details' },
          '404': { description: 'Guideline not found' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
  },
} as const
