import type {
  ChannelMix,
  Distortion,
  Equalizer,
  Filters,
  Karaoke,
  LowPass,
  Rotation,
  Timescale,
  Tremolo,
  Vibrato
} from './payload';
import { Player } from './player';

export class LavalinkFilter<UserData> {
  volume: number = 1.0;
  player: Player<UserData>;
  raw: Filters = {};

  constructor(player: Player<UserData>) {
    this.player = player;
  }

  async reset() {
    const { volume } = this;
    this.raw = { volume };
    await this.player.update({ filters: this.raw });
  }

  async applyFilters(filter: Filters) {
    const { volume } = this;
    this.raw = { ...filter, volume };
    await this.player.update({ filters: this.raw });
  }

  async applyEqualizer(equalizer: Equalizer[]) {
    this.raw = { ...this.raw, equalizer };
    await this.player.update({ filters: this.raw });
  }

  async applyKaraoke(karaoke: Karaoke) {
    this.raw = { ...this.raw, karaoke };
    await this.player.update({ filters: this.raw });
  }

  async applyTimescale(timescale: Timescale) {
    this.raw = { ...this.raw, timescale };
    await this.player.update({ filters: this.raw });
  }

  async applyTremolo(tremolo: Tremolo) {
    this.raw = { ...this.raw, tremolo };
    await this.player.update({ filters: this.raw });
  }

  async applyVibrato(vibrato: Vibrato) {
    this.raw = { ...this.raw, vibrato };
    await this.player.update({ filters: this.raw });
  }

  async applyRotation(rotation: Rotation) {
    this.raw = { ...this.raw, rotation };
    await this.player.update({ filters: this.raw });
  }

  async applyDistortion(distortion: Distortion) {
    this.raw = { ...this.raw, distortion };
    await this.player.update({ filters: this.raw });
  }

  async applyChannelMix(channelMix: ChannelMix) {
    this.raw = { ...this.raw, channelMix };
    await this.player.update({ filters: this.raw });
  }

  async applyLowPass(lowPass: LowPass) {
    this.raw = { ...this.raw, lowPass };
    await this.player.update({ filters: this.raw });
  }

  async applyVolume(volume: number) {
    this.volume = volume;
    await this.player.update({ filters: this.raw });
  }
}
