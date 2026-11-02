import React, { Component } from 'react';
import './App.css';
import { PitchShifter } from 'soundtouchjs';
import packageJSON from '../package.json';
import { saveAs } from 'file-saver';
import toWav from 'audiobuffer-to-wav';
import messages from './language.json';

const version = packageJSON.subversion;
const jaText = messages.ja;
const usText = messages.us;
var m;
if (window.navigator.language.slice(0, 2) === 'ja') m = jaText;
else m = usText;

window.AudioContext = window.AudioContext || window.webkitAudioContext;

// AudioContext はアプリ全体で 1つだけ使い回す (iOSの上限クラッシュ防止)
var audioCtx = null;
var gainNode = null;
var shifter = null;

class App extends Component {
  constructor(props) {
    super(props);

    this.params = {
      filename: null,
      audioBuffer: null,
      isPlaying: false,
      loop: false,
      loopInterval: 2.0,
      exportBuffer: null,
      save: false,
    };

    this.state = {
      ja: m === jaText,
      playingAt: 0,
      playingAtSlider: 0,
      timeA: 0,
      timeB: 0,
      playSpeed: 100,
      playPitch: 0,
      playPitchSemi: 0,
      playPitchCents: 0,
      playVolume: 75,
      startButtonStr: m.loadFile,
      loopButtonStr: m.loopAB,
      saveButtonStr: m.exportWav,
      isExporting: false, // エクスポート中フラグ
    };

    this.handleWindowClose = this.handleWindowClose.bind(this);
    this.loadFile = this.loadFile.bind(this);
    this.handleSpeedSlider = this.handleSpeedSlider.bind(this);
    this.handlePitchSlider = this.handlePitchSlider.bind(this);
    this.handleTimeSlider = this.handleTimeSlider.bind(this);
    this.handleVolumeSlider = this.handleVolumeSlider.bind(this);
    this.handlePlay = this.handlePlay.bind(this);
    this.handleSaveB = this.handleSaveB.bind(this);
    this.fakeDownload = this.fakeDownload.bind(this);
    this.handleLoop = this.handleLoop.bind(this);
    this.playAB = this.playAB.bind(this);
    this.handleLang = this.handleLang.bind(this);
  }

  // AudioContext の初期化 (iOS対応: 1回だけ生成して使い回す)
  ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new window.AudioContext();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = this.state.playVolume / 100.0;
      gainNode.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  handleWindowClose() {
    if (shifter) {
      shifter.disconnect();
      shifter.off();
      shifter = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
  }

  componentDidMount() {
    window.addEventListener('beforeunload', this.handleWindowClose);
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.handleWindowClose);
    this.handleWindowClose();
  }

