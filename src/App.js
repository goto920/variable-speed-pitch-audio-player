import React, { Component } from 'react';
// import logo from './logo.svg';
import './App.css';
import {PitchShifter} from 'soundtouchjs'
import packageJSON from '../package.json'
import {saveAs} from 'file-saver';
import * as toWav from 'audiobuffer-to-wav';
import messages from './language.json';

const version = packageJSON.subversion
// var homepage = 'https://goto920.github.io/demos/variableplayer/'
const jaText = messages.ja;
const usText = messages.us;
var m;
if (window.navigator.language.slice(0,2) === 'ja') m = jaText
else m = usText

window.AudioContext = window.AudioContext || window.webkitAudioContext

var audioCtx;
var gainNode;
// =  audioCtx.createGain()
var shifter = null // null

class App extends Component {

  constructor (props){
    super(props)

    this.params = {
      filename: null,
      audioBuffer: null,
      isPlaying: false,
      loop: false,
      loopInterval: 2.0,
      exportDataL: null,
      exportDataR: null,
      exportBuffer: null,
      save: false
    }

    this.state = {
      ja: (m === jaText),
      playingAt: 0,
      playingAtSlider: 0,
      timeA: 0,
      timeB: 0,
      playSpeed: 100, // in percent
      playPitch: 0, // in semi-tone unit (real value)
      playPitchSemi: 0, // in semi-tone (integer part)
      playPitchCents: 0, // percent for one semitone
      playVolume: 75, // in percent
      startButtonStr: m.loadFile, 
      loopButtonStr: m.loopAB,
      saveButtonStr: m.exportWav
    }

    this.setState = this.setState.bind(this)
    this.handleWindowClose = this.handleWindowClose.bind(this)
    this.loadFile = this.loadFile.bind(this)
    this.handleSpeedSlider = this.handleSpeedSlider.bind(this)
    this.handlePitchSlider = this.handlePitchSlider.bind(this)
    this.handleTimeSlider = this.handleTimeSlider.bind(this)
    this.handleVolumeSlider = this.handleVolumeSlider.bind(this)
    this.handlePlay = this.handlePlay.bind(this);
    this.handleSaveB = this.handleSaveB.bind(this);
    this.fakeDownload = this.fakeDownload.bind(this);
    this.handleLoop = this.handleLoop.bind(this);
    this.playAB = this.playAB.bind(this);
    this.handleLang = this.handleLang.bind(this);
    
  } // end constructor

  handleWindowClose(event) { 
    if (shifter) { shifter.disconnect(); shifter.off(); shifter = null; 
      gainNode.disconnect(); }
    audioCtx.close();
  }

  componentDidMount () { // after render()
    audioCtx = new window.AudioContext()
    gainNode = audioCtx.createGain()
    window.addEventListener('beforeClosing', this.handleWindowClose)
  }

  componentWillUnmount () { // before closing app
    window.removeEventListener('beforeClosing', this.handleWindowClose)
  }

