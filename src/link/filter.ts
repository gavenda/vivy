import { Equalizer, Karaoke, Timescale } from './payload';
import { Player } from './player';

export class LavalinkFilter<UserData> {
  player: Player<UserData>;

  constructor(player: Player<UserData>) {
    this.player = player;
  }

  async reset() {
    const { volume } = this.player;
    await this.player.update({ filters: { volume } });
  }

  async setTimescale(timescale: Timescale) {
    const { volume } = this.player;
    await this.player.update({ filters: { volume, timescale } });
  }

  async setKaraoke(karaoke: Karaoke) {
    const { volume } = this.player;
    await this.player.update({ filters: { volume, karaoke } });
  }

  async setEqualizer(equalizer: Equalizer[]) {
    const { volume } = this.player;
    await this.player.update({ filters: { volume, equalizer } });
  }
}
