import { LavalinkTrackLoadResult, UpdatePlayerOptions } from './payload';

export interface LavalinkRestApiOptions {
  host: string;
  port: number;
  authorization: string;
  secure: boolean;
}

export class LavalinkRestApi<UserData> {
  options: LavalinkRestApiOptions;
  sessionId: string | null = null;

  constructor(options: LavalinkRestApiOptions) {
    this.options = options;
  }

  private get restUrl(): URL {
    const { host, port, secure } = this.options;
    const websocketUrl = `http://${host}/`;
    const url = new URL(websocketUrl);

    url.port = String(port);
    url.protocol = secure ? 'https' : 'http';

    return url;
  }

  private buildUpdatePlayerUrl(guildId: string): URL {
    return new URL(`/v4/sessions/${this.sessionId}/players/${guildId}`, this.restUrl);
  }

  async updatePlayer(guildId: string, options: UpdatePlayerOptions<UserData>, noReplace = false) {
    const { authorization } = this.options;
    const url = this.buildUpdatePlayerUrl(guildId);

    url.searchParams.set('noReplace', String(noReplace));

    await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });
  }

  async destroyPlayer(guildId: string) {
    const { authorization } = this.options;
    await fetch(this.buildUpdatePlayerUrl(guildId), {
      method: 'DELETE',
      headers: {
        Authorization: authorization
      }
    });
  }

  async loadTracks(identifier: string) {
    const { authorization } = this.options;
    const headers = { Authorization: authorization };
    const loadTracksUrl = new URL('/v4/loadtracks', this.restUrl);

    loadTracksUrl.searchParams.set('identifier', identifier);

    const response = await fetch(loadTracksUrl, { headers });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body: LavalinkTrackLoadResult<UserData> = await response.json();

    return body;
  }
}
