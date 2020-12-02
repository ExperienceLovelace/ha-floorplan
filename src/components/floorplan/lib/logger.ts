import { Utils } from "../../../lib/utils";

export abstract class LoggerBase {
  logLevelGroups = {
    error: ['error'],
    warn: ['error', 'warning', 'warn'],
    warning: ['error', 'warning', 'warn'],
    info: ['error', 'warning', 'warn', 'info'],
    debug: ['error', 'warning', 'warn', 'info', 'debug'],
  } as { [index: string]: Array<string> };

  constructor(public logLevel?: string) {
  }

  abstract log(level: string, message: string, force: boolean): void;
}

export class Logger extends LoggerBase {
  logLevelGroups = {
    error: ['error'],
    warn: ['error', 'warning', 'warn'],
    warning: ['error', 'warning', 'warn'],
    info: ['error', 'warning', 'warn', 'info'],
    debug: ['error', 'warning', 'warn', 'info', 'debug'],
  } as { [index: string]: Array<string> };

  constructor(public element: HTMLElement, public logLevel?: string, public debugLevel?: string) {
    super(logLevel);
  }

  log(level: string, message: string, force = false): void {
    const text = `${Utils.formatDate(new Date())} ${level.toUpperCase()} ${message}`;

    const targetLogLevels = this.logLevel && this.logLevelGroups[this.logLevel.toLowerCase()];
    const shouldLog = targetLogLevels?.length && (targetLogLevels.indexOf(level.toLowerCase()) >= 0);

    if (force || shouldLog) {
      if (this.element) {
        const listItemElement = document.createElement('li');
        Utils.addClass(listItemElement, level);
        listItemElement.textContent = text;
        this.element.querySelector('ul')?.prepend(listItemElement);
        this.element.style.display = 'block';
      }
    }

    this.consoleLog(level, message);
  }

  consoleLog(level: string, message: string, force = false): void {
    const text = `${Utils.formatDate(new Date())} ${level.toUpperCase()} ${message}`;

    const targetLogLevels = this.debugLevel && this.logLevelGroups[this.debugLevel.toLowerCase()];
    const shouldLog = targetLogLevels?.length && (targetLogLevels.indexOf(level.toLowerCase()) >= 0);

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
