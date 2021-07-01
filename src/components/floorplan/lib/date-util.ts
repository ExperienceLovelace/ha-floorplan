import strftime from 'strftime';
import { format as timeago } from 'timeago.js';

export class DateUtil {
  static strftime = strftime;
  static timeago = timeago;
}
