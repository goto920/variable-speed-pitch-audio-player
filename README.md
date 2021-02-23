# KG's variable pitch/speed player

Written in: JavaScript, Node.js, React, Web Audio API

Runs on Windows/macOS/Linux/Android/iOS

Based on [SoundTouchJS](https://github.com/cutterbl/SoundTouchJS)

## User guide/executable url:  [English](https://goto920.github.io/demos/variableplayer/)   [日本語](https://goto920.github.io/demos/variableplayer/index-jp.html)

## Feature

- Same program (just 700kB) works on various devices.
- No installation required. Runs offline.
- Slow down playback (25% to 200%) for drummer, guitarist, pianist, vocalist
- Fine pitch adjustment (semi-tone.cents) for vocalist, guitarist, pianist
- Local downloading of modified sound as a wav file

Note: Upon download on iOS 12 browser will open blob window with "unknown" and users should save the file as filename.wav. iOS 13 may not have the problem.
Sound quality is not very good for big change in speed or pitch. 

Download begins after playback because soundtouchJS does not work with OfflineAudioContext so far.

![ScreenShot](https://goto920.github.io/demos/variableplayer/player-eng.png)
