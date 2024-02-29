export interface IdentifierParseResult {
  identifiers: string[];
  spotify?: boolean;
}

export const parseIdentifiers = (query: String): IdentifierParseResult => {
  return { identifiers: [] };
};
