(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Looper = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    if (typeof module === 'object' && module.exports && typeof _dereq_ === 'function') {
        module.exports = definition();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        define(definition);
    } else {
        root.log = definition();
    }
}(this, function () {
    var self = {};
    var noop = function() {};
    var undefinedType = "undefined";

    function realMethod(methodName) {
        if (typeof console === undefinedType) {
            return false; // We can't build a real method without a console to log to
        } else if (console[methodName] !== undefined) {
            return bindMethod(console, methodName);
        } else if (console.log !== undefined) {
            return bindMethod(console, 'log');
        } else {
            return noop;
        }
    }

    function bindMethod(obj, methodName) {
        var method = obj[methodName];
        if (typeof method.bind === 'function') {
            return method.bind(obj);
        } else {
            try {
                return Function.prototype.bind.call(method, obj);
            } catch (e) {
                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
                return function() {
                    return Function.prototype.apply.apply(method, [obj, arguments]);
                };
            }
        }
    }

    function enableLoggingWhenConsoleArrives(methodName, level) {
        return function () {
            if (typeof console !== undefinedType) {
                replaceLoggingMethods(level);
                self[methodName].apply(self, arguments);
            }
        };
    }

    var logMethods = [
        "trace",
        "debug",
        "info",
        "warn",
        "error"
    ];

    function replaceLoggingMethods(level) {
        for (var i = 0; i < logMethods.length; i++) {
            var methodName = logMethods[i];
            self[methodName] = (i < level) ? noop : self.methodFactory(methodName, level);
        }
    }

    function persistLevelIfPossible(levelNum) {
        var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

        // Use localStorage if available
        try {
            window.localStorage['loglevel'] = levelName;
            return;
        } catch (ignore) {}

        // Use session cookie as fallback
        try {
            window.document.cookie = "loglevel=" + levelName + ";";
        } catch (ignore) {}
    }

    function loadPersistedLevel() {
        var storedLevel;

        try {
            storedLevel = window.localStorage['loglevel'];
        } catch (ignore) {}

        if (typeof storedLevel === undefinedType) {
            try {
                storedLevel = /loglevel=([^;]+)/.exec(window.document.cookie)[1];
            } catch (ignore) {}
        }

        if (self.levels[storedLevel] === undefined) {
            storedLevel = "WARN";
        }

        self.setLevel(self.levels[storedLevel], false);
    }

    /*
     *
     * Public API
     *
     */

    self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
        "ERROR": 4, "SILENT": 5};

    self.methodFactory = function (methodName, level) {
        return realMethod(methodName) ||
               enableLoggingWhenConsoleArrives(methodName, level);
    };

    self.setLevel = function (level, persist) {
        if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
            level = self.levels[level.toUpperCase()];
        }
        if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
            if (persist !== false) {  // defaults to true
                persistLevelIfPossible(level);
            }
            replaceLoggingMethods(level);
            if (typeof console === undefinedType && level < self.levels.SILENT) {
                return "No console available for logging";
            }
        } else {
            throw "log.setLevel() called with invalid level: " + level;
        }
    };

    self.enableAll = function(persist) {
        self.setLevel(self.levels.TRACE, persist);
    };

    self.disableAll = function(persist) {
        self.setLevel(self.levels.SILENT, persist);
    };

    // Grab the current global log variable in case of overwrite
    var _log = (typeof window !== undefinedType) ? window.log : undefined;
    self.noConflict = function() {
        if (typeof window !== undefinedType &&
               window.log === self) {
            window.log = _log;
        }

        return self;
    };

    loadPersistedLevel();
    return self;
}));

},{}],2:[function(_dereq_,module,exports){
/**
 *
 *
 * @module Core
 *
 */
"use strict";

/*
 *  MonkeyPatch for AudioContext. Normalizes AudioContext across browsers and implementations.
 *
 * @class AudioContextMonkeyPatch
 */
function AudioContextMonkeyPatch() {

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
}

module.exports = AudioContextMonkeyPatch;

},{}],3:[function(_dereq_,module,exports){
/**
 * @module Core
 */

'use strict';
_dereq_( '../core/AudioContextMonkeyPatch' )();
var webAudioDispatch = _dereq_( '../core/WebAudioDispatch' );
var log = _dereq_( 'loglevel' );

/**
 * Pseudo AudioNode class the encapsulates basic functionality of an Audio Node. To be extended by all other Sound Models
 *
 * @class BaseSound
 * @constructor
 * @requires AudioContextMonkeyPatch
 * @param {AudioContext} [context] AudioContext in which this Sound is defined.
 */
function BaseSound( context ) {
    /**
     * Web Audio API's AudioContext. If the context passed to the constructor is an AudioContext, a new one is created here.
     *
     * @property audioContext
     * @type AudioContext
     */
    if ( context === undefined || context === null ) {
        log.debug( 'Making a new AudioContext' );
        this.audioContext = new AudioContext();
    } else {
        this.audioContext = context;
    }

    bootAudioContext( this.audioContext );

    /**
     * Number of inputs
     *
     * @property numberOfInputs
     * @type Number
     * @default 0
     */
    this.numberOfInputs = 0;

    /**
     * Number of outputs
     *
     * @property numberOfOutputs
     * @type Number
     * @default 0
     */
    Object.defineProperty( this, 'numberOfOutputs', {
        enumerable: true,
        configurable: false,
        get: function () {
            return this.releaseGainNode.numberOfOutputs;
        }
    } );

    /**
     *Maximum number of sources that can be given to this Sound
     *
     * @property maxSources
     * @type Number
     * @default 0
     */
    var maxSources_ = 0;
    Object.defineProperty( this, 'maxSources', {
        enumerable: true,
        configurable: false,
        set: function ( max ) {
            if ( max < 0 ) {
                max = 0;
            }
            maxSources_ = Math.round( max );
        },
        get: function () {
            return maxSources_;
        }
    } );

    /**
     *Minimum number of sources that can be given to this Sound
     *
     * @property minSources
     * @type Number
     * @default 0
     */
    var minSources_ = 0;
    Object.defineProperty( this, 'minSources', {
        enumerable: true,
        configurable: false,
        set: function ( max ) {
            if ( max < 0 ) {
                max = 0;
            }
            minSources_ = Math.round( max );
        },
        get: function () {
            return minSources_;
        }
    } );

    /**
     * Release Gain Node
     *
     * @property releaseGainNode
     * @type GainNode
     * @default Internal GainNode
     * @final
     */
    this.releaseGainNode = this.audioContext.createGain();
    this.releaseGainNode.gain.prevEndTime = 0;

    /**
     *  If Sound is currently playing.
     *
     * @property isPlaying
     * @type Boolean
     * @default false
     */
    this.isPlaying = false;

    /**
     *  If Sound is currently initialized.
     *
     * @property isInitialized
     * @type Boolean
     * @default false
     */
    this.isInitialized = false;

    /**
     * The input node that the output node will be connected to. <br />
     * Set this value to null if no connection can be made on the input node
     *
     * @property inputNode
     * @type Object
     * @default null
     **/
    this.inputNode = null;

    /**
     * Set of nodes the output of this sound is currently connected to.
     *
     * @property destinations
     * @type Array
     * @default
     **/
    this.destinations = [];

    /**
     * String name of the model.
     *
     * @property modelName
     * @type String
     * @default "Model"
     **/
    this.modelName = 'Model';

    /**
     * Callback for handling progress events thrown during loading of audio files.
     *
     * @property onLoadProgress
     * @type Function
     * @default null
     */
    this.onLoadProgress = null;

    /**
     * Callback for when loading of audio files is done and the the model is initalized.
     *
     * @property onLoadComplete
     * @type Function
     * @default null
     */
    this.onLoadComplete = null;

    /**
     * Callback for when the audio is about to start playing.
     *
     * @property onAudioStart
     * @type Function
     * @default null
     */
    this.onAudioStart = null;

    /**
     * Callback for the audio is about to stop playing.
     *
     * @property onAudioEnd
     * @type Function
     * @default null
     */
    this.onAudioEnd = null;

    this.isBaseSound = true;

    this.dispatches_ = [];

    this.parameterList_ = [];

    this.connect( this.audioContext.destination );

    function bootAudioContext( context ) {

        var iOS = /(iPad|iPhone|iPod)/g.test( navigator.userAgent );

        function createDummyOsc() {
            log.debug( "Booting ", context );
            bootOsc.start( 0 );
            bootOsc.stop( context.currentTime + 0.0001 );
            window.liveAudioContexts.push( context );
            window.removeEventListener( 'touchstart', createDummyOsc );
        }

        if ( iOS ) {
            if ( !window.liveAudioContexts ) {
                window.liveAudioContexts = [];
            }
            if ( window.liveAudioContexts.indexOf( context ) < 0 ) {
                var bootOsc = context.createOscillator();
                var bootGain = context.createGain();
                bootGain.gain.value = 0;
                bootOsc.connect( bootGain );
                bootGain.connect( context.destination );
                window.addEventListener( 'touchstart', createDummyOsc );
            }
        }
    }
}

/**
 * If the parameter `output` is an AudioNode, it connects to the releaseGainNode.
 * If the output is a BaseSound, it will connect BaseSound's releaseGainNode to the output's inputNode.
 *
 * @method connect
 * @param {AudioNode} destination AudioNode to connect to.
 * @param {Number} [output] Index describing which output of the AudioNode from which to connect.
 * @param {Number} [input] Index describing which input of the destination AudioNode to connect to.
 */
BaseSound.prototype.connect = function ( destination, output, input ) {
    if ( destination instanceof AudioNode ) {
        this.releaseGainNode.connect( destination, output, input );
        this.destinations.push( {
            'destination': destination,
            'output': output,
            'input': input
        } );
    } else if ( destination.inputNode instanceof AudioNode ) {
        this.releaseGainNode.connect( destination.inputNode, output, input );
        this.destinations.push( {
            'destination': destination.inputNode,
            'output': output,
            'input': input
        } );
    } else {
        log.error( "No Input Connection - Attempts to connect " + ( typeof destination ) + " to " + ( typeof this ) );
    }
};

/**
 * Disconnects the Sound from the AudioNode Chain.
 *
 * @method disconnect
 * @param {Number} [outputIndex] Index describing which output of the AudioNode to disconnect.
 **/
BaseSound.prototype.disconnect = function ( outputIndex ) {
    this.releaseGainNode.disconnect( outputIndex );
    this.destinations = [];
};

/**
 * Start the AudioNode. Abstract method. Override this method when a Node is defined.
 *
 * @method start
 * @param {Number} when Time (in seconds) when the sound should start playing.
 * @param {Number} [offset] The starting position of the playhead
 * @param {Number} [duration] Duration of the portion (in seconds) to be played
 * @param {Number} [attackDuration] Duration (in seconds) of attack ramp of the envelope.
 */
BaseSound.prototype.start = function ( when, offset, duration, attackDuration ) {
    if ( typeof when === 'undefined' || when < this.audioContext.currentTime ) {
        when = this.audioContext.currentTime;
    }

    // Estimate the current value based on the previous ramp.
    var currentValue = 1;
    if ( this.releaseGainNode.gain.prevEndTime > when ) {
        currentValue = this.releaseGainNode.gain.prevStartValue + ( this.releaseGainNode.gain.prevTargetValue - this.releaseGainNode.gain.prevStartValue ) * ( ( when - this.releaseGainNode.gain.prevStartTime ) / ( this.releaseGainNode.gain.prevEndTime - this.releaseGainNode.gain.prevStartTime ) );
    }

    // Cancel all automation
    this.releaseGainNode.gain.cancelScheduledValues( when );
    if ( typeof attackDuration !== 'undefined' ) {
        log.debug( "Ramping from " + offset + "  in " + attackDuration );
        this.releaseGainNode.gain.setValueAtTime( currentValue, when );
        this.releaseGainNode.gain.linearRampToValueAtTime( 1, when + attackDuration );

        this.releaseGainNode.gain.prevStartTime = when;
        this.releaseGainNode.gain.prevStartValue = currentValue;
        this.releaseGainNode.gain.prevTargetValue = 1;
        this.releaseGainNode.gain.prevEndTime = when + attackDuration;

    } else {
        this.releaseGainNode.gain.setValueAtTime( 1, when );

        this.releaseGainNode.gain.prevStartTime = when;
        this.releaseGainNode.gain.prevStartValue = 1;
        this.releaseGainNode.gain.prevTargetValue = 1;
        this.releaseGainNode.gain.prevEndTime = when;
    }

    var self = this;
    this.dispatch( function () {
        self.isPlaying = true;
    }, when );
};

/**
 * Stop the AudioNode. Abstract method. Override this method when a Node is defined.
 *
 * @method stop
 * @param {Number} [when] Time (in seconds) the sound should stop playing
 */
BaseSound.prototype.stop = function ( when ) {
    if ( typeof when === 'undefined' || when < this.audioContext.currentTime ) {
        when = this.audioContext.currentTime;
    }

    var self = this;
    this.dispatch( function () {
        self.isPlaying = false;
        self.clearDispatches();
    }, when );
};

/**
 * Linearly ramp down the gain of the audio in time (seconds) to 0.
 *
 * @method release
 * @param {Number} [when] Time (in seconds) at which the Envelope will release.
 * @param {Number} [fadeTime] Amount of time (seconds) it takes for linear ramp down to happen.
 * @param {Boolean} [resetOnRelease] Boolean to define if release stops (resets) the playback or just pauses it.
 */
BaseSound.prototype.release = function ( when, fadeTime, resetOnRelease ) {

    if ( this.isPlaying ) {
        var FADE_TIME = 0.5;

        if ( typeof when === 'undefined' || when < this.audioContext.currentTime ) {
            when = this.audioContext.currentTime;
        }

        fadeTime = fadeTime || FADE_TIME;

        // Estimate the current value based on the previous ramp.
        var currentValue = 1;
        if ( this.releaseGainNode.gain.prevEndTime > when ) {
            currentValue = this.releaseGainNode.gain.prevStartValue + ( this.releaseGainNode.gain.prevTargetValue - this.releaseGainNode.gain.prevStartValue ) * ( ( when - this.releaseGainNode.gain.prevStartTime ) / ( this.releaseGainNode.gain.prevEndTime - this.releaseGainNode.gain.prevStartTime ) );
        }

        // Set that value as static value (stop automation);
        this.releaseGainNode.gain.cancelScheduledValues( when );
        this.releaseGainNode.gain.setValueAtTime( currentValue, when );
        this.releaseGainNode.gain.linearRampToValueAtTime( 0, when + fadeTime );

        this.releaseGainNode.gain.prevStartTime = when;
        this.releaseGainNode.gain.prevStartValue = currentValue;
        this.releaseGainNode.gain.prevTargetValue = 0;
        this.releaseGainNode.gain.prevEndTime = when + fadeTime;

        // Pause the sound after currentTime + fadeTime
        if ( !resetOnRelease ) {
            var self = this;
            this.dispatch( function () {
                self.pause();
            }, when + fadeTime );
        }
    }
};

/**
 * Reinitializes the model and sets it's sources.
 *
 * @method setSources
 * @param {Array/AudioBuffer/String/File} sources Single or Array of either URLs or AudioBuffers or File Objects of the audio sources.
 * @param {Function} [onLoadProgress] Callback when the audio file is being downloaded.
 * @param {Function} [onLoadComplete] Callback when all sources have finished loading.
 */
BaseSound.prototype.setSources = function ( sources, onLoadProgress, onLoadComplete ) {
    this.isInitialized = false;

    if ( typeof onLoadProgress === 'function' ) {
        this.onLoadProgress = onLoadProgress;
    }

    if ( typeof onLoadComplete === 'function' ) {
        this.onLoadComplete = onLoadComplete;
    }
};

/**
 * Play sound. Abstract method. Override this method when a Node is defined.
 *
 * @method play
 */
BaseSound.prototype.play = function () {
    this.start( 0 );
};

/**
 * Pause sound. Abstract method. Override this method when a Node is defined.
 *
 * @method pause
 */
BaseSound.prototype.pause = function () {
    this.isPlaying = false;
};

/**
 * Registers a Parameter to the model. This ensures that the Parameter is unwritable and allows
 * to lock in the configurability of the object.
 *
 * @param  {SPAudioParam} audioParam
 */
BaseSound.prototype.registerParameter = function ( audioParam, configurable ) {

    if ( configurable === undefined || configurable === null ) {
        configurable = false;
    }

    Object.defineProperty( this, audioParam.name, {
        enumerable: true,
        configurable: configurable,
        value: audioParam
    } );

    var self = this;
    var replaced = false;
    this.parameterList_.forEach( function ( thisParam, paramIndex ) {
        if ( thisParam.name === audioParam.name ) {
            self.parameterList_.splice( paramIndex, 1, audioParam );
            replaced = true;
        }
    } );

    if ( !replaced ) {
        this.parameterList_.push( audioParam );
    }
};

/**
 * List all SPAudioParams this Sound exposes
 *
 * @method listParams
 * @param {Array} [paramArray] Array of all the SPAudioParams this Sound exposes.
 */
BaseSound.prototype.listParams = function () {
    return this.parameterList_;
};

/**
 * Adds an sound effect to the output of this model, and connects the output of the effect to the Audio Destination
 *
 * @method setOutputEffect
 * @param {Object} effect An Sound Effect of type BaseEffect to be appended to the output of this Sound.
 */
BaseSound.prototype.setOutputEffect = function ( effect ) {
    this.disconnect();
    this.connect( effect );
    effect.connect( this.audioContext.destination );
};

BaseSound.prototype.dispatch = function ( functionCall, time ) {
    var dispatchID = webAudioDispatch( function () {
        if ( typeof dispatchID !== "undefined" ) {
            var idIndex = this.dispatches_.indexOf( dispatchID );
            if ( idIndex > -1 ) {
                this.dispatches_.splice( idIndex, 1 );
            } else {
                log.warn( "Can't find ID", dispatchID, "in the list of dispatches" );
            }
        }
        functionCall();
    }.bind( this ), time, this.audioContext );

    if ( dispatchID !== null ) {
        this.dispatches_.push( dispatchID );
    }
};

BaseSound.prototype.clearDispatches = function () {
    this.dispatches_.forEach( function ( thisId ) {
        log.debug( "Clearing timeout for", thisId );
        window.clearInterval( thisId );
    } );
    this.dispatches_ = [];
};

// Return constructor function
module.exports = BaseSound;

},{"../core/AudioContextMonkeyPatch":2,"../core/WebAudioDispatch":12,"loglevel":1}],4:[function(_dereq_,module,exports){
/**
 * A structure for static configuration options.
 *
 * @module Core
 * @class Config
 */
"use strict";

function Config() {}

/**
 * Define if Errors are logged using errorception.
 *
 * @final
 * @static
 * @property LOG_ERRORS
 * @default true
 *
 */
Config.LOG_ERRORS = true;

/**
 * Very small number considered non-zero by WebAudio.
 *
 * @final
 * @static
 * @property ZERO
 * @default 1e-37
 *
 */
Config.ZERO = parseFloat( '1e-37' );

/**
 * Maximum number of voices supported
 *
 * @final
 * @static
 * @property MAX_VOICES
 * @default 8
 *
 */
Config.MAX_VOICES = 8;

/**
 * Default nominal refresh rate (Hz) for SoundQueue.
 *
 * @final
 * @static
 * @property NOMINAL_REFRESH_RATE
 * @default 60
 *
 */
Config.NOMINAL_REFRESH_RATE = 60;

/**
 * Default window length for window and add functionality
 *
 * @final
 * @static
 * @property NOMINAL_REFRESH_RATE
 * @default 512
 *
 */
Config.WINDOW_LENGTH = 512;

/**
 * Default Chunk Length for ScriptNodes.
 *
 * @final
 * @static
 * @property CHUNK_LENGTH
 * @default 256
 *
 */
Config.CHUNK_LENGTH = 2048;

/**
 * Default smoothing constant.
 *
 * @final
 * @static
 * @property CHUNK_LENGTH
 * @default 0.05
 *
 */
Config.DEFAULT_SMOOTHING_CONSTANT = 0.05;

module.exports = Config;

},{}],5:[function(_dereq_,module,exports){
/**
 * @module Core
 */
"use strict";
var log = _dereq_( 'loglevel' );

/**
 * @class DetectLoopMarkers
 * @static
 */

/**
/**
 *Detector for Loop Marker or Silence. This method helps to detect and trim given AudioBuffer based on Sonoport Loop Markers or based on silence detection.
 *
 *
 * @class DetectLoopMarkers
 * @param {AudioBuffer} buffer A buffer to be trimmed to Loop Markers or Silence.
 * @return {Object} An object with `start` and `end` properties containing the index of the detected start and end points.
 */
function DetectLoopMarkers( buffer ) {

    var nLoopStart_ = 0;
    var nLoopEnd_ = 0;
    var nMarked_ = true;

    /*
     * Length of PRE and POSTFIX Silence used in Loop Marking
     */
    var PREPOSTFIX_LEN = 5000;

    /*
     * Length of PRE and POSTFIX Silence used in Loop Marking
     */
    var DEFAULT_SAMPLING_RATE = 44100;

    /*
     * Threshold for Spike Detection in Loop Marking
     */
    var SPIKE_THRESH = 0.5;

    /*
     * Index bounds for searching for Loop Markers and Silence.
     */
    var MAX_MP3_SILENCE = 20000;

    /*
     * Threshold for Silence Detection
     */
    var SILENCE_THRESH = 0.01;

    /*
     * Length for which the channel has to be empty
     */
    var EMPTY_CHECK_LENGTH = 1024;

    /*
     * Length samples to ignore after the spike
     */
    var IGNORE_LENGTH = 16;

    /*
     * Array of all Channel Data
     */
    var channels_ = [];

    /*
     * Number of samples in the buffer
     */
    var numSamples_ = 0;

    /**
     * A helper method to help find the silence in across multiple channels
     *
     * @private
     * @method silenceCheckGenerator_
     * @param {Number} testIndex The index of the sample which is being checked.
     * @return {Function} A function which can check if the specific sample is beyond the silence threshold
     */
    var isChannelEmptyAfter = function ( channel, position ) {
        log.debug( "Checking for loop marks at " + position );
        var sum = 0;
        for ( var sIndex = position + IGNORE_LENGTH; sIndex < position + IGNORE_LENGTH + EMPTY_CHECK_LENGTH; ++sIndex ) {
            sum += Math.abs( channel[ sIndex ] );
        }

        return ( sum / EMPTY_CHECK_LENGTH ) < SILENCE_THRESH;
    };

    /**
     * A helper method to help find the spikes in across multiple channels
     *
     * @private
     * @method silenceCheckGenerator_
     * @param {Number} testIndex The index of the sample which is being checked.
     * @return {Function} A function which can check if the specific sample is beyond the spike threshold
     */
    var thresholdCheckGenerator_ = function ( testIndex ) {
        return function ( prev, thisChannel, index ) {
            var isSpike;
            if ( index % 2 === 0 ) {
                isSpike = thisChannel[ testIndex ] > SPIKE_THRESH;
            } else {
                isSpike = thisChannel[ testIndex ] < -SPIKE_THRESH;
            }
            return prev && isSpike;
        };
    };

    /**
     * A helper method to help find the markers in an Array of Float32Arrays made from an AudioBuffer.
     *
     * @private
     * @method findSilence_
     * @param {Array} channels An array of buffer data in Float32Arrays within which markers needs to be detected.
     * @return {Boolean} If Loop Markers were found.
     */
    var findMarkers_ = function ( channels ) {
        var startSpikePos = null;
        var endSpikePos = null;

        nLoopStart_ = 0;
        nLoopEnd_ = numSamples_;

        // Find marker near start of file
        var pos = 0;

        while ( startSpikePos === null && pos < numSamples_ && pos < MAX_MP3_SILENCE ) {
            if ( channels.reduce( thresholdCheckGenerator_( pos ), true ) &&
                ( channels.length !== 1 || isChannelEmptyAfter( channels[ 0 ], pos ) ) ) {
                // Only check for emptiness at the start to ensure that it's indeed marked
                startSpikePos = pos;
                break;
            } else {
                pos++;
            }
        }

        // Find marker near end of file
        pos = numSamples_;

        while ( endSpikePos === null && pos > 0 && numSamples_ - pos < MAX_MP3_SILENCE ) {
            if ( channels.reduce( thresholdCheckGenerator_( pos ), true ) ) {
                endSpikePos = pos;
                break;
            } else {
                pos--;
            }
        }
        // If both markers found
        var correctedPostfixLen = Math.round( ( PREPOSTFIX_LEN / 2 ) * buffer.sampleRate / DEFAULT_SAMPLING_RATE );
        if ( startSpikePos !== null && endSpikePos !== null && endSpikePos > startSpikePos + correctedPostfixLen ) {
            // Compute loop start and length
            nLoopStart_ = startSpikePos + correctedPostfixLen;
            nLoopEnd_ = endSpikePos - correctedPostfixLen;
            log.debug( "Found loop between " + nLoopStart_ + " - " + nLoopEnd_ );
            log.debug( "Spikes at  " + startSpikePos + " - " + endSpikePos );
            return true;
        } else {
            // Spikes not found!
            log.debug( "No loop found" );
            return false;
        }
    };

    /**
     * A helper method to help find the silence in across multiple channels
     *
     * @private
     * @method silenceCheckGenerator_
     * @param {Number} testIndex The index of the sample which is being checked.
     * @return {Function} A function which can check if the specific sample is beyond the silence threshold
     */
    var silenceCheckGenerator_ = function ( testIndex ) {
        return function ( prev, thisChannel ) {
            return prev && ( Math.abs( thisChannel[ testIndex ] ) < SILENCE_THRESH );
        };
    };

    /**
     * A helper method to help find the silence in an AudioBuffer. Used of Loop Markers are not
     * found in the AudioBuffer. Updates nLoopStart_ and nLoopEnd_ directly.
     *
     * @private
     * @method findSilence_
     * @param {Array} channels channel An array of buffer data in Float32Arrays within which silence needs to be detected.
     */
    var findSilence_ = function ( channels ) {

        var allChannelsSilent = true;

        nLoopStart_ = 0;
        while ( nLoopStart_ < MAX_MP3_SILENCE && nLoopStart_ < numSamples_ ) {

            allChannelsSilent = channels.reduce( silenceCheckGenerator_( nLoopStart_ ), true );

            if ( allChannelsSilent ) {
                nLoopStart_++;
            } else {
                break;
            }
        }

        nLoopEnd_ = numSamples_;
        while ( numSamples_ - nLoopEnd_ < MAX_MP3_SILENCE &&
            nLoopEnd_ > 0 ) {

            allChannelsSilent = channels.reduce( silenceCheckGenerator_( nLoopEnd_ ), true );

            if ( allChannelsSilent ) {
                nLoopEnd_--;
            } else {
                break;
            }
        }

        if ( nLoopEnd_ < nLoopStart_ ) {
            nLoopStart_ = 0;
        }
    };

    numSamples_ = buffer.length;
    for ( var index = 0; index < buffer.numberOfChannels; index++ ) {
        channels_.push( new Float32Array( buffer.getChannelData( index ) ) );
    }

    if ( ( !findMarkers_( channels_ ) ) ) {
        findSilence_( channels_ );
        nMarked_ = false;
    }

    // return the markers which were found
    return {
        marked: nMarked_,
        start: nLoopStart_,
        end: nLoopEnd_
    };
}

module.exports = DetectLoopMarkers;

},{"loglevel":1}],6:[function(_dereq_,module,exports){
/**
 * @module Core
 */
"use strict";
var detectLoopMarkers = _dereq_( '../core/DetectLoopMarkers' );
var log = _dereq_( 'loglevel' );

/**
 * Load a single file from a URL or a File object.
 *
 * @class FileLoader
 * @constructor
 * @param {String/File} URL URL of the file to be Loaded
 * @param {String} context AudioContext to be used in decoding the file
 * @param {Function} [onloadCallback] Callback function to be called when the file loading is
 * @param {Function} [onProgressCallback] Callback function to access the progress of the file loading.
 */
function FileLoader( URL, context, onloadCallback, onProgressCallback ) {
    if ( !( this instanceof FileLoader ) ) {
        throw new TypeError( "FileLoader constructor cannot be called as a function." );
    }
    var rawBuffer_;
    var loopStart_ = 0;
    var loopEnd_ = 0;

    var isSoundLoaded_ = false;

    // Private functions

    /**
     * Check if a value is an integer.
     * @method isInt_
     * @private
     * @param {Object} value
     * @return {Boolean} Result of test.
     */
    var isInt_ = function ( value ) {
        var er = /^[0-9]+$/;
        if ( er.test( value ) ) {
            return true;
        }
        return false;
    };

    /**
     * Get a buffer based on the start and end markers.
     * @private
     * @method sliceBuffer
     * @param {Number} start The start of the buffer to load.
     * @param {Number} end The end of the buffer to load.
     * @return {AudioBuffer} The requested sliced buffer.
     */
    var sliceBuffer_ = function ( start, end ) {

        // Set end if it is missing
        if ( typeof end == 'undefined' ) {
            end = rawBuffer_.length;
        }
        // Verify parameters
        if ( !isInt_( start ) ) {
            start = Number.isNan( start ) ? 0 : Math.round( Number( start ) );
            log.debug( "Incorrect parameter Type - FileLoader getBuffer start parameter is not an integer. Coercing it to an Integer - start" );
        } else if ( !isInt_( end ) ) {
            log.debug( "Incorrect parameter Type - FileLoader getBuffer end parameter is not an integer" );
            end = Number.isNan( end ) ? 0 : Math.round( Number( end ) );
        }
        // Check if start is smaller than end
        if ( start > end ) {
            log.warn( "Incorrect parameter Type - FileLoader getBuffer start parameter " + start + " should be smaller than end parameter " + end + " . Setting them to the same value " + start );
            end = start;
        }
        // Check if start is within the buffer size
        if ( start > loopEnd_ || start < loopStart_ ) {
            log.warn( "Incorrect parameter Type - FileLoader getBuffer start parameter should be within the buffer size : 0-" + rawBuffer_.length + " . Setting start to " + loopStart_ );
            start = loopStart_;
        }

        // Check if end is within the buffer size
        if ( end > loopEnd_ || end < loopStart_ ) {
            log.warn( "Incorrect parameter Type - FileLoader getBuffer start parameter should be within the buffer size : 0-" + rawBuffer_.length + " . Setting start to " + loopEnd_ );
            end = loopEnd_;
        }

        var length = end - start;

        if ( !rawBuffer_ ) {
            log.error( "No Buffer Found - Buffer loading has not completed or has failed." );
            return null;
        }

        // Create the new buffer
        var newBuffer = context.createBuffer( rawBuffer_.numberOfChannels, length, rawBuffer_.sampleRate );

        // Start trimming
        for ( var i = 0; i < rawBuffer_.numberOfChannels; i++ ) {
            var aData = new Float32Array( rawBuffer_.getChannelData( i ) );
            newBuffer.getChannelData( i )
                .set( aData.subarray( start, end ) );
        }

        return newBuffer;
    };

    function init() {
        var parameterType = Object.prototype.toString.call( URL );
        var fileExtension = /[^.]+$/.exec( URL );
        if ( parameterType === '[object String]' ) {
            var request = new XMLHttpRequest();
            request.open( 'GET', URL, true );
            request.responseType = 'arraybuffer';
            request.addEventListener( 'progress', onProgressCallback, false );
            request.onload = function () {
                decodeAudio( request.response, fileExtension );
            };
            request.send();
        } else if ( parameterType === '[object File]' || parameterType === '[object Blob]' ) {
            var reader = new FileReader();
            reader.addEventListener( 'progress', onProgressCallback, false );
            reader.onload = function () {
                decodeAudio( reader.result, fileExtension );
            };
            reader.readAsArrayBuffer( URL );
        }

    }

    function decodeAudio( result, fileExt ) {
        context.decodeAudioData( result, function ( buffer ) {
            isSoundLoaded_ = true;
            rawBuffer_ = buffer;
            // Do trimming if it is not a wave file
            loopStart_ = 0;
            loopEnd_ = rawBuffer_.length;
            if ( fileExt[ 0 ] !== 'wav' ) {
                // Trim Buffer based on Markers
                var markers = detectLoopMarkers( rawBuffer_ );
                if ( markers ) {
                    loopStart_ = markers.start;
                    loopEnd_ = markers.end;
                }
            }
            if ( onloadCallback && typeof onloadCallback === 'function' ) {
                onloadCallback( true );
            }
        }, function () {
            log.error( "Error Decoding " + URL );
            if ( onloadCallback && typeof onloadCallback === 'function' ) {
                onloadCallback( false );
            }
        } );
    }

    // Public functions
    /**
     * Get the current buffer.
     * @method getBuffer
     * @param {Number} start The start index
     * @param {Number} end The end index
     * @return {AudioBuffer} The AudioBuffer that was marked then trimmed if it is not a wav file.
     */
    this.getBuffer = function ( start, end ) {
        // Set start if it is missing
        if ( typeof start == 'undefined' ) {
            start = 0;
        }
        // Set end if it is missing
        if ( typeof end == 'undefined' ) {
            end = loopEnd_ - loopStart_;
        }

        return sliceBuffer_( loopStart_ + start, loopStart_ + end );
    };

    /**
     * Get the original buffer.
     * @method getRawBuffer
     * @return {AudioBuffer} The original AudioBuffer.
     */
    this.getRawBuffer = function () {
        if ( !isSoundLoaded_ ) {
            log.error( "No Buffer Found - Buffer loading has not completed or has failed." );
            return null;
        }
        return rawBuffer_;
    };

    /**
     * Check if sound is already loaded.
     * @method isLoaded
     * @return {Boolean} True if file is loaded. Flase if file is not yeat loaded.
     */
    this.isLoaded = function () {
        return isSoundLoaded_;
    };

    // Make a request
    init();
}

module.exports = FileLoader;

},{"../core/DetectLoopMarkers":5,"loglevel":1}],7:[function(_dereq_,module,exports){
 /**
  * @module Core
  *
  * @class MuliFileLoader
  * @static
  */

 "use strict";

 var FileLoader = _dereq_( '../core/FileLoader' );
 var SPAudioBuffer = _dereq_( '../core/SPAudioBuffer' );
 var log = _dereq_( 'loglevel' );

 /**
  * Helper class to loader multiple sources from URL String, File or AudioBuffer or SPAudioBuffer Objects.
  *
  *
  * @method MuliFileLoader
  * @param {Array/String/File} sources Array of or Individual String, AudioBuffer or File Objects which define the sounds to be loaded
  * @param {String} audioContext AudioContext to be used in decoding the file
  * @param {String} [onLoadProgress] Callback function to access the progress of the file loading.
  * @param {String} [onLoadComplete] Callback function to be called when all sources are loaded
  */
 function MultiFileLoader( sources, audioContext, onLoadProgress, onLoadComplete ) {

     //Private variables
     var self = this;
     this.audioContext = audioContext;
     var sourcesToLoad_ = 0;
     var loadedAudioBuffers_ = [];

     //Private functions
     function init() {

         // If not defined, set empty sources.
         if ( !sources ) {
             log.debug( "Setting empty source. No sound may be heard" );
             onLoadComplete( false, loadedAudioBuffers_ );
             return;
         }

         // Convert to array.
         if ( !( sources instanceof Array ) ) {
             var sourceArray = [];
             sourceArray.push( sources );
             sources = sourceArray;
         }

         // If beyond size limits, log error and callback with false.
         if ( sources.length < self.minSources || sources.length > self.maxSources ) {
             log.error( "Unsupported number of Sources. " + self.modelName + " only supports a minimum of " + self.minSources + " and a maximum of " + self.maxSources + " sources. Trying to load " + sources.length + "." );
             onLoadComplete( false, loadedAudioBuffers_ );
             return;
         }

         // Load each of the sources
         sourcesToLoad_ = sources.length;
         loadedAudioBuffers_ = new Array( sourcesToLoad_ );
         sources.forEach( function ( thisSound, index ) {
             loadSingleSound( thisSound, onSingleLoadAt( index ) );
         } );
     }

     function loadSingleSound( source, onSingleLoad ) {
         var sourceType = Object.prototype.toString.call( source );
         var audioBuffer;
         if ( sourceType === '[object AudioBuffer]' ) {
             audioBuffer = new SPAudioBuffer( self.audioContext, source );
             onSingleLoad( true, audioBuffer );
         } else if ( source && source.isSPAudioBuffer && source.buffer ) {
             onSingleLoad( true, source );
         } else if ( sourceType === '[object String]' ||
             sourceType === '[object File]' ||
             ( source.isSPAudioBuffer && source.sourceURL ) ) {

             var sourceURL;
             if ( source.isSPAudioBuffer && source.sourceURL ) {
                 sourceURL = source.sourceURL;
                 audioBuffer = source;
             } else {
                 sourceURL = source;
                 audioBuffer = new SPAudioBuffer( self.audioContext, sourceURL );
             }

             var fileLoader = new FileLoader( sourceURL, self.audioContext, function ( status ) {
                 if ( status ) {
                     audioBuffer.buffer = fileLoader.getBuffer();
                     onSingleLoad( status, audioBuffer );
                 } else {
                     onSingleLoad( status );
                 }
             }, function ( progressEvent ) {
                 if ( onLoadProgress && typeof onLoadProgress === 'function' ) {
                     onLoadProgress( progressEvent, audioBuffer );
                 }
             } );
         } else {
             log.error( "Incorrect Parameter Type - Source is not a URL, File or AudioBuffer or doesn't have sourceURL or buffer" );
             onSingleLoad( false, {} );
         }
     }

     function onSingleLoadAt( index ) {
         return function ( status, loadedSound ) {
             if ( status ) {
                 log.debug( "Loaded track", index, "successfully" );
                 loadedAudioBuffers_[ index ] = loadedSound;
             }
             sourcesToLoad_--;
             if ( sourcesToLoad_ === 0 ) {
                 var allStatus = true;
                 for ( var bIndex = 0; bIndex < loadedAudioBuffers_.length; ++bIndex ) {
                     if ( !loadedAudioBuffers_[ bIndex ] ) {
                         allStatus = false;
                         break;
                     }
                 }
                 onLoadComplete( allStatus, loadedAudioBuffers_ );
             }
         };
     }
     init();
 }
 module.exports = MultiFileLoader;

},{"../core/FileLoader":6,"../core/SPAudioBuffer":8,"loglevel":1}],8:[function(_dereq_,module,exports){
/**
 * @module Core
 */

"use strict";
var log = _dereq_( 'loglevel' );

/**
 * Wrapper around AudioBuffer to support audio source caching and allowing clipping of audiobuffers to various lengths.
 *
 * @class SPAudioBuffer
 * @constructor
 * @param {AudioContext} audioContext WebAudio Context.
 * @param {String/AudioBuffer/File} URL The source URL or File object or an AudioBuffer to encapsulate.
 * @param {Number} startPoint The startPoint of the AudioBuffer in seconds.
 * @param {Number} endPoint The endPoint of the AudioBuffer in seconds.
 * @param [AudioBuffer] audioBuffer An AudioBuffer object incase the URL has already been downloaded and decoded.
 */
function SPAudioBuffer( audioContext, URL, startPoint, endPoint, audioBuffer ) {

    // new SPAudioBuffer("http://example.com", 0.8,1.0)
    // new SPAudioBuffer("http://example.com", 0.8,1.0, [object AudioBuffer])
    // new SPAudioBuffer([object File], 0.8,1.0)
    // new SPAudioBuffer([object AudioBuffer], 0.8,1.0)

    if ( !( audioContext instanceof AudioContext ) ) {
        log.error( 'First argument to SPAudioBuffer must be a valid AudioContext' );
        return;
    }

    // Private Variables
    var buffer_;
    var rawBuffer_;
    var startPoint_;
    var endPoint_;

    this.audioContext = audioContext;

    // Variables exposed by AudioBuffer

    this.duration = null;

    /**
     * The number of discrete audio channels.
     *
     * @property numberOfChannels
     * @type Number
     * @readOnly
     */
    Object.defineProperty( this, 'numberOfChannels', {
        get: function () {
            return this.buffer ? this.buffer.numberOfChannels : 0;
        }
    } );

    /**
     * The sample-rate for the PCM audio data in samples per second.
     *
     * @property sampleRate
     * @type Number
     * @readOnly
     */
    Object.defineProperty( this, 'sampleRate', {
        get: function () {
            return this.buffer ? this.buffer.sampleRate : 0;
        }
    } );

    /**
     * Returns the Float32Array representing the PCM audio data for the specific channel.
     *
     * @method getChannelData
     * @param {Number} channel This parameter is an index representing the particular channel to get data for. An index value of 0 represents the first channel.
     *
     */
    this.getChannelData = function ( channel ) {
        if ( !this.buffer ) {
            return null;
        } else {
            return this.buffer.getChannelData( channel );
        }
    };

    /*
     * For Duck-Type-Checking
     */
    this.isSPAudioBuffer = true;

    /**
     * The actual AudioBuffer that this SPAudioBuffer object is wrapping around. The getter of this property returns a clipped AudioBuffer based on the startPoint and endPoint properties.
     *
     * @property buffer
     * @type AudioBuffer
     * @default null
     */
    Object.defineProperty( this, 'buffer', {
        set: function ( buffer ) {

            if ( startPoint_ === null ) {
                this.startPoint = 0;
            } else if ( startPoint_ > buffer.length / buffer.sampleRate ) {
                log.error( "SPAudioBuffer : startPoint cannot be greater than buffer length" );
                return;
            }
            if ( endPoint_ === null ) {
                this.endPoint = this.rawBuffer_.length;
            } else if ( endPoint_ > buffer.length / buffer.sampleRate ) {
                log.error( "SPAudioBuffer : endPoint cannot be greater than buffer length" );
                return;
            }

            rawBuffer_ = buffer;
            this.updateBuffer();
        }.bind( this ),
        get: function () {
            return buffer_;
        }
    } );

    /**
     * URL or File object that is the source of the sound in the buffer. This property can be used for indexing and caching decoded sound buffers.
     *
     * @property sourceURL
     * @type String/File
     * @default null
     */
    this.sourceURL = null;

    /**
     * The starting point of the buffer in seconds. This, along with the {{#crossLink "SPAudioBuffer/endPoint:property"}}endPoint{{/crossLink}} property, decides which part of the original buffer is clipped and returned by the getter of the {{#crossLink "SPAudioBuffer/buffer:property"}}buffer{{/crossLink}} property.
     *
     * @property startPoint
     * @type Number
     * @default null
     * @minvalue 0
     */
    Object.defineProperty( this, 'startPoint', {
        set: function ( startPoint ) {
            if ( endPoint_ !== undefined && startPoint >= endPoint_ ) {
                log.error( "SPAudioBuffer : startPoint cannot be greater than endPoint" );
                return;
            }

            if ( rawBuffer_ && ( startPoint * rawBuffer_.sampleRate ) >= rawBuffer_.length ) {
                log.error( "SPAudioBuffer : startPoint cannot be greater than or equal to buffer length" );
                return;
            }

            startPoint_ = startPoint;
            this.updateBuffer();
        }.bind( this ),
        get: function () {
            return startPoint_;
        }
    } );

    /**
     * The ending point of the buffer in seconds. This, along with the {{#crossLink "SPAudioBuffer/startPoint:property"}}startPoint{{/crossLink}} property, decides which part of the original buffer is clipped and returned by the getter of the {{#crossLink "SPAudioBuffer/buffer:property"}}buffer{{/crossLink}} property.
     *
     * @property endPoint
     * @type Number
     * @default null
     * @minvalue 0
     */
    Object.defineProperty( this, 'endPoint', {
        set: function ( endPoint ) {
            if ( startPoint_ !== undefined && endPoint <= startPoint_ ) {
                log.error( "SPAudioBuffer : endPoint cannot be lesser than startPoint" );
                return;
            }

            if ( rawBuffer_ && ( endPoint * rawBuffer_.sampleRate ) >= rawBuffer_.length ) {
                log.error( "SPAudioBuffer : endPoint cannot be greater than buffer or equal to length" );
                return;
            }

            endPoint_ = endPoint;
            this.updateBuffer();
        }.bind( this ),
        get: function () {
            return endPoint_;
        }
    } );

    this.updateBuffer = function () {
        if ( !rawBuffer_ ) {
            this.duration = 0;
        } else {
            if ( startPoint_ === null || startPoint_ === undefined ) {
                startPoint_ = 0;
            }
            if ( endPoint_ === null || endPoint_ === undefined ) {
                endPoint_ = rawBuffer_.duration;
            }

            this.duration = endPoint_ - startPoint_;
            this.length = Math.ceil( rawBuffer_.sampleRate * this.duration ) + 1;

            if ( this.length > 0 ) {
                // Start trimming
                if ( !buffer_ ||
                    buffer_.length != this.length ||
                    buffer_.numberOfChannels != rawBuffer_.numberOfChannels ||
                    buffer_.sampleRate != rawBuffer_.sampleRate
                ) {
                    buffer_ = this.audioContext.createBuffer( rawBuffer_.numberOfChannels, this.length, rawBuffer_.sampleRate );
                }

                var startIndex = Math.floor( startPoint_ * rawBuffer_.sampleRate );
                var endIndex = Math.ceil( endPoint_ * rawBuffer_.sampleRate );

                for ( var i = 0; i < rawBuffer_.numberOfChannels; i++ ) {
                    var aData = new Float32Array( rawBuffer_.getChannelData( i ) );
                    buffer_.getChannelData( i )
                        .set( aData.subarray( startIndex, endIndex ) );
                }
            }
        }
    };

    var urlType = Object.prototype.toString.call( URL );
    var startPointType = Object.prototype.toString.call( startPoint );
    var endPointType = Object.prototype.toString.call( endPoint );
    var bufferType = Object.prototype.toString.call( audioBuffer );

    if ( urlType === "[object String]" || urlType === "[object File]" ) {
        this.sourceURL = URL;
    } else if ( urlType === "[object AudioBuffer]" ) {
        this.buffer = URL;
    } else {
        log.error( "Incorrect Parameter Type. url can only be a String, File or an AudioBuffer" );
    }

    if ( startPointType === "[object Number]" ) {
        this.startPoint = parseFloat( startPoint );
    } else {
        if ( startPointType !== "[object Undefined]" ) {
            log.warn( "Incorrect Parameter Type. startPoint should be a Number. Setting startPoint to 0" );
        }
    }

    if ( endPointType === "[object Number]" ) {
        this.endPoint = parseFloat( endPoint );
    } else {
        if ( startPointType !== "[object Undefined]" ) {
            log.warn( "Incorrect Parameter Type. endPoint should be a Number. Setting endPoint to end of dile" );
        }
    }

    if ( bufferType === "[object AudioBuffer]" && !this.buffer ) {
        this.buffer = audioBuffer;
    }
}
module.exports = SPAudioBuffer;

},{"loglevel":1}],9:[function(_dereq_,module,exports){
/**
 * @module Core
 */

"use strict";
var SPPlaybackRateParam = _dereq_( '../core/SPPlaybackRateParam' );
var webAudioDispatch = _dereq_( '../core/WebAudioDispatch' );
var log = _dereq_( 'loglevel' );

/**
 * A wrapper around the AudioBufferSourceNode to be able to track the current playPosition of a AudioBufferSourceNode.
 *
 * @class SPAudioBufferSourceNode
 * @constructor
 * @param {AudioContext} AudioContext to be used in timing the parameter automation events
 */
function SPAudioBufferSourceNode( audioContext ) {
    var bufferSourceNode_ = audioContext.createBufferSource();
    var counterNode_;

    var scopeNode_ = audioContext.createScriptProcessor( 256, 1, 1 );
    var trackGainNode_ = audioContext.createGain();
    var lastPos = 0;

    this.audioContext = audioContext;
    this.playbackState = 0;

    this.channelCount = null;
    this.channelCountMode = null;
    this.channelInterpretation = null;
    this.numberOfInputs = null;
    this.numberOfOutputs = null;

    /**
     * Playback States Constant.
     *
     * @property UNSCHEDULED_STATE
     * @type Number
     * @default "Model"
     **/
    this.UNSCHEDULED_STATE = 0;

    /**
     * Playback States Constant.
     *
     * @property SCHEDULED_STATE
     * @type Number
     * @default "1"
     **/
    this.SCHEDULED_STATE = 1;

    /**
     * Playback States Constant.
     *
     * @property PLAYING_STATE
     * @type Number
     * @default "2"
     **/
    this.PLAYING_STATE = 2;

    /**
     * Playback States Constant.
     *
     * @property FINISHED_STATE
     * @type Number
     * @default "3"
     **/
    this.FINISHED_STATE = 3;

    /**
     * The speed at which to render the audio stream. Its default value is 1. This parameter is a-rate.
     *
     * @property playbackRate
     * @type AudioParam
     * @default 1
     *
     */
    this.playbackRate = null;

    /**
     * An optional value in seconds where looping should end if the loop attribute is true.
     *
     * @property loopEnd
     * @type Number
     * @default 0
     *
     */
    Object.defineProperty( this, 'loopEnd', {
        enumerable: true,
        configurable: false,
        set: function ( loopEnd ) {
            bufferSourceNode_.loopEnd = loopEnd;
            counterNode_.loopEnd = loopEnd;
        },
        get: function () {
            return bufferSourceNode_.loopEnd;
        }
    } );

    /**
     * An optional value in seconds where looping should begin if the loop attribute is true.
     *
     * @property loopStart
     * @type Number
     * @default 0
     *
     */
    Object.defineProperty( this, 'loopStart', {
        enumerable: true,
        configurable: false,
        set: function ( loopStart ) {
            bufferSourceNode_.loopStart = loopStart;
            counterNode_.loopStart = loopStart;
        },
        get: function () {
            return bufferSourceNode_.loopStart;
        }
    } );

    /**
     * A property used to set the EventHandler for the ended event that is dispatched to AudioBufferSourceNode node types
     *
     * @property onended
     * @type Function
     * @default null
     *
     */
    Object.defineProperty( this, 'onended', {
        enumerable: true,
        configurable: false,
        set: function ( onended ) {
            bufferSourceNode_.onended = wrapAroundOnEnded( this, onended );
        },
        get: function () {
            return bufferSourceNode_.onended;
        }
    } );

    /**
     * Indicates if the audio data should play in a loop.
     *
     * @property loop
     * @type Boolean
     * @default false
     *
     */
    Object.defineProperty( this, 'loop', {
        enumerable: true,
        configurable: false,
        set: function ( loop ) {
            bufferSourceNode_.loop = loop;
            counterNode_.loop = loop;
        },
        get: function () {
            return bufferSourceNode_.loop;
        }
    } );

    /**
     * Position (in seconds) of the last frame played back by the AudioContext
     *
     * @property playbackPosition
     * @type Number
     * @default 0
     *
     */
    Object.defineProperty( this, 'playbackPosition', {
        enumerable: true,
        configurable: false,
        get: function () {
            return lastPos;
        }
    } );

    /**
     * Represents the audio asset to be played.
     *
     * @property buffer
     * @type AudioBuffer
     * @default null
     *
     */
    Object.defineProperty( this, 'buffer', {
        enumerable: true,
        configurable: false,
        set: function ( buffer ) {
            if ( bufferSourceNode_ ) {
                bufferSourceNode_.disconnect();
            }

            if ( counterNode_ ) {
                counterNode_.disconnect();
            }

            bufferSourceNode_ = audioContext.createBufferSource();
            counterNode_ = audioContext.createBufferSource();
            if ( buffer.isSPAudioBuffer ) {
                bufferSourceNode_.buffer = buffer.buffer;
                counterNode_.buffer = createCounterBuffer( buffer.buffer );
            } else if ( buffer instanceof AudioBuffer ) {
                bufferSourceNode_.buffer = buffer;
                counterNode_.buffer = createCounterBuffer( buffer );
            }

            counterNode_.connect( scopeNode_ );
            bufferSourceNode_.connect( trackGainNode_ );

            this.channelCount = bufferSourceNode_.channelCount;
            this.channelCountMode = bufferSourceNode_.channelCountMode;
            this.channelInterpretation = bufferSourceNode_.channelInterpretation;
            this.numberOfInputs = bufferSourceNode_.numberOfInputs;
            this.numberOfOutputs = bufferSourceNode_.numberOfOutputs;

            this.playbackRate = new SPPlaybackRateParam( this, bufferSourceNode_.playbackRate, counterNode_.playbackRate );

        },
        get: function () {
            return bufferSourceNode_.buffer;
        }
    } );

    /**
     * Track gain for this specific buffer.
     *
     * @property buffer
     * @type AudioBuffer
     * @default null
     *
     */
    Object.defineProperty( this, 'gain', {
        enumerable: true,
        configurable: false,
        get: function () {
            return trackGainNode_.gain;
        }
    } );

    /**
     * Connects the AudioNode to the input of another AudioNode.
     *
     * @method connect
     * @param {AudioNode} destination AudioNode to connect to.
     * @param {Number} [output] Index describing which output of the AudioNode from which to connect.
     * @param {Number} [input] Index describing which input of the destination AudioNode to connect to.
     *
     */
    this.connect = function ( destination, output, input ) {
        trackGainNode_.connect( destination, output, input );
    };

    /**
     * Disconnects the AudioNode from the input of another AudioNode.
     *
     * @method disconnect
     * @param {Number} [output] Index describing which output of the AudioNode to disconnect.
     *
     */
    this.disconnect = function ( output ) {
        trackGainNode_.disconnect( output );
    };

    /**
     * Schedules a sound to playback at an exact time.
     *
     * @method start
     * @param {Number} when Time (in seconds) when the sound should start playing.
     * @param {Number} [offset] Offset time in the buffer (in seconds) where playback will begin
     * @param {Number} [duration] Duration of the portion (in seconds) to be played
     *
     */
    this.start = function ( when, offset, duration ) {
        if ( typeof duration == 'undefined' ) {
            duration = bufferSourceNode_.buffer.duration;
        }

        if ( typeof offset == 'undefined' ) {
            offset = 0;
        }

        if ( this.playbackState === this.UNSCHEDULED_STATE ) {
            if ( offset === 0 && duration === bufferSourceNode_.buffer.duration ) {
                bufferSourceNode_.start( when );
                counterNode_.start( when );
            } else {
                bufferSourceNode_.start( when, offset, duration );
                counterNode_.start( when, offset, duration );
            }

            this.playbackState = this.SCHEDULED_STATE;
        }

        var self = this;
        webAudioDispatch( function () {
            self.playbackState = self.PLAYING_STATE;
        }, when, this.audioContext );
    };

    /**
     * Schedules a sound to stop playback at an exact time.
     *
     * @method stop
     * @param {Number} when Time (in seconds) when the sound should stop playing.
     *
     */
    this.stop = function ( when ) {
        if ( this.playbackState === this.PLAYING_STATE || this.playbackState === this.SCHEDULED_STATE ) {
            bufferSourceNode_.stop( when );
            counterNode_.stop( when );
        }
    };

    /**
     * Resets the SP Buffer Source with a fresh BufferSource.
     *
     * @method resetBufferSource
     * @param {Number} when Time (in seconds) when the Buffer source should be reset.
     * @param {AudioNode} output The output to which the BufferSource is to be connected.
     *
     */
    this.resetBufferSource = function ( when, output ) {

        var self = this;
        webAudioDispatch( function () {
            log.debug( 'Resetting BufferSource', self.buffer.length );
            // Disconnect source(s) from output.

            // Disconnect scope node from trackGain
            scopeNode_.disconnect();

            var newTrackGain = self.audioContext.createGain();
            newTrackGain.gain.value = trackGainNode_.gain.value;
            trackGainNode_ = newTrackGain;

            // Create new sources and copy all the parameters over.
            var newSource = self.audioContext.createBufferSource();
            newSource.buffer = bufferSourceNode_.buffer;
            newSource.loopStart = bufferSourceNode_.loopStart;
            newSource.loopEnd = bufferSourceNode_.loopEnd;
            newSource.onended = wrapAroundOnEnded( self, bufferSourceNode_.onended );

            // Remove onended callback from old buffer
            bufferSourceNode_.onended = null;

            // Throw away the counter node;
            counterNode_.disconnect();

            var newCounterNode = audioContext.createBufferSource();
            newCounterNode.buffer = counterNode_.buffer;

            // Assign the new local variables to new sources
            bufferSourceNode_ = newSource;
            counterNode_ = newCounterNode;

            // Create new parameters for rate parameter
            var playBackRateVal = self.playbackRate.value;
            self.playbackRate = new SPPlaybackRateParam( self, bufferSourceNode_.playbackRate, counterNode_.playbackRate );
            self.playbackRate.setValueAtTime( playBackRateVal, 0 );

            // Reconnect to output.
            counterNode_.connect( scopeNode_ );
            bufferSourceNode_.connect( trackGainNode_ );
            scopeNode_.connect( trackGainNode_ );
            self.connect( output );
            self.playbackState = self.UNSCHEDULED_STATE;
        }, when, this.audioContext );
    };

    // Private Methods

    function createCounterBuffer( buffer ) {
        var array = new Float32Array( buffer.length );
        var audioBuf = audioContext.createBuffer( 1, buffer.length, 44100 );

        for ( var index = 0; index < buffer.length; index++ ) {
            array[ index ] = index;
        }

        audioBuf.getChannelData( 0 ).set( array );
        return audioBuf;
    }

    function init() {
        scopeNode_.connect( trackGainNode_ );
        scopeNode_.onaudioprocess = savePosition;
    }

    function savePosition( processEvent ) {
        var inputBuffer = processEvent.inputBuffer.getChannelData( 0 );
        lastPos = inputBuffer[ inputBuffer.length - 1 ] || 0;
    }

    function wrapAroundOnEnded( node, onended ) {
        return function ( event ) {
            node.playbackState = node.FINISHED_STATE;
            if ( typeof onended === 'function' ) {
                onended( event );
            }
        };
    }

    init();

}
module.exports = SPAudioBufferSourceNode;

},{"../core/SPPlaybackRateParam":11,"../core/WebAudioDispatch":12,"loglevel":1}],10:[function(_dereq_,module,exports){
/*
 ** @module Core
 */

"use strict";
var webAudioDispatch = _dereq_( '../core/WebAudioDispatch' );
var Config = _dereq_( '../core/Config' );
var log = _dereq_( 'loglevel' );

/**
 * Mock AudioParam used to create Parameters for Sonoport Sound Models. The SPAudioParam supports either a AudioParam backed parameter, or a completely Javascript mocked up Parameter, which supports a rough version of parameter automation.
 *
 *
 * @class SPAudioParam
 * @constructor
 * @param {BaseSound} baseSound A reference to the BaseSound which exposes this parameter.
 * @param {String} [name] The name of the parameter.
 * @param {Number} [minValue] The minimum value of the parameter.
 * @param {Number} [maxValue] The maximum value of the parameter.
 * @param {Number} [defaultValue] The default and starting value of the parameter.
 * @param {AudioParam/Array} [aParams] A WebAudio parameter which will be set/get when this parameter is changed.
 * @param {Function} [mappingFunction] A mapping function to map values between the mapped SPAudioParam and the underlying WebAudio AudioParam.
 * @param {Function} [setter] A setter function which can be used to set the underlying audioParam. If this function is undefined, then the parameter is set directly.
 */
function SPAudioParam( baseSound, name, minValue, maxValue, defaultValue, aParams, mappingFunction, setter ) {
    // Min diff between set and actual
    // values to stop updates.
    var MIN_DIFF = 0.0001;
    var UPDATE_INTERVAL_MS = 500;
    var intervalID_;

    var value_ = 0;
    var calledFromAutomation_ = false;

    /**
     * Initial value for the value attribute.
     *
     * @property defaultValue
     * @type Number/Boolean
     * @default 0
     */
    this.defaultValue = null;

    /**
     *  Maximum value which the value attribute can be set to.
     *
     *
     * @property maxValue
     * @type Number/Boolean
     * @default 0
     */
    this.maxValue = 0;

    /**
     * Minimum value which the value attribute can be set to.
     *
     * @property minValue
     * @type Number/Boolean
     * @default 0
     */

    this.minValue = 0;

    /**
     * Name of the Parameter.
     *
     * @property name
     * @type String
     * @default ""
     */

    this.name = "";

    this.isSPAudioParam = true;

    /**
     * The parameter's value. This attribute is initialized to the defaultValue. If value is set during a time when there are any automation events scheduled then it will be ignored and no exception will be thrown.
     *
     *
     * @property value
     * @type Number/Boolean
     * @default 0
     */
    Object.defineProperty( this, 'value', {
        enumerable: true,
        configurable: false,
        set: function ( value ) {
            log.debug( "Setting param", name, "value to", value );
            // Sanitize the value with min/max
            // bounds first.
            if ( typeof value !== typeof defaultValue ) {
                log.error( "Attempt to set a", ( typeof defaultValue ), "parameter to a", ( typeof value ), "value" );
                return;
            }
            // Sanitize the value with min/max
            // bounds first.
            if ( typeof value === "number" ) {
                if ( value > maxValue ) {
                    log.debug( this.name, 'clamping to max' );
                    value = maxValue;
                } else if ( value < minValue ) {
                    log.debug( this.name + ' clamping to min' );
                    value = minValue;
                }
            }

            // Store the incoming value for getter
            value_ = value;

            // Map the value
            if ( typeof mappingFunction === 'function' ) {
                // Map if mappingFunction is defined
                value = mappingFunction( value );
            }

            if ( !calledFromAutomation_ ) {
                log.debug( "Clearing Automation for", name );
                window.clearInterval( intervalID_ );
            }
            calledFromAutomation_ = false;

            // Dispatch the value
            if ( typeof setter === 'function' && baseSound.audioContext ) {
                setter( aParams, value, baseSound.audioContext );
            } else if ( aParams ) {
                // else if param is defined, set directly
                if ( aParams instanceof AudioParam ) {
                    var array = [];
                    array.push( aParams );
                    aParams = array;
                }
                aParams.forEach( function ( thisParam ) {
                    if ( baseSound.isPlaying ) {
                        //dezipper if already playing
                        thisParam.setTargetAtTime( value, baseSound.audioContext.currentTime, Config.DEFAULT_SMOOTHING_CONSTANT );
                    } else {
                        //set directly if not playing
                        log.debug( "Setting param", name, 'through setter' );
                        thisParam.setValueAtTime( value, baseSound.audioContext.currentTime );
                    }
                } );
            }
        },
        get: function () {
            return value_;
        }
    } );
    if ( aParams && ( aParams instanceof AudioParam || aParams instanceof Array ) ) {
        // Use a nominal Parameter to populate the values.
        var aParam = aParams[ 0 ] || aParams;
    }

    if ( name ) {
        this.name = name;
    } else if ( aParam ) {
        this.name = aParam.name;
    }

    if ( typeof defaultValue !== 'undefined' ) {
        this.defaultValue = defaultValue;
        this.value = defaultValue;
    } else if ( aParam ) {
        this.defaultValue = aParam.defaultValue;
        this.value = aParam.defaultValue;
    }

    if ( typeof minValue !== 'undefined' ) {
        this.minValue = minValue;
    } else if ( aParam ) {
        this.minValue = aParam.minValue;
    }

    if ( typeof maxValue !== 'undefined' ) {
        this.maxValue = maxValue;
    } else if ( aParam ) {
        this.maxValue = aParam.maxValue;
    }

    /**
     * Schedules a parameter value change at the given time.
     *
     * @method setValueAtTime
     * @param {Number} value The value parameter is the value the parameter will change to at the given time.
     * @param {Number} startTime The startTime parameter is the time in the same time coordinate system as AudioContext.currentTime.
     */
    this.setValueAtTime = function ( value, startTime ) {
        if ( aParams ) {
            if ( typeof mappingFunction === 'function' ) {
                value = mappingFunction( value );
            }
            if ( aParams instanceof AudioParam ) {
                aParams.setValueAtTime( value, startTime );
            } else if ( aParams instanceof Array ) {
                aParams.forEach( function ( thisParam ) {
                    thisParam.setValueAtTime( value, startTime );
                } );
            }
        } else {
            // Horrible hack for the case we don't have access to
            // a real AudioParam.
            var self = this;
            webAudioDispatch( function () {
                self.value = value;
            }, startTime, baseSound.audioContext );
        }
    };

    /**
     * Start exponentially approaching the target value at the given time with a rate having the given time constant.
     *
     * During the time interval: T0 <= t < T1, where T0 is the startTime parameter and T1 represents the time of the event following this event (or infinity if there are no following events):
     *     v(t) = V1 + (V0 - V1) * exp(-(t - T0) / timeConstant)
     *
     * @method setTargetAtTime
     * @param {Number} target The target parameter is the value the parameter will start changing to at the given time.
     * @param {Number} startTime The startTime parameter is the time in the same time coordinate system as AudioContext.currentTime.
     * @param {Number} timeConstant The timeConstant parameter is the time-constant value of first-order filter (exponential) approach to the target value. The larger this value is, the slower the transition will be.
     */
    this.setTargetAtTime = function ( target, startTime, timeConstant ) {
        if ( aParams ) {
            if ( typeof mappingFunction === 'function' ) {
                target = mappingFunction( target );
            }
            if ( aParams instanceof AudioParam ) {
                aParams.setTargetAtTime( target, startTime, timeConstant );
            } else if ( aParams instanceof Array ) {
                aParams.forEach( function ( thisParam ) {
                    thisParam.setTargetAtTime( target, startTime, timeConstant );
                } );
            }
        } else {
            // Horrible hack for the case we don't have access to
            // a real AudioParam.
            var self = this;
            var initValue_ = self.value;
            var initTime_ = baseSound.audioContext.currentTime;
            log.debug( "starting automation" );
            intervalID_ = window.setInterval( function () {
                if ( baseSound.audioContext.currentTime >= startTime ) {
                    calledFromAutomation_ = true;
                    self.value = target + ( initValue_ - target ) * Math.exp( -( baseSound.audioContext.currentTime - initTime_ ) / timeConstant );
                    if ( Math.abs( self.value - target ) < MIN_DIFF ) {
                        window.clearInterval( intervalID_ );
                    }
                }
            }, UPDATE_INTERVAL_MS );
        }
    };
    /**
     * Sets an array of arbitrary parameter values starting at the given time for the given duration. The number of values will be scaled to fit into the desired duration.

     * During the time interval: startTime <= t < startTime + duration, values will be calculated:
     *
     *   v(t) = values[N * (t - startTime) / duration], where N is the length of the values array.
     *
     * @method setValueCurveAtTime
     * @param {Float32Array} values The values parameter is a Float32Array representing a parameter value curve. These values will apply starting at the given time and lasting for the given duration.
     * @param {Number} startTime The startTime parameter is the time in the same time coordinate system as AudioContext.currentTime.
     * @param {Number} duration The duration parameter is the amount of time in seconds (after the startTime parameter) where values will be calculated according to the values parameter.
     */
    this.setValueCurveAtTime = function ( values, startTime, duration ) {
        if ( aParams ) {
            if ( typeof mappingFunction === 'function' ) {
                for ( var index = 0; index < values.length; index++ ) {
                    values[ index ] = mappingFunction( values[ index ] );
                }
            }
            if ( aParams instanceof AudioParam ) {
                aParams.setValueCurveAtTime( values, startTime, duration );
            } else if ( aParams instanceof Array ) {
                aParams.forEach( function ( thisParam ) {
                    thisParam.setValueCurveAtTime( values, startTime, duration );
                } );
            }
        } else {
            var self = this;
            var initTime_ = baseSound.audioContext.currentTime;
            intervalID_ = window.setInterval( function () {
                if ( baseSound.audioContext.currentTime >= startTime ) {
                    var index = Math.floor( values.length * ( baseSound.audioContext.currentTime - initTime_ ) / duration );
                    if ( index < values.length ) {
                        calledFromAutomation_ = true;
                        self.value = values[ index ];
                    } else {
                        window.clearInterval( intervalID_ );
                    }
                }
            }, UPDATE_INTERVAL_MS );
        }
    };

    /**
     * Schedules an exponential continuous change in parameter value from the previous scheduled parameter value to the given value.
     *
     * v(t) = V0 * (V1 / V0) ^ ((t - T0) / (T1 - T0))
     *
     * @method exponentialRampToValueAtTime
     * @param {Number} value The value parameter is the value the parameter will exponentially ramp to at the given time.
     * @param {Number} endTime The endTime parameter is the time in the same time coordinate system as AudioContext.currentTime.
     */
    this.exponentialRampToValueAtTime = function ( value, endTime ) {
        if ( aParams ) {
            if ( typeof mappingFunction === 'function' ) {
                value = mappingFunction( value );
            }
            if ( aParams instanceof AudioParam ) {
                aParams.exponentialRampToValueAtTime( value, endTime );
            } else if ( aParams instanceof Array ) {
                aParams.forEach( function ( thisParam ) {
                    thisParam.exponentialRampToValueAtTime( value, endTime );
                } );
            }
        } else {
            var self = this;
            var initValue_ = self.value;
            var initTime_ = baseSound.audioContext.currentTime;
            if ( initValue_ === 0 ) {
                initValue_ = 0.001;
            }
            intervalID_ = window.setInterval( function () {
                var timeRatio = ( baseSound.audioContext.currentTime - initTime_ ) / ( endTime - initTime_ );
                calledFromAutomation_ = true;
                self.value = initValue_ * Math.pow( value / initValue_, timeRatio );
                if ( baseSound.audioContext.currentTime >= endTime ) {
                    window.clearInterval( intervalID_ );
                }
            }, UPDATE_INTERVAL_MS );
        }
    };

    /**
     *Schedules a linear continuous change in parameter value from the previous scheduled parameter value to the given value.
     *
     * @method linearRampToValueAtTime
     * @param {Float32Array} value The value parameter is the value the parameter will exponentially ramp to at the given time.
     * @param {Number} endTime The endTime parameter is the time in the same time coordinate system as AudioContext.currentTime.
     */
    this.linearRampToValueAtTime = function ( value, endTime ) {
        if ( aParams ) {
            if ( typeof mappingFunction === 'function' ) {
                value = mappingFunction( value );
            }
            if ( aParams instanceof AudioParam ) {
                aParams.linearRampToValueAtTime( value, endTime );
            } else if ( aParams instanceof Array ) {
                aParams.forEach( function ( thisParam ) {
                    thisParam.linearRampToValueAtTime( value, endTime );
                } );
            }
        } else {
            var self = this;
            var initValue_ = self.value;
            var initTime_ = baseSound.audioContext.currentTime;
            intervalID_ = window.setInterval( function () {
                var timeRatio = ( baseSound.audioContext.currentTime - initTime_ ) / ( endTime - initTime_ );
                calledFromAutomation_ = true;
                self.value = initValue_ + ( ( value - initValue_ ) * timeRatio );
                if ( baseSound.audioContext.currentTime >= endTime ) {
                    window.clearInterval( intervalID_ );
                }
            }, UPDATE_INTERVAL_MS );
        }
    };

    /**
     * Schedules a linear continuous change in parameter value from the previous scheduled parameter value to the given value.
     *
     * @method cancelScheduledValues
     * @param {Number} startTime The startTime parameter is the starting time at and after which any previously scheduled parameter changes will be cancelled.
     */
    this.cancelScheduledValues = function ( startTime ) {
        if ( aParams ) {
            if ( aParams instanceof AudioParam ) {
                aParams.cancelScheduledValues( startTime );
            } else if ( aParams instanceof Array ) {
                aParams.forEach( function ( thisParam ) {
                    thisParam.cancelScheduledValues( startTime );
                } );
            }
        } else {
            window.clearInterval( intervalID_ );
        }
    };
}

/**
 * Static helper method to create Psuedo parameters which are not connected to
any WebAudio AudioParams.
 *
 * @method createPsuedoParam
 * @static
 * @return  SPAudioParam
 * @param {BaseSound} baseSound A reference to the BaseSound which exposes this parameter.
 * @param {String} name The name of the parameter..
 * @param {Number} minValue The minimum value of the parameter.
 * @param {Number} maxValue The maximum value of the parameter.
 * @param {Number} defaultValue The default and starting value of the parameter.
 */
SPAudioParam.createPsuedoParam = function ( baseSound, name, minValue, maxValue, defaultValue ) {
    return new SPAudioParam( baseSound, name, minValue, maxValue, defaultValue, null, null, null );
};

module.exports = SPAudioParam;

},{"../core/Config":4,"../core/WebAudioDispatch":12,"loglevel":1}],11:[function(_dereq_,module,exports){
/**
 * @module Core
 */
"use strict";
var Config = _dereq_( '../core/Config' );

/**
 * Wrapper around AudioParam playbackRate of SPAudioBufferSourceNode to help calculate the playbackPosition of the AudioBufferSourceNode.
 *
 * @class SPPlaybackRateParam
 * @constructor
 * @param {SPAudioBufferSourceNode} bufferSourceNode Reference to the parent SPAudioBufferSourceNode.
 * @param {AudioParam} audioParam The playbackRate of a source AudioBufferSourceNode.
 * @param {AudioParam} counterParam The playbackRate of counter AudioBufferSourceNode.
 */
function SPPlaybackRateParam( bufferSourceNode, audioParam, counterParam ) {
    this.defaultValue = audioParam.defaultValue;
    this.maxValue = audioParam.maxValue;
    this.minValue = audioParam.minValue;
    this.name = audioParam.name;
    this.units = audioParam.units;
    this.isSPPlaybackRateParam = true;

    Object.defineProperty( this, 'value', {
        enumerable: true,
        configurable: false,
        set: function ( rate ) {
            if ( bufferSourceNode.playbackState === bufferSourceNode.PLAYING_STATE ) {
                audioParam.setTargetAtTime( rate, bufferSourceNode.audioContext.currentTime, Config.DEFAULT_SMOOTHING_CONSTANT );
                counterParam.setTargetAtTime( rate, bufferSourceNode.audioContext.currentTime, Config.DEFAULT_SMOOTHING_CONSTANT );
            } else {
                audioParam.setValueAtTime( rate, bufferSourceNode.audioContext.currentTime );
                counterParam.setValueAtTime( rate, bufferSourceNode.audioContext.currentTime );
            }

        },
        get: function () {
            return audioParam.value;
        }
    } );

    audioParam.value = audioParam.value;
    counterParam.value = audioParam.value;

    this.linearRampToValueAtTime = function ( value, endTime ) {
        audioParam.linearRampToValueAtTime( value, endTime );
        counterParam.linearRampToValueAtTime( value, endTime );
    };

    this.exponentialRampToValueAtTime = function ( value, endTime ) {
        audioParam.exponentialRampToValueAtTime( value, endTime );
        counterParam.exponentialRampToValueAtTime( value, endTime );

    };

    this.setValueCurveAtTime = function ( values, startTime, duration ) {
        audioParam.setValueCurveAtTime( values, startTime, duration );
        counterParam.setValueCurveAtTime( values, startTime, duration );
    };

    this.setTargetAtTime = function ( target, startTime, timeConstant ) {
        audioParam.setTargetAtTime( target, startTime, timeConstant );
        counterParam.setTargetAtTime( target, startTime, timeConstant );

    };

    this.setValueAtTime = function ( value, time ) {
        audioParam.setValueAtTime( value, time );
        counterParam.setValueAtTime( value, time );
    };

    this.cancelScheduledValues = function ( time ) {
        audioParam.cancelScheduledValues( time );
        counterParam.cancelScheduledValues( time );
    };
}
module.exports = SPPlaybackRateParam;

},{"../core/Config":4}],12:[function(_dereq_,module,exports){
/**
 * @module Core
 *
 * @class WebAudioDispatch
 * @static
 */
"use strict";
var log = _dereq_( 'loglevel' );

/**
 * Helper class to dispatch manual syncronized calls to for WebAudioAPI. This is to be used for API calls which can't don't take in a time argument and hence are inherently Syncronized.
 *
 *
 * @method WebAudioDispatch
 * @param {Function} Function to be called at a specific time in the future.
 * @param {Number} TimeStamp at which the above function is to be called.
 * @param {String} audioContext AudioContext to be used for timing.
 */

function WebAudioDispatch( functionCall, time, audioContext ) {
    if ( !audioContext ) {
        log.error( "No AudioContext provided" );
        return;
    }
    var currentTime = audioContext.currentTime;
    // Dispatch anything that's scheduled for anything before current time, current time and the next 5 msecs
    if ( currentTime >= time || time - currentTime < 0.005 ) {
        log.debug( "Dispatching now" );
        functionCall();
        return null;
    } else {
        log.debug( "Dispatching in", ( time - currentTime ) * 1000, 'ms' );
        return window.setTimeout( function () {
            log.debug( "Diff at dispatch", ( time - audioContext.currentTime ) * 1000, 'ms' );
            functionCall();
        }, ( time - currentTime ) * 1000 );
    }
}

module.exports = WebAudioDispatch;

},{"loglevel":1}],13:[function(_dereq_,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"dup":12,"loglevel":1}],14:[function(_dereq_,module,exports){
/**
 * @module Models
 */

"use strict";

var Config = _dereq_( '../core/Config' );
var BaseSound = _dereq_( '../core/BaseSound' );
var SPAudioParam = _dereq_( '../core/SPAudioParam' );
var SPAudioBufferSourceNode = _dereq_( '../core/SPAudioBufferSourceNode' );
var multiFileLoader = _dereq_( '../core/MultiFileLoader' );
var webAudioDispatch = _dereq_( '../core/webAudioDispatch' );
var log = _dereq_( 'loglevel' );

/**
 *
 * A model which loads one or more sources and allows them to be looped continuously at variable speed.
 * @class Looper
 * @constructor
 * @extends BaseSound
 * @param {AudioContext} [context] AudioContext to be used.
 * @param {Array/String/AudioBuffer/SPAudioBuffer/File} [sources] Single or Array of either URLs or AudioBuffers or File Object of the audio source.
 * @param {Function} [onLoadProgress] Callback when the audio file is being downloaded.
 * @param {Function} [onLoadComplete] Callback when all sources have finished loading.
 * @param {Function} [onAudioStart] Callback when the audio is about to start playing.
 * @param {Function} [onAudioEnd] Callback when the audio has finished playing.
 * @param {Function} [onTrackEnd] Callback when an individual track has finished playing.
 */
function Looper( context, sources, onLoadProgress, onLoadComplete, onAudioStart, onAudioEnd, onTrackEnd ) {
    if ( !( this instanceof Looper ) ) {
        throw new TypeError( "Looper constructor cannot be called as a function." );
    }
    // Call superclass constructor
    BaseSound.call( this, context );
    this.maxSources = Config.MAX_VOICES;
    this.minSources = 1;
    this.modelName = 'Looper';

    this.onLoadProgress = onLoadProgress;
    this.onLoadComplete = onLoadComplete;
    this.onAudioStart = onAudioStart;
    this.onAudioEnd = onAudioEnd;

    // Private vars
    var self = this;

    var sourceBufferNodes_ = [];
    var rateArray_ = [];

    var onLoadAll = function ( status, arrayOfBuffers ) {
        self.multiTrackGain.length = arrayOfBuffers.length;
        arrayOfBuffers.forEach( function ( thisBuffer, trackIndex ) {
            insertBufferSource( thisBuffer, trackIndex, arrayOfBuffers.length );
        } );

        if ( rateArray_ && rateArray_.length > 0 ) {
            self.registerParameter( new SPAudioParam( self, 'playSpeed', 0.0, 10, 1, rateArray_, null, playSpeedSetter_ ), true );
        }

        if ( status ) {
            self.isInitialized = true;
        }

        if ( typeof self.onLoadComplete === 'function' ) {
            window.setTimeout( function () {
                if ( typeof self.onLoadComplete === 'function' ) {
                    self.onLoadComplete( status, arrayOfBuffers );
                }
            }, 0 );
        }
    };

    var insertBufferSource = function ( audioBuffer, trackIndex, totalTracks ) {
        var source;
        if ( !( sourceBufferNodes_[ trackIndex ] instanceof SPAudioBufferSourceNode ) ) {
            source = new SPAudioBufferSourceNode( self.audioContext );
        } else {
            source = sourceBufferNodes_[ trackIndex ];
        }

        source.buffer = audioBuffer;
        source.loopEnd = audioBuffer.duration;
        source.lastStopPosition_ = 0;
        source.onended = function ( event ) {
            onSourceEnd( event, trackIndex, source );
        };

        if ( totalTracks > 1 ) {
            var multiChannelGainParam = new SPAudioParam( self, 'track-' + trackIndex + '-gain', 0.0, 1, 1, source.gain, null, null );
            self.multiTrackGain.splice( trackIndex, 1, multiChannelGainParam );
        }

        source.connect( self.releaseGainNode );

        sourceBufferNodes_.splice( trackIndex, 1, source );
        rateArray_.push( source.playbackRate );
    };

    var onSourceEnd = function ( event, trackIndex, source ) {
        var cTime = self.audioContext.currentTime;
        // Create a new source since SourceNodes can't play again.
        source.resetBufferSource( cTime, self.releaseGainNode );

        if ( self.multiTrackGain.length > 1 ) {
            var multiChannelGainParam = new SPAudioParam( self, 'track-' + trackIndex + '-gain' + trackIndex, 0.0, 1, 1, source.gain, null, null );
            self.multiTrackGain.splice( trackIndex, 1, multiChannelGainParam );
        }

        if ( typeof self.onTrackEnd === 'function' ) {
            onTrackEnd( self, trackIndex );
        }

        var allSourcesEnded = sourceBufferNodes_.reduce( function ( prevState, thisSource ) {
            return prevState && ( thisSource.playbackState === thisSource.FINISHED_STATE ||
                thisSource.playbackState === thisSource.UNSCHEDULED_STATE );
        }, true );

        if ( allSourcesEnded && self.isPlaying ) {
            self.isPlaying = false;
            if ( typeof self.onAudioEnd === 'function' ) {
                self.onAudioEnd();
            }
        }
    };

    var playSpeedSetter_ = function ( aParam, value, audioContext ) {
        if ( self.isInitialized ) {
            /* 0.001 - 60dB Drop
                e(-n) = 0.001; - Decay Rate of setTargetAtTime.
                n = 6.90776;
                */
            var t60multiplier = 6.90776;

            var currentSpeed = sourceBufferNodes_[ 0 ] ? sourceBufferNodes_[ 0 ].playbackRate.value : 1;

            if ( self.isPlaying ) {
                log.debug( "easingIn/Out" );
                // easeIn/Out
                if ( value > currentSpeed ) {
                    sourceBufferNodes_.forEach( function ( thisSource ) {
                        thisSource.playbackRate.cancelScheduledValues( audioContext.currentTime );
                        thisSource.playbackRate.setTargetAtTime( value, audioContext.currentTime, self.easeIn.value / t60multiplier );
                    } );
                } else if ( value < currentSpeed ) {
                    sourceBufferNodes_.forEach( function ( thisSource ) {
                        thisSource.playbackRate.cancelScheduledValues( audioContext.currentTime );
                        thisSource.playbackRate.setTargetAtTime( value, audioContext.currentTime, self.easeOut.value / t60multiplier );
                    } );
                }
            } else {
                log.debug( "changing directly" );
                sourceBufferNodes_.forEach( function ( thisSource ) {
                    thisSource.playbackRate.cancelScheduledValues( audioContext.currentTime );
                    thisSource.playbackRate.setValueAtTime( value, audioContext.currentTime );
                } );
            }
        }
    };

    function init( sources ) {
        rateArray_ = [];
        sourceBufferNodes_.forEach( function ( thisSource ) {
            thisSource.disconnect();
        } );
        self.multiTrackGain.length = 0;
        multiFileLoader.call( self, sources, self.audioContext, self.onLoadProgress, onLoadAll );
    }

    // Public Properties

    /**
     * Event Handler or Callback for ending of a individual track.
     *
     * @property onTrackEnd
     * @type Function
     * @default null
     */
    this.onTrackEnd = onTrackEnd;

    /**
     * Speed of playback of the source. Affects both pitch and tempo.
     *
     * @property playSpeed
     * @type SPAudioParam
     * @default 1.0
     * @minvalue 0.0
     * @maxvalue 10.0
     */
    this.registerParameter( new SPAudioParam( this, 'playSpeed', 0.0, 10, 1.005, null, null, playSpeedSetter_ ), true );

    /**
     * Rate of increase of Play Speed. It is the time-constant value of first-order filter (exponential) which approaches the target speed set by the {{#crossLink "Looper/playSpeed:property"}}{{/crossLink}} property.
     *
     * @property easeIn
     * @type SPAudioParam
     * @default 0.05
     * @minvalue 0.05
     * @maxvalue 10.0
     */

    this.registerParameter( SPAudioParam.createPsuedoParam( this, 'easeIn', 0.05, 10.0, 0.05 ) );

    /**
     * Rate of decrease of Play Speed. It is the time-constant value of first-order filter (exponential) which approaches the target speed set by the {{#crossLink "Looper/playSpeed:property"}}{{/crossLink}} property.
     *
     * @property easeOut
     * @type SPAudioParam
     * @default 0.05
     * @minvalue 0.05
     * @maxvalue 10.0
     */
    this.registerParameter( SPAudioParam.createPsuedoParam( this, 'easeOut', 0.05, 10.0, 0.05 ) );

    /**
     * The volume (loudness) for each individual track if multiple sources are used. Works even if a single source is used.
     *
     *
     * @property multiTrackGain
     * @type Array of SPAudioParams
     * @default 1.0
     * @minvalue 0.0
     * @maxvalue 1.0
     */
    var multiTrackGainArray = [];
    multiTrackGainArray.name = 'multiTrackGain';
    this.registerParameter( multiTrackGainArray, false );

    /**
     * The maximum number time the source will be looped before stopping. Currently only supports -1 (loop indefinitely), and 1 (only play the track once, ie. no looping).
     *
     * @property maxLoops
     * @type SPAudioParam
     * @default -1 (Infinite)
     * @minvalue -1 (Infinite)
     * @maxvalue 1
     */
    this.registerParameter( SPAudioParam.createPsuedoParam( this, 'maxLoops', -1, 1, -1 ) );

    /**
     * Reinitializes a Looper and sets it's sources.
     *
     * @method setSources
     * @param {Array/AudioBuffer/String/File} sources Single or Array of either URLs or AudioBuffers of sources.
     * @param {Function} [onLoadProgress] Callback when the audio file is being downloaded.
     * @param {Function} [onLoadComplete] Callback when all sources have finished loading.
     */
    this.setSources = function ( sources, onLoadProgress, onLoadComplete ) {
        BaseSound.prototype.setSources.call( this, sources, onLoadProgress, onLoadComplete );
        init( sources );
    };

    /**
     * Plays the model immediately. If the model is paused, the model will be played back from the same position as it was paused at.
     *
     * @method play
     *
     */
    this.play = function () {

        if ( !this.isInitialized ) {
            throw new Error( this.modelName, "hasn't finished Initializing yet. Please wait before calling start/play" );
        }

        var now = this.audioContext.currentTime;

        if ( !this.isPlaying ) {
            sourceBufferNodes_.forEach( function ( thisSource ) {
                var offset = thisSource.lastStopPosition_ || thisSource.loopStart;
                thisSource.loop = ( self.maxLoops.value !== 1 );
                thisSource.start( now, offset );
            } );
            BaseSound.prototype.start.call( this, now );
            webAudioDispatch( function () {
                if ( typeof self.onAudioStart === 'function' ) {
                    self.onAudioStart();
                }
            }, now, this.audioContext );
        }
    };

    /**
     * Start playing after specific time and from a specific offset.
     *
     * @method start
     * @param {Number} when Time (in seconds) when the sound should start playing.
     * @param {Number} [offset] The starting position of the playhead in seconds
     * @param {Number} [duration] Duration of the portion (in seconds) to be played
     * @param {Number} [attackDuration] Duration (in seconds) of attack ramp of the envelope.
     */
    this.start = function ( when, offset, duration, attackDuration ) {
        if ( !this.isInitialized ) {
            log.warn( this.modelName, " hasn't finished Initializing yet. Please wait before calling start/play" );
            return;
        }

        if ( !this.isPlaying ) {
            sourceBufferNodes_.forEach( function ( thisSource ) {

                offset = thisSource.loopStart + parseFloat( offset ) || 0;

                if ( typeof duration == 'undefined' || duration === null ) {
                    duration = thisSource.buffer.duration;
                }
                thisSource.loop = ( self.maxLoops.value !== 1 );
                thisSource.start( when, offset, duration );
            } );

            BaseSound.prototype.start.call( this, when, offset, duration, attackDuration );
            webAudioDispatch( function () {
                if ( typeof self.onAudioStart === 'function' ) {
                    self.onAudioStart();
                }
            }, when, this.audioContext );
        }
    };

    /**
     * Stops the model and resets play head to 0.
     * @method stop
     * @param {Number} when Time offset to stop
     */
    this.stop = function ( when ) {
        if ( self.isPlaying ) {
            sourceBufferNodes_.forEach( function ( thisSource ) {
                thisSource.stop( when );
                thisSource.lastStopPosition_ = 0;
            } );

            BaseSound.prototype.stop.call( this, when );
            webAudioDispatch( function () {
                if ( typeof self.onAudioEnd === 'function' && self.isPlaying === false ) {
                    self.onAudioEnd();
                }
            }, when, this.audioContext );
        }
    };

    /**
     * Pause the currently playing model at the current position.
     *
     * @method pause
     */
    this.pause = function () {
        if ( self.isPlaying ) {

            sourceBufferNodes_.forEach( function ( thisSource ) {
                thisSource.stop( 0 );
                thisSource.lastStopPosition_ = thisSource.playbackPosition / thisSource.buffer.sampleRate;
            } );

            BaseSound.prototype.stop.call( this, 0 );
            webAudioDispatch( function () {
                if ( typeof self.onAudioEnd === 'function' ) {
                    self.onAudioEnd();
                }
            }, 0, this.audioContext );
        }
    };

    /**
     * Linearly ramp down the gain of the audio in time (seconds) to 0.
     *
     * @method release
     * @param {Number} [when] Time (in seconds) at which the Envelope will release.
     * @param {Number} [fadeTime] Amount of time (seconds) it takes for linear ramp down to happen.
     * @param {Boolean} [resetOnRelease] Boolean to define if release resets (stops) the playback or just pauses it.
     */
    this.release = function ( when, fadeTime, resetOnRelease ) {
        if ( typeof when === 'undefined' || when < this.audioContext.currentTime ) {
            when = this.audioContext.currentTime;
        }

        var FADE_TIME = 0.5;
        fadeTime = fadeTime || FADE_TIME;

        BaseSound.prototype.release.call( this, when, fadeTime, resetOnRelease );
        // Pause the sound after currentTime + fadeTime + FADE_TIME_PAD

        if ( resetOnRelease ) {
            // Create new releaseGain Node
            this.releaseGainNode = this.audioContext.createGain();
            this.destinations.forEach( function ( dest ) {
                self.releaseGainNode.connect( dest.destination, dest.output, dest.input );
            } );

            // Disconnect and rewire each source
            sourceBufferNodes_.forEach( function ( thisSource, trackIndex ) {
                thisSource.stop( when + fadeTime );
                thisSource.lastStopPosition_ = 0;

                thisSource.resetBufferSource( when, self.releaseGainNode );
                var multiChannelGainParam = new SPAudioParam( self, 'gain-' + trackIndex, 0.0, 1, 1, thisSource.gain, null, null );
                self.multiTrackGain.splice( trackIndex, 1, multiChannelGainParam );
            } );

            // Set playing to false and end audio after given time.
            this.isPlaying = false;
            webAudioDispatch( function () {
                if ( typeof self.onAudioEnd === 'function' && self.isPlaying === false ) {
                    self.onAudioEnd();
                }
            }, when + fadeTime, this.audioContext );
        }
    };

    // Initialize the sources.
    init( sources );
}

Looper.prototype = Object.create( BaseSound.prototype );

module.exports = Looper;

},{"../core/BaseSound":3,"../core/Config":4,"../core/MultiFileLoader":7,"../core/SPAudioBufferSourceNode":9,"../core/SPAudioParam":10,"../core/webAudioDispatch":13,"loglevel":1}]},{},[14])(14)
});