  render() {
    const {loadFile, 
           handleSpeedSlider, handlePitchSlider, handleVolumeSlider, 
           handleTimeSlider, handlePlay, handleSaveB, 
           handleLoop, handleLang} = this;
    const {ja,playingAt, playingAtSlider, timeA, timeB,
           playSpeed, playPitch, playPitchSemi, playPitchCents,
           playVolume, startButtonStr, loopButtonStr, saveButtonStr} 
           = this.state

    let duration = 0;
    if (this.params.audioBuffer)
       duration = this.params.audioBuffer.duration

    let startBStyle; 
    if (startButtonStr === m.pause)
      startBStyle = {color: 'green'};
    else  
      startBStyle = {};

    let loopBStyle; 
    if (loopButtonStr === m.stopLoop)
      loopBStyle = {color: 'green'};
    else  
      loopBStyle = {};

    let saveBStyle; 
    if (saveButtonStr === m.abortExport)
      saveBStyle = {color: 'green'};
    else  
      saveBStyle = {};

    let hrBlue = {border: '1px dotted', color: 'blue'};

    return (
      <div className="App">
      {m.title} &nbsp;&nbsp;
      <span className='small-button'>
       <button name='language' onClick={handleLang}>
       {ja ? 'En(US)' : '日本語'}</button> 
      </span>
      <hr />
      1) {m.input}: <br />
        <span className="selectFile">
        <input type="file" name="loadFile"
        accept="audio/*,.wav,.mp3,.aac,.m4a,.opus" 
        onChange={loadFile} /><br />
        </span>
      <hr />

      {m.speed}: {playSpeed} &nbsp;&nbsp;
        <button name='reset' onClick={handleSpeedSlider} >{m.reset}</button>
        <br />
        <span className='slider'> 
         <center>
         025<input type='range' name='speedSlider' min='25' max='200'
         value = {playSpeed} onChange={handleSpeedSlider} />200 
         </center>
        </span>
      <hr />
      {m.pitch}: {parseFloat(playPitch).toFixed(2)} &nbsp;&nbsp;
       <button name='reset' onClick={handlePitchSlider} >{m.reset}</button>
       <br />
        <span className='slider'> 
         <center>
         -12<input type='range' name='pitchSliderSemi' min='-12' max='12'
         value = {playPitchSemi} onChange={handlePitchSlider} />12<br />
         <hr style={hrBlue}/>
         -100<input type='range' name='pitchSliderCents' min='-100' max='100'
         value = {playPitchCents} onChange={handlePitchSlider} />100<br />
         </center>

        </span>
      <hr />
        {m.time}: {playingAt.toFixed(2)} &nbsp; {m.timeNote}<br />
        <span className='slider'> 
        <center>
        0<input type='range' name='timeSlider'
        min='0' max={duration}
        value = {playingAtSlider} step='1'
        onChange={handleTimeSlider} />
        {Math.round(duration)}<br />
        </center>
        <button name='setA' onClick={handleLoop} >{m.setA}</button>
        : {timeA.toFixed(2)} &nbsp;&nbsp;
        <button name='setB' onClick={handleLoop} >{m.setB}</button>
        : {timeB.toFixed(2)} &nbsp;&nbsp;
        <button name='resetAB' onClick={handleLoop}> 
        {m.resetAB}
        </button>
        </span>
        <hr />
      {m.volume}: {playVolume} &nbsp;&nbsp; {m.volumeNote}<br />
        <span className='slider'> 
         <center>
         0<input type='range' name='volumeSlider' min='0' max='150'
         value = {playVolume} onChange={handleVolumeSlider} />150<br />
         </center>
        </span>
      <hr />

      <span>
        2A) <button name='startPause' 
               onClick={handlePlay} style={startBStyle}> 
        {startButtonStr}
        </button> &nbsp;&nbsp;
        <button name='Rewind' onClick={handleLoop}>
        {m.rewind}</button>
        <hr style={hrBlue}/>
        2B) <button name='LoopAB' 
              onClick={handleLoop} style={loopBStyle}>
        {loopButtonStr}</button> &nbsp;&nbsp;
        {m.interval} <span className='selector'>
        <select name='loopInterval'
           defaultValue={this.params.loopInterval} onChange={handleLoop}>
          <option value='0'>00</option>
          <option value='1'>01</option>
          <option value='2'>02</option>
          <option value='4'>04</option>
          <option value='5'>05</option>
          <option value='10'>10</option>
          <option value='20'>20</option>
          <option value='30'>30</option>
          <option value='60'>60</option>
        </select>
        </span>
        <hr />
        3) <button name='save' 
            onClick={handleSaveB} style={saveBStyle}> 
        {saveButtonStr}
        </button> 
      </span>
      <hr />
        {m.version}: {version}, &nbsp;
        <a href={m.homepage} 
         target="_blank" rel="noopener noreferrer">{m.guide}</a>
        <br />
        Based on <a href="https://github.com/cutterbl/SoundTouchJS"
         target="_blank" rel="noopener noreferrer">
        cutterbl/SoundTouchJS</a>
      </div>
    ) // end return

  } // end render()

///////////////////////////////////////////////////

  loadFile (event) {

   if (event.target.name !== 'loadFile') return;
   if (event.target.files.length === 0) return;
   if (this.params.isPlaying) return;

   this.setState({totalTime: 0})
   this.setState({startButtonStr: m.playOnce})
   let file = event.target.files[0]
   this.params.filename = file.name;

   let reader = new FileReader()

   if (audioCtx) audioCtx.close();
   audioCtx = new window.AudioContext()
   gainNode = audioCtx.createGain()

   reader.onload = function (e) {

     audioCtx.decodeAudioData(reader.result, 
        function(audioBuffer) {
          this.params.saudioBuffer = null
          this.params.audioBuffer = audioBuffer
          this.setState({startButtonStr: m.playOnce, 
             playingAt: 0, playingAtSlider: 0})
          this.setState({timeA: 0})
          this.setState({timeB: audioBuffer.duration})
        }.bind(this),
        function (error) { console.log ("Filereader error: " + error.err) })

   }.bind(this)

   reader.readAsArrayBuffer(file)

 } // end loadFile()

