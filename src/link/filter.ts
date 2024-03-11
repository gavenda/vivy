import { Equalizer, Karaoke, Timescale } from './payload';
import { Player } from './player';

export class LavalinkFilter<UserData> {
  volume: number = 1.0;
  player: Player<UserData>;

  constructor(player: Player<UserData>) {
    this.player = player;
  }

  async reset() {
    const { volume } = this;
    await this.player.update({ filters: { volume } });
  }

  async applyVolume(volume: number) {
    this.volume = volume;
    await this.player.update({ filters: { volume } });
  }

  async applyTimescale(timescale: Timescale) {
    const { volume } = this;
    await this.player.update({ filters: { volume, timescale } });
  }

  async applyKaraoke(karaoke: Karaoke) {
    const { volume } = this;
    await this.player.update({ filters: { volume, karaoke } });
  }

  async applyEqualizer(equalizer: Equalizer[]) {
    const { volume } = this;
    await this.player.update({ filters: { volume, equalizer } });
  }
}
