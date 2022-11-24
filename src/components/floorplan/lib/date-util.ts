import strftime from 'strftime';
import TimeAgo from 'javascript-time-ago';

import * as files from '../../../../node_modules/javascript-time-ago/locale/*.js';

let locale = navigator.language; // use browser's locale
if (!files[`${locale}.json`]) { // check if locale supported by TimeAgo package
  locale = locale.includes('-') ? locale.split('-')[0] : locale; // if not, try shorter version of locale
}
locale = files[`${locale}.json`] ? locale : 'en'; // if locale not supported by TimeAgo package, use English (en) locale

TimeAgo.addDefaultLocale(files[`${locale}.json`].default);
const timeAgo = new TimeAgo(navigator.language);

export class DateUtil {
  static strftime = strftime;

  static timeago(date: string | Date) {
    const targetDate = (typeof date === 'string') ? new Date(date) : date;
    return timeAgo.format(targetDate, 'round');
  }
}
