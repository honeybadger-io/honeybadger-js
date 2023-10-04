import VError from 'verror'

export function handleError (err, prefix = 'HoneybadgerSourceMapPlugin') {
  if (!err) {
    return []
  }

  const errors = [].concat(err)
  return errors.map(e => new VError(e, prefix))
}


