import { ChannelMix, Distortion, Equalizer, Karaoke, LowPass, Rotation, Timescale, Tremolo, Vibrato } from './payload';
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

  async applyEqualizer(equalizer: Equalizer[]) {
    const { volume } = this;
    await this.player.update({ filters: { volume, equalizer } });
  }

  async applyKaraoke(karaoke: Karaoke) {
    const { volume } = this;
    await this.player.update({ filters: { volume, karaoke } });
  }

  async applyTimescale(timescale: Timescale) {
    const { volume } = this;
    await this.player.update({ filters: { volume, timescale } });
  }

  async applyTremolo(tremolo: Tremolo) {
    const { volume } = this;
    await this.player.update({ filters: { volume, tremolo } });
  }

  async applyVibrato(vibrato: Vibrato) {
    const { volume } = this;
    await this.player.update({ filters: { volume, vibrato } });
  }

  async applyRotation(rotation: Rotation) {
    const { volume } = this;
    await this.player.update({ filters: { volume, rotation } });
  }

  async applyDistortion(distortion: Distortion) {
    const { volume } = this;
    await this.player.update({ filters: { volume, distortion } });
  }

  async applyChannelMix(channelMix: ChannelMix) {
    const { volume } = this;
    await this.player.update({ filters: { volume, channelMix } });
  }

  async applyLowPass(lowPass: LowPass) {
    const { volume } = this;
    await this.player.update({ filters: { volume, lowPass } });
  }

  async applyVolume(volume: number) {
    this.volume = volume;
    await this.player.update({ filters: { volume } });
  }
}
