import strftime from 'strftime';

export class DateUtil {
  static strftime = strftime;

  static MILLISECONDS_IN_SECOND = 1000;
  static MILLISECONDS_IN_MINUTE = 1000 * 60;
  static MILLISECONDS_IN_HOUR = 1000 * 60 * 60;
  static MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
  static MILLISECONDS_IN_YEAR = 1000 * 60 * 60 * 24 * 365;

  static relativeTimeFormat = new Intl.RelativeTimeFormat(
    navigator.language ?? 'en',
    {
      numeric: 'auto',
      style: 'long',
    }
  );

  static timeago(date: string | Date): string {
    const targetDate = typeof date === 'string' ? new Date(date) : date;

    let unit = 'second' as RelativeTimeFormatUnit;
    let diff = 0;

    const diffMilliseconds = targetDate.getTime() - new Date().getTime();

    const diffYears = diffMilliseconds / this.MILLISECONDS_IN_YEAR;
    if (Math.abs(diffYears) >= 1) {
      unit = 'year';
      diff = diffYears;
    } else {
      const diffDays = diffMilliseconds / this.MILLISECONDS_IN_DAY;
      if (Math.abs(diffDays) >= 1) {
        unit = 'day';
        diff = diffDays;
      } else {
        const diffHours = diffMilliseconds / this.MILLISECONDS_IN_HOUR;
        if (Math.abs(diffHours) >= 1) {
          unit = 'hour';
          diff = diffHours;
        } else {
          const diffMinutes = diffMilliseconds / this.MILLISECONDS_IN_MINUTE;
          if (Math.abs(diffMinutes) >= 1) {
            unit = 'minute';
            diff = diffMinutes;
          } else {
            const diffSeconds = diffMilliseconds / this.MILLISECONDS_IN_SECOND;
            unit = 'second';
            diff = diffSeconds;
          }
        }
      }
    }

    return this.relativeTimeFormat.format(Math.round(diff), unit);
  }
}

type RelativeTimeFormatUnit =
  | 'year'
  | 'years'
  | 'quarter'
  | 'quarters'
  | 'month'
  | 'months'
  | 'week'
  | 'weeks'
  | 'day'
  | 'days'
  | 'hour'
  | 'hours'
  | 'minute'
  | 'minutes'
  | 'second'
  | 'seconds';
