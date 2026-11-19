import type { RemoteError, RemoteErrorCode } from './contract';

/** A request that can't be carried out, answered with its code instead of an internal error. */
export class RemoteFailure extends Error {
  constructor(
    readonly code: RemoteErrorCode,
    message: string,
    readonly details?: Record<string, string>
  ) {
    super(message);
  }
}

// Thrown by Lavalink.availableNode, and by a node's session id while it has none
const NODE_ERRORS = ['No nodes connected', 'Cannot fetch connected node', 'No session identifier'];

export const toRemoteError = (error: unknown): RemoteError => {
  if (error instanceof RemoteFailure) {
    return { code: error.code, message: error.message, ...(error.details && { details: error.details }) };
  }

  const message = error instanceof Error ? error.message : String(error);

  if (NODE_ERRORS.some((nodeError) => message.startsWith(nodeError))) {
    return { code: 'NODE_UNAVAILABLE', message };
  }

  return { code: 'INTERNAL', message };
};