  render() {
    const {
      loadFile,
      handleSpeedSlider,
      handlePitchSlider,
      handleVolumeSlider,
      handleTimeSlider,
      handlePlay,
      handleSaveB,
      handleLoop,
      handleLang,
    } = this;
    const {
      ja,
      playingAt,
      playingAtSlider,
      timeA,
      timeB,
      playSpeed,
      playPitch,
      playPitchSemi,
      playPitchCents,
      playVolume,
      startButtonStr,
      loopButtonStr,
      saveButtonStr,
      isExporting,
    } = this.state;

    let duration = 0;
    if (this.params.audioBuffer) duration = this.params.audioBuffer.duration;

    let startBStyle = startButtonStr === m.pause ? { color: 'green' } : {};
    let loopBStyle = loopButtonStr === m.stopLoop ? { color: 'green' } : {};
    let saveBStyle = isExporting ? { color: 'orange', fontWeight: 'bold' } : {};
    let hrBlue = { border: '1px dotted', color: 'blue' };

    return (
      <div className="App">
        {m.title} &nbsp;&nbsp;
        <span className="small-button">
          <button name="language" onClick={handleLang}>
            {ja ? 'En(US)' : '日本語'}
          </button>
        </span>
        <hr />
        1) {m.input}: <br />
        <span className="selectFile">
          <input
            type="file"
            name="loadFile"
            accept="audio/*,.wav,.mp3,.aac,.m4a,.opus"
            onChange={loadFile}
          />
          <br />
        </span>
        <hr />
        {m.speed}: {playSpeed} &nbsp;&nbsp;
        <button name="reset" onClick={handleSpeedSlider}>
          {m.reset}
        </button>
        <br />
        <span className="slider">
          <center>
            025
            <input
              type="range"
              name="speedSlider"
              min="25"
              max="200"
              value={playSpeed}
              onChange={handleSpeedSlider}
            />
            200
          </center>
        </span>
        <hr />
        {m.pitch}: {parseFloat(playPitch).toFixed(2)} &nbsp;&nbsp;
        <button name="reset" onClick={handlePitchSlider}>
          {m.reset}
        </button>
        <br />
        <span className="slider">
          <center>
            -12
            <input
              type="range"
              name="pitchSliderSemi"
              min="-12"
              max="12"
              value={playPitchSemi}
              onChange={handlePitchSlider}
            />
            12
            <br />
            <hr style={hrBlue} />
            -100
            <input
              type="range"
              name="pitchSliderCents"
              min="-100"
              max="100"
              value={playPitchCents}
              onChange={handlePitchSlider}
            />
            100
            <br />
          </center>
        </span>
        <hr />
        {m.time}: {playingAt.toFixed(2)} &nbsp; {m.timeNote}
        <br />
        <span className="slider">
          <center>
            0
            <input
              type="range"
              name="timeSlider"
              min="0"
              max={duration}
              value={playingAtSlider}
              step="1"
              onChange={handleTimeSlider}
            />
            {Math.round(duration)}
            <br />
          </center>
          <button name="setA" onClick={handleLoop}>
            {m.setA}
          </button>
          : {timeA.toFixed(2)} &nbsp;&nbsp;
          <button name="setB" onClick={handleLoop}>
            {m.setB}
          </button>
          : {timeB.toFixed(2)} &nbsp;&nbsp;
          <button name="resetAB" onClick={handleLoop}>
            {m.resetAB}
          </button>
        </span>
        <hr />
        {m.volume}: {playVolume} &nbsp;&nbsp; {m.volumeNote}
        <br />
        <span className="slider">
          <center>
            0
            <input
              type="range"
              name="volumeSlider"
              min="0"
              max="150"
              value={playVolume}
              onChange={handleVolumeSlider}
            />
            150
            <br />
          </center>
        </span>
        <hr />
        <span>
          2A){' '}
          <button name="startPause" onClick={handlePlay} style={startBStyle}>
            {startButtonStr}
          </button>{' '}
          &nbsp;&nbsp;
          <button name="Rewind" onClick={handleLoop}>
            {m.rewind}
          </button>
          <hr style={hrBlue} />
          2B){' '}
          <button name="LoopAB" onClick={handleLoop} style={loopBStyle}>
            {loopButtonStr}
          </button>{' '}
          &nbsp;&nbsp;
          {m.interval}{' '}
          <span className="selector">
            <select
              name="loopInterval"
              defaultValue={this.params.loopInterval}
              onChange={handleLoop}
            >
              <option value="0">00</option>
              <option value="1">01</option>
              <option value="2">02</option>
              <option value="4">04</option>
              <option value="5">05</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="60">60</option>
            </select>
          </span>
          <hr />
          3){' '}
          <button
            name="save"
            onClick={handleSaveB}
            style={saveBStyle}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting (Fast)...' : saveButtonStr}
          </button>
        </span>
        <hr />
        {m.version}: {version}, &nbsp;
        <a href={m.homepage} target="_blank" rel="noopener noreferrer">
          {m.guide}
        </a>
        <br />
        Based on{' '}
        <a
          href="https://github.com/cutterbl/SoundTouchJS"
          target="_blank"
          rel="noopener noreferrer"
        >
          cutterbl/SoundTouchJS
        </a>
      </div>
    );
  }

  loadFile(event) {
    if (event.target.name !== 'loadFile') return;
    if (event.target.files.length === 0) return;
    if (this.params.isPlaying) return;

    const ctx = this.ensureAudioContext();
    let file = event.target.files[0];
    this.params.filename = file.name;

    let reader = new FileReader();

    reader.onload = (e) => {
      ctx.decodeAudioData(
        reader.result,
        (audioBuffer) => {
          this.params.audioBuffer = audioBuffer;
          this.setState({
            startButtonStr: m.playOnce,
            playingAt: 0,
            playingAtSlider: 0,
            timeA: 0,
            timeB: audioBuffer.duration,
          });
        },
        (error) => {
          console.log('Filereader error: ' + error);
        }
      );
    };

    reader.readAsArrayBuffer(file);
  }

  handleSpeedSlider(event) {
    if (event.target.name === 'speedSlider') {
      if (shifter) shifter.tempo = event.target.value / 100.0;
      this.setState({ playSpeed: event.target.value });
      return;
    }
    if (event.target.name === 'reset') {
      if (shifter) shifter.tempo = 1;
      this.setState({ playSpeed: 100 });
      return;
    }
  }

  handlePitchSlider(event) {
    let pitchSemi = 0;
    if (event.target.name === 'pitchSliderSemi') {
      pitchSemi =
        parseFloat(event.target.value) +
        parseFloat(this.state.playPitchCents) / 100.0;
      this.setState({ playPitchSemi: event.target.value });
    } else if (event.target.name === 'pitchSliderCents') {
      pitchSemi =
        parseFloat(this.state.playPitchSemi) +
        parseFloat(event.target.value) / 100.0;
      this.setState({ playPitchCents: event.target.value });
    } else if (event.target.name === 'reset') {
      this.setState({ playPitchSemi: 0, playPitchCents: 0 });
      pitchSemi = 0;
    }

    if (shifter) {
      shifter.pitch = Math.pow(2.0, pitchSemi / 12.0);
    }
    this.setState({ playPitch: pitchSemi });
  }

  handleTimeSlider(event) {
    if (event.target.name !== 'timeSlider') return;
    if (this.state.startButtonStr === m.playOnce) {
      let value = event.target.value;
      this.setState({ playingAt: parseFloat(value), playingAtSlider: value });
    }
  }

  handleVolumeSlider(event) {
    if (event.target.name !== 'volumeSlider') return;
    let vol = event.target.value * 1.0;
    if (gainNode) gainNode.gain.value = vol / 100.0;
    this.setState({ playVolume: vol });
  }

  handlePlay(event) {
    const { audioBuffer } = this.params;
    if (event.target.name === 'startPause') {
      this.ensureAudioContext();

      if (this.state.startButtonStr === m.pause) {
        if (!this.params.isPlaying) return;
        if (shifter === null) return;

        shifter.disconnect();
        shifter.off();
        shifter = null;
        this.params.isPlaying = false;
        this.setState({
          playingAtSlider: this.state.playingAt,
          startButtonStr: m.playOnce,
        });
        return;
      }

      if (
        event.target.name === 'startPause' &&
        this.state.startButtonStr === m.playOnce
      ) {
        if (this.params.isPlaying) return;
        this.playAB(this.state.playingAt, audioBuffer.duration);
        return;
      }
    }
  }

  fakeDownload(audioBuffer) {
    const words = this.params.filename.split('.');
    let outFileName =
      words[0] +
      '&s' +
      parseInt(this.state.playSpeed, 10) +
      '&p' +
      parseInt(this.state.playPitch * 100, 10) +
      '.wav';
    let blob = new Blob([toWav(audioBuffer)], { type: 'audio/vnd.wav' });
    saveAs(blob, outFileName);
  }

  // ★ OfflineAudioContext を使った「一瞬書き出し」の実装
  async handleSaveB(event) {
    if (event.target.name !== 'save') return;
    const { audioBuffer } = this.params;
    if (!audioBuffer || this.params.isPlaying || this.state.isExporting) return;

    this.setState({ isExporting: true });

    try {
      const speed = this.state.playSpeed / 100.0;
      const pitch = Math.pow(2.0, this.state.playPitch / 12.0);

      // 書き出し範囲 (timeA ~ timeB、リセット状態なら全体)
      const startSec = this.state.timeA;
      const endSec = this.state.timeB || audioBuffer.duration;
      const sourceDuration = endSec - startSec;
      const targetDuration = sourceDuration / speed;

      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;
      const totalFrames = Math.ceil(targetDuration * sampleRate);

      // 1. 部分バッファを作成
      const fromFrame = Math.floor(startSec * sampleRate);
      const toFrame = Math.floor(endSec * sampleRate);
      const frameCount = toFrame - fromFrame;

      const OfflineCtx =
        window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const offlineCtx = new OfflineCtx(channels, totalFrames, sampleRate);

      const slicedBuffer = offlineCtx.createBuffer(channels, frameCount, sampleRate);
      for (let c = 0; c < channels; c++) {
        const src = audioBuffer.getChannelData(c).subarray(fromFrame, toFrame);
        slicedBuffer.getChannelData(c).set(src);
      }

      // 2. OfflineContext 上に PitchShifter を構築
      const bufferSize = 4096;
      const offlineShifter = new PitchShifter(offlineCtx, slicedBuffer, bufferSize);
      offlineShifter.tempo = speed;
      offlineShifter.pitch = pitch;

      // 3. ゲインノードを通して destination に直結
      const offlineGain = offlineCtx.createGain();
      offlineGain.gain.value = this.state.playVolume / 100.0;

      offlineShifter.connect(offlineGain);
      offlineGain.connect(offlineCtx.destination);

      // 4. バックグラウンドで超高速レンダリング (1〜2秒で終了)
      const renderedBuffer = await offlineCtx.startRendering();

      // 5. ダウンロード実行
      this.fakeDownload(renderedBuffer);
    } catch (err) {
      console.error('Fast Export failed:', err);
      alert('Export failed: ' + err);
    } finally {
      this.setState({ isExporting: false });
    }
  }

  handleLoop(event) {
    if (event.target.name === 'loopInterval') {
      this.params.loopInterval = parseInt(event.target.value, 10);
      return;
    }

    if (event.target.name === 'Rewind') {
      if (this.params.isPlaying) return;
      this.setState({ playingAt: 0, playingAtSlider: 0 });
      return;
    }

    if (event.target.name === 'setA') {
      this.setState({
        timeA: this.state.playingAt,
        playingAtSlider: this.state.playingAt,
      });
      return;
    }

    if (event.target.name === 'setB') {
      if (this.state.playingAt >= this.state.timeA)
        this.setState({ timeB: parseFloat(this.state.playingAt) });
      else
        this.setState({ timeB: parseFloat(this.state.timeA) + 10 });
      return;
    }

    if (event.target.name === 'LoopAB') {
      if (!this.params.audioBuffer) return;

      if (this.state.loopButtonStr === m.loopAB) {
        if (this.params.isPlaying) return;
        this.params.loop = true;
        this.playAB(this.state.timeA, this.state.timeB);
        this.setState({
          loopButtonStr: m.stopLoop,
          startButtonStr: m.playOnce,
        });
      } else if (this.state.loopButtonStr === m.stopLoop) {
        if (!this.params.isPlaying) return;

        if (shifter) {
          shifter.disconnect();
          shifter.off();
          shifter = null;
        }

        this.params.isPlaying = false;
        this.params.loop = false;
        this.setState({ loopButtonStr: m.loopAB });
      }
      return;
    }

    if (event.target.name === 'resetAB') {
      if (this.params.audioBuffer === null) return;
      this.setState({
        timeA: 0,
        timeB: this.params.audioBuffer.duration,
        playingAtSlider: 0,
      });
      return;
    }
  }

  playAB(timeA, timeB) {
    if (this.params.isPlaying) return;
    if (this.params.audioBuffer === null) return;

    const ctx = this.ensureAudioContext();

    if (timeB <= timeA) {
      timeB = timeA + 5;
      this.setState({ timeB: timeB });
    }

    const { audioBuffer, loopInterval } = this.params;

    const from = Math.floor(timeA * audioBuffer.sampleRate);
    const to = Math.floor(timeB * audioBuffer.sampleRate);
    let offset = 0;
    if (this.params.loop) {
      offset = Math.floor(loopInterval * audioBuffer.sampleRate);
    }

    // メモリ節約: 必要な部分だけをスライスして最小限のバッファを作成
    const channels = audioBuffer.numberOfChannels;
    const partialBuffer = ctx.createBuffer(
      channels,
      to - from + offset,
      audioBuffer.sampleRate
    );

    for (let c = 0; c < channels; c++) {
      const src = audioBuffer.getChannelData(c).subarray(from, to);
      const dst = partialBuffer.getChannelData(c);
      dst.set(src, offset); // offset 秒分は無音 (2秒インターバル)
    }

    let bufferSize = 4096; // 16384 から 4096 に小さくしてレイテンシとメモリを改善
    if (shifter) {
      shifter.disconnect();
      shifter.off();
      shifter = null;
    }

    shifter = new PitchShifter(ctx, partialBuffer, bufferSize);
    shifter.tempo = this.state.playSpeed / 100.0;
    shifter.pitch = Math.pow(2.0, this.state.playPitch / 12.0);

    let duration = shifter.formattedDuration;

    shifter.on('play', (detail) => {
      let currentPos = parseFloat(timeA) + parseFloat(detail.timePlayed);
      if (this.params.loop) currentPos -= loopInterval;

      this.setState({ playingAt: currentPos, playingAtSlider: currentPos });

      if (detail.formattedTimePlayed >= duration) {
        shifter.off();
        shifter.disconnect();
        shifter = null;

        this.params.isPlaying = false;
        if (this.state.startButtonStr === m.pause) {
          this.setState({
            playingAt: 0,
            playingAtSlider: 0,
            startButtonStr: m.playOnce,
          });
        }

        if (this.params.loop) {
          this.playAB(this.state.timeA, this.state.timeB);
        }
      }
    });

    shifter.connect(gainNode);

    this.params.isPlaying = true;
    if (!this.params.loop) {
      this.setState({ startButtonStr: m.pause });
    }
  }

  handleLang(e) {
    if (this.params.isPlaying) return;

    if (e.target.name === 'language') {
      let oldm = m;
      if (this.state.ja) {
        m = usText;
        this.setState({ ja: false });
      } else {
        m = jaText;
        this.setState({ ja: true });
      }

      if (this.state.startButtonStr === oldm.loadFile)
        this.setState({ startButtonStr: m.loadFile });
      else if (this.state.startButtonStr === oldm.playOnce)
        this.setState({ startButtonStr: m.playOnce });
      else if (this.state.startButtonStr === oldm.pause)
        this.setState({ startButtonStr: m.pause });

      if (this.state.loopButtonStr === oldm.loopAB)
        this.setState({ loopButtonStr: m.loopAB });
      else if (this.state.loopButtonStr === oldm.stopLoop)
        this.setState({ loopButtonStr: m.stopLoop });

      if (this.state.saveButtonStr === oldm.exportWav)
        this.setState({ saveButtonStr: m.exportWav });
      else if (this.state.saveButtonStr === oldm.abortExport)
        this.setState({ saveButtonStr: m.abortExport });
    }
  }
}

export default App;