// UI handlers
  handleSpeedSlider(event) { 
     // console.log('handleSpeedSlider');

     if (event.target.name === 'speedSlider') {
       if (shifter) shifter.tempo = event.target.value/100.0
       this.setState({playSpeed: event.target.value})
       return;
     }

     if (event.target.name === 'reset') {
       if (shifter) shifter.tempo = 1;
       this.setState({playSpeed: 100})
       return;
     }

  }

  handlePitchSlider(event) { 

     let pitchSemi = 0;

     if (event.target.name === 'pitchSliderSemi' ){
       pitchSemi = parseFloat(event.target.value) 
           + parseFloat(this.state.playPitchCents)/100.0;
       this.setState({playPitchSemi: event.target.value})
     } else if (event.target.name === 'pitchSliderCents' ){
       pitchSemi = parseFloat(this.state.playPitchSemi)
           + parseFloat(event.target.value)/100.0
       this.setState({playPitchCents: event.target.value})
     } else if (event.target.name === 'reset') {
       this.setState({playPitchSemi: 0, playPitchCents: 0});
       pitchSemi = 0;
     }

     if (shifter) {shifter.pitch = Math.pow(2.0, pitchSemi/12.0);}
     this.setState({playPitch: pitchSemi});

     return;
  }

  handleTimeSlider(event) { 

     if (event.target.name !== 'timeSlider') return

     if (this.state.startButtonStr === m.playOnce) {
        let value = event.target.value;
        this.setState({playingAt: parseFloat(value)});
        this.setState({playingAtSlider: value});
     }
  }

  handleVolumeSlider(event) { 
     if (event.target.name !== 'volumeSlider') return

     let vol = event.target.value*1.0
     gainNode.gain.value = vol/100.0
     this.setState({playVolume: vol})
  }

  handlePlay(event) { 
     const {audioBuffer} = this.params;

// startPause or LoopAB
   if (event.target.name === 'startPause') { 
     if (audioCtx.state === 'suspended') audioCtx.resume()

     let timeA, timeB; 

// Pause
     if (this.state.startButtonStr === m.pause){
       if (!this.params.isPlaying) return;
       if (shifter === null) return

       shifter.disconnect(); shifter.off(); shifter = null;
       gainNode.disconnect();
       this.params.isPlaying = false;
       this.setState({playingAtSlider: this.state.playingAt});
       this.setState({startButtonStr: m.playOnce})

       return;
     } // end pause 

// PlayOnce

     if (event.target.name === 'startPause' 
       && this.state.startButtonStr === m.playOnce) {
       if (this.params.isPlaying) return;

       timeA = this.state.playingAt;
       timeB = audioBuffer.duration;

       this.playAB(timeA, timeB); // timeA, timeB
       return;
     }

   } // END  if (event.target.name)

    return;
  } // end handlePlay()

  fakeDownload(audioBuffer){

    const words = this.params.filename.split('.');
    let outFileName = 
         words[0]
       + '&s' + parseInt(this.state.playSpeed)
       + '&p' + parseInt(this.state.playPitch*100)
       + '.wav';
    let blob = new Blob([toWav(audioBuffer)], {type: 'audio/vnd.wav'});
    saveAs(blob,outFileName);
  }

  handleSaveB(event) { 
    // console.log ('handleSaveB');

    if (event.target.name !== 'save') return;

    if (this.state.startButtonStr !== m.playOnce
      || this.state.loopButtonStr !== m.loopAB) return;

    const {audioBuffer} = this.params;

    if (this.state.saveButtonStr === m.abortExport) {
      if(shifter) { shifter.disconnect(); shifter.off(); shifter = null;
        gainNode.disconnect(); }

      this.params.isPlaying = false;
      this.setState({saveButtonStr: m.exportWav});
      // console.log ('handleSaveB: AbortExport');

      return;
    }

// Save
    if (this.state.saveButtonStr === m.exportWav) {

      if (this.params.isPlaying) return;
      if (!audioBuffer) return;


// https://www.gmass.co/blog/record-audio-mobile-web-page-ios-android/
// https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode/onaudioprocess

      let saverNode = null;
      let channels = audioBuffer.numberOfChannels;

      if (shifter) {shifter.disconnect(); shifter.off(); shifter= null;}

      let bufferSize = 16384; // 1024?
      shifter = new PitchShifter(audioCtx, audioBuffer, bufferSize);
      shifter.tempo = this.state.playSpeed/100.0;
      shifter.pitch = Math.pow(2.0,this.state.playPitch/12.0);

      saverNode = audioCtx.createScriptProcessor(bufferSize, 
      channels,channels);
/*
      if (audioCtx.createScriptProcessor) {
        saverNode = audioCtx.createScriptProcessor(bufferSize, 
          channels,channels);
        console.log ('createScriptProcessor');
      } else if (audioCtx.createJavaScriptNode) {
        saverNode = audioCtx.createJavaScriptNode(bufferSize,channels,channels);
        console.log ('createJavaScriptNode');
      } else {
        console.log ('createScript is not supported');
        return;
      }
*/

/* Storage */
      this.params.exportBuffer = audioCtx.createBuffer( 
        channels,
        parseInt(audioBuffer.length*(100/this.state.playSpeed))
        + bufferSize, 
        audioBuffer.sampleRate);

      this.params.save = true;

/* Script Processor */
      let base = 0;
      if (AudioBuffer.prototype.copyToChannel) 
        console.log('copyToChannel OK');
      else 
        console.log('copyToChannel NG');

      saverNode.onaudioprocess = function(event){
        let inputBuffer = event.inputBuffer;
        let outputBuffer = event.outputBuffer;
        let exportBuffer = this.params.exportBuffer;

        for (let channel = 0; channel < inputBuffer.numberOfChannels; 
             channel++){
          let inputData  = inputBuffer.getChannelData(channel);
          let outputData = outputBuffer.getChannelData(channel);
          let exportData = exportBuffer.getChannelData(channel);

          if (AudioBuffer.prototype.copyToChannel){
            outputBuffer.copyToChannel(inputData, channel,0);
            exportBuffer.copyToChannel(inputData, channel, base);
          } else {
            for (let sample = 0; sample < inputBuffer.length; sample++) {
              let value = inputData[sample];
              outputData[sample] = value;
              exportData[base + sample] = value;
            }
          } // end if copyToChannel

        } // end for channel

        base += inputBuffer.length;

      }.bind(this); // end onaudioprocess

    // gainNode.gain.value = 0.2;
    // this.handleVolumeSlider({target: {name: 'volumeSlider', value: 20}});

      shifter.on('play', detail => {
        let currentPos = parseFloat(detail.timePlayed);
        this.setState({playingAt: currentPos, playingAtSlider: currentPos}); 

        if (detail.formattedTimePlayed >= shifter.formattedDuration) {
          saverNode.disconnect();
          shifter.off(); shifter.disconnect(); shifter = null;
          gainNode.disconnect();

          this.fakeDownload(this.params.exportBuffer);
          this.params.isPlaying = false;
          this.setState({saveButtonStr: m.exportWav});
          this.params.save = false;
          return;
        } // end 100%

      }); // end shifter.on()

      this.setState({saveButtonStr: m.abortExport});
      this.params.isPlaying = true;
      shifter.connect(saverNode);
      saverNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      if (audioCtx.state === 'suspended') audioCtx.resume()

      return;
    } // end if exportWav

  } // end handleSaveB

  handleLoop(event) {

    if (event.target.name === 'loopInterval') {
      this.params.loopInterval = parseInt(event.target.value,10);
      return;
    }


    if (event.target.name === 'Rewind') {
      if (this.params.isPlaying) return;

      this.setState ({playingAt: 0});
      this.setState ({playingAtSlider: 0});

      return;
    }

    if (event.target.name === 'setA') {
      this.setState ({timeA: this.state.playingAt});
      this.setState ({playingAtSlider: this.state.playingAt});
      return;
    }

    if (event.target.name === 'setB'){
      if (this.state.playingAt >=  this.state.timeA)
        this.setState ({timeB: parseFloat(this.state.playingAt)});
      else
        this.setState ({timeB: parseFloat(this.state.timeA) + parseFloat(10)});
      return;
    }

    if (event.target.name === 'LoopAB'){
      if (!this.params.audioBuffer) return;

      if (this.state.loopButtonStr === m.loopAB){ 
        if (this.params.isPlaying) return;
        this.params.loop = true;
        this.playAB(this.state.timeA, this.state.timeB);
        this.setState ({loopButtonStr: m.stopLoop});
        this.setState ({startButtonStr: m.playOnce});
      } else if (this.state.loopButtonStr === m.stopLoop){ 

        if (!this.params.isPlaying) return;

        if(shifter){ shifter.disconnect(); shifter.off(); shifter = null;
          gainNode.disconnect()}

        this.params.isPlaying = false;
        this.params.loop = false;
        this.setState ({loopButtonStr: m.loopAB});
      }

      return;
    }

// reset AB
    if (event.target.name === 'resetAB') {
      if (this.params.audioBuffer === null) return;
      this.setState ({timeA: 0,
                      timeB: this.params.audioBuffer.duration,
                      playingAtSlider: 0});

    return;
   } // end resetAB

  } // END handleLoop


  playAB(timeA, timeB) {

     if (this.params.isPlaying) return;
     if (this.params.audioBuffer === null) return;

     if (audioCtx.state === 'suspended') audioCtx.resume()

     if (timeB <= timeA){
       timeB = timeA + 5; // min 5 sec
       this.setState({timeB: timeB});
     }

     const {audioBuffer, loopInterval} = this.params;

     const from = timeA*audioBuffer.sampleRate;
     const to = timeB*audioBuffer.sampleRate;
     let offset = 0;
     if (this.params.loop) 
       offset = loopInterval*audioBuffer.sampleRate;

     let partialAudioBuffer = audioCtx.createBuffer(2,
          to - from + offset, audioBuffer.sampleRate);
     let left  = audioBuffer.getChannelData(0);
     let right = audioBuffer.getChannelData(1);

     left  = left.subarray(from, to);
     let tmp = partialAudioBuffer.getChannelData(0);

     for (let sample=0; sample < left.length; sample++) 
        tmp[sample + offset] = left[sample];

     if (audioBuffer.numberOfChannels >= 2) {
       tmp = partialAudioBuffer.getChannelData(1);
       right = right.subarray(from, to);

       for (let sample=0; sample < right.length; sample++) 
         tmp[sample + offset] = right[sample];
     }
     tmp = null; 

// create PitchShifter and Play
     let bufferSize = 16384;
     if (shifter) { shifter.disconnect(); shifter.off(); shifter= null;}
     shifter = new PitchShifter(audioCtx, partialAudioBuffer, bufferSize)
     partialAudioBuffer = null
     shifter.tempo = this.state.playSpeed/100.0
     shifter.pitch = Math.pow(2.0,this.state.playPitch/12.0)

     let duration = shifter.formattedDuration;

     shifter.on('play', detail => {

       let currentPos =  parseFloat(timeA) + parseFloat(detail.timePlayed);
       if (this.params.loop) currentPos -= loopInterval;

       this.setState({playingAt: currentPos, playingAtSlider: currentPos}); 

       if (detail.formattedTimePlayed >= duration) {
         shifter.off(); shifter.disconnect(); shifter = null;
         gainNode.disconnect();

         this.params.isPlaying = false;
         if (this.state.startButtonStr === m.pause)
           this.setState ({playingAt: 0, playingAtSlider: 0,
             startButtonStr: m.playOnce}); 

         if (this.params.loop)
           this.playAB(this.state.timeA, this.state.timeB);
         return;
       }

     }); // end shifter.on
 
    shifter.connect(gainNode);
    gainNode.connect(audioCtx.destination); // start play

    this.params.isPlaying = true; 
    if (!this.params.loop)
      this.setState({startButtonStr: m.pause});

    return;
  } // END playAB()

  handleLang(e){

    if (this.params.isPlaying) return; // cannot change during playback

    if (e.target.name === 'language'){
      let oldm = m;
      if (this.state.ja) { 
        m = usText; this.setState({ja: false}); 
      } else { 
        m = jaText; this.setState({ja: true}); }

      if (this.state.startButtonStr === oldm.loadFile)
        this.setState({startButtonStr: m.loadFile});
      else if (this.state.startButtonStr === oldm.playOnce)
        this.setState({startButtonStr: m.playOnce});
      else if (this.state.startButtonStr === oldm.pause)
        this.setState({startButtonStr: m.pause});

      if (this.state.loopButtonStr === oldm.loopAB)
        this.setState({loopButtonStr: m.loopAB});
      else if (this.state.loopButtonStr === oldm.stopLoop)
        this.setState({loopButtonStr: m.stopLoop});

      if (this.state.saveButtonStr === oldm.exportWav)
        this.setState({saveButtonStr: m.exportWav});
      else if (this.state.saveButtonStr === oldm.abortExport)
        this.setState({saveButtonStr: m.abortExport});

     return;
   } // end if

  }
 
} // end class

export default App;
