/* The Logger class provides methods for logging messages with a specified prefix. */
class Logger {
    constructor(prefix) {
        this.prefix = prefix;
    }

    buildString = (string) => `${this.prefix}: ${string}`;
    error = (string) => console.error(this.buildString(string));
    log = (string) => console.log(this.buildString(string));
    warn = (string) => console.warn(this.buildString(string));
}
