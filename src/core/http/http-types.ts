import type { IncomingMessage, ServerResponse } from 'node:http';

export interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  pathSegments: string[];
  locale: string;
}

export type HttpHandler = (context: RequestContext) => Promise<void>;
