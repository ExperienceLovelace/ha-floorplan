import { Utils } from '../../../lib/utils';

export class Logger {
  logLevelGroups = {
    error: ['error'],
    warn: ['error', 'warning', 'warn'],
    warning: ['error', 'warning', 'warn'],
    info: ['error', 'warning', 'warn', 'info'],
    debug: ['error', 'warning', 'warn', 'info', 'debug'],
  } as { [index: string]: string[] };

  constructor(
    public element: HTMLElement,
    public logLevel?: string,
    public consoleLogLevel?: string
  ) {}

  log(level: string, message: string, force = false): void {
    const text = `${Utils.formatDate(
      new Date()
    )} ${level.toUpperCase()} ${message}`;

    const targetLogLevels =
      this.logLevel && this.logLevelGroups[this.logLevel.toLowerCase()];
    const shouldLog =
      targetLogLevels?.length && targetLogLevels.includes(level.toLowerCase());

    if (force || shouldLog) {
      if (this.element) {
        const listItemElement = document.createElement('li');
        Utils.addClass(listItemElement, level);
        listItemElement.textContent = text;
        this.element.querySelector('ul')?.prepend(listItemElement);
        this.element.style.display = 'block';
      }
    }

    this.consoleLog(level, message, force);
  }

  consoleLog(level: string, message: string, force = false): void {
    const text = `${Utils.formatDate(
      new Date()
    )} ${level.toUpperCase()} ${message}`;

    const targetLogLevels =
      this.consoleLogLevel &&
      this.logLevelGroups[this.consoleLogLevel.toLowerCase()];
    const shouldLog =
      targetLogLevels?.length && targetLogLevels.includes(level.toLowerCase());

    if (force || shouldLog) {
      switch (level) {
        case 'error':
          console.error(text);
          break;

        case 'warn':
        case 'warning':
          console.warn(text);
          break;

        case 'info':
          console.info(text);
          break;

        default:
          console.log(text);
          break;
      }
    }
  }
}
