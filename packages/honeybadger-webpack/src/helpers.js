import VError from 'verror';
import { REQUIRED_FIELDS } from './constants';

export function handleError(err, prefix = 'HoneybadgerSourceMapPlugin') {
  if (!err) {
    return [];
  }

  const errors = [].concat(err);
  return errors.map(e => new VError(e, prefix));
}

export function validateOptions(ref) {
  const errors = REQUIRED_FIELDS.reduce((result, field) => {
    if (ref && ref[field]) {
      return result;
    }

    return [
      ...result,
      new Error(`required field, '${field}', is missing.`)
    ];
  }, []);

  return errors.length ? errors : null;
}
