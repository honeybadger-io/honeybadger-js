// Copy type declaration files for backwards compatibility with earlier versions of Honeybadger
const fs = require('fs');
const path = require('path');

function copyFileSync( source, target ) {

  let targetFile = target;

  // If target is a directory, a new file with the same name will be created
  if ( fs.existsSync( target ) ) {
    if ( fs.lstatSync( target ).isDirectory() ) {
      targetFile = path.join( target, path.basename( source ) );
    }
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source, 'utf8').replace(/'\.\//g, '\'./types/'));
}

function copyFolderRecursiveSync( source, target ) {
  let files = [];

  // Check if folder needs to be created or integrated
  // let targetFolder = path.join( target, path.basename( source ) );
  const targetFolder = target;
  if ( !fs.existsSync( targetFolder ) ) {
    fs.mkdirSync( targetFolder );
  }

  // Copy
  if ( fs.lstatSync( source ).isDirectory() ) {
    files = fs.readdirSync( source );
    files.forEach( function ( file ) {
      let curSource = path.join( source, file );
      if ( fs.lstatSync( curSource ).isDirectory() ) {
        copyFolderRecursiveSync( curSource, path.join(targetFolder, file) );
      } else {
        if (curSource.endsWith('d.ts')) {
          copyFileSync( curSource, targetFolder );
        }

      }
    } );
  }
}

copyFolderRecursiveSync('build/src/browser', 'dist/browser');
fs.writeFileSync(
  'dist/browser/honeybadger.d.ts',
  (fs.readFileSync('build/src/browser.d.ts', 'utf8')).replace(/'\.\/browser\//g, '\'./')
);

copyFolderRecursiveSync('build/src/server', 'dist/server');
fs.writeFileSync(
  'dist/server/honeybadger.d.ts',
  (fs.readFileSync('build/src/server.d.ts', 'utf8')).replace(/'\.\/server\//g, '\'./')
);

console.info('Copied declaration files');
