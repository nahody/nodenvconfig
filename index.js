'use strict';

var str2json = require('string-to-json');
var _        = require('lodash');
var konphyg  = require('konphyg');

/**
 * CLASS nodenvconf
 *
 * Filter node environment variables which starts with specific string and collect them to key/value object.
 * Default settings can be changed trough options. Options.key (default: 'nodenv') describe the variable start string, which will be truncated.
 * Options.delimiter (default: '_') is used as delimiter for the start match string and for creating object depth.
 *
 */
class nodenvconf {
    /**
     * Constructor
     * @param  key           default: nodenv
     *         delimiter     default: _
     *         configDir     default: null // (__dirname + "/serve/config")
     *
     *
     */
    constructor(options) {
        // options
        this.options = {
            key: 'nodenv',
            delimiter: '_',
            configDir: null
        };

        Object.assign(this.options, options );

        // hidden properties
        this._env = {};
        this._files = {};
        this._konphyg = null;
        this._config = null;


        // Init konphyg
        try {
            if (this.options.configDir !== null) {
                this._konphyg = new konphyg(this.options.configDir);
            }
        } catch (e) {
            throw 'Could not init konphyg. Check your configDir settings: ' + this.options.configDir;
        }
    }

    /**
     * Collect all node process environments that match the option config requirements.
     *
     * @returns object
     *
     * @TODO Remove string-to-json package and implement own function via maps.
     */
    dispatchEnv() {
        let self = this;

        // Instantiate new object
        self._env = {};

        // Process all env keys
        Object.keys(process.env).forEach(function(key) {
            try {
                if (key.indexOf(self.options.key + self.options.delimiter) === 0) {
                    let _obj = {};
                    let _key = key.replace(self.options.key + self.options.delimiter, ''); // do not work. why? => key.slice(-8);
                    _key = _key.replace(self.options.delimiter, '.');
                    _obj[_key] = process.env[key];
                    let _env = str2json.convert(_obj);

                    _.merge(self._env, _env);
                }
            } catch (e) {
                _.merge(self._env, { error: e, description: 'Error on processing environment variables!' });
            }
        });
    }

    /**
     * Run konphyg, if enabled, and read files
     *
     * @param domain
     */
    dispatchConfig(domain) {
        if (this._konphyg !== null) {
            this._konphyg.clear();

            if (typeof domain === 'string') {
                this._files = this._konphyg(domain);
            } else {
                this._files = this._konphyg.all();
            }
        }
    }


    /**
     * Dispatch the config files and env variables and merge them to one config.
     * ENV variables override the static config files.
     *
     * @param reload
     * @returns {null}
     */
    dispatch(reload) {
        if (reload === true) {
            this._config = null;
        }

        // Dispatch automatically only first time
        if (this._config === null) {
            this.dispatchEnv();
            this.dispatchConfig();
            this._config = {};

            _.merge(this._config, this._files, this._env);
        }

        return this._config;
    }

    /**
     * Return the config values.
     *
     * @returns {object}
     */
    get config() {
        if (this._config === null) {
            this.dispatch();
        }

        return this._config;
    }

    /**
     * Return an instance of konphyg, if enabled. Otherwise null.
     *
     * @returns {konphyg|null}
     */
    get konphyg() {
        return this._konphyg;
    }
}

module.exports = nodenvconf;