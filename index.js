#!/usr/bin/env node

process.title = 'dat-next-next'

var discovery = require('hyperdiscovery')
var hyperdrive = require('hyperdrive')
var mirror = require('mirror-folder')
var minimist = require('minimist')
var path = require('path')
var hyperstaging = require('hyperdrive-staging-area')

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

var argv = minimist(process.argv.slice(2), {
  default: {utp: true, watch: true, seed: false, all: false},
  boolean: ['utp', 'watch', 'all']
})

var key = argv._[0]

if (!key) diff()
else if (key === 'commit') commit()
else if (key === 'revert') revert()
else download(new Buffer(key, 'hex'))

function download (key) {
  var filter = argv._[1] || '/'
  var archive = hyperdrive('.dat', key, {sparse: true})

  if (filter[0] !== '/') filter = '/' + filter

  archive.on('ready', function () {
    console.log('Syncing to', process.cwd())
    console.log('Key is: ' + archive.key.toString('hex'))

    if (archive.metadata.length) {
      copy()
    } else {
      console.log('Waiting for update ...')
      archive.metadata.once('append', copy)
    }

    discovery(archive, {live: true, utp: !!argv.utp})

    function copy () {
      console.log('Dat contains ' + archive.metadata.length + ' changes')

      var length = archive.metadata.length
      var progress = mirror({name: filter, fs: archive}, path.join(process.cwd(), filter))
      var changed = false

      progress.on('put', function (src) {
        changed = true
        console.log('Downloading file', src.name)
      })

      progress.on('del', function (src) {
        changed = true
        console.log('Removing file', src.name)
      })

      progress.on('end', function () {
        if (!changed) {
          console.log('In sync, waiting for update ...')
          if (length !== archive.metadata.length) copy()
          else archive.metadata.once('append', copy)
          return
        }
        console.log('Done! Bye.')
        process.exit(0)
      })
    }
  })
}

function diff () {
  var archive = hyperdrive('.dat')
  var staging = hyperstaging(archive, '.')

  archive.on('ready', function () {
    console.log('Diffing', process.cwd())
    console.log('Key is: ' + archive.key.toString('hex'))

    staging.diff({skipIgnore: argv.all}, function (err, changes) {
      if (err) return console.error(err)
      renderDiff(changes)
    })
  })
}

function commit () {
  var archive = hyperdrive('.dat')
  var staging = hyperstaging(archive, '.')

  console.log(argv)

  archive.on('ready', function () {
    console.log('Sharing', process.cwd())
    console.log('Key is: ' + archive.key.toString('hex'))

    discovery(archive, {live: true, utp: !!argv.utp})

    if (!!argv.seed) return

    staging.commit({skipIgnore: argv.all}, function (err, changes) {
      if (err) return console.error(err)
      renderDiff(changes)
      console.log('Sharing...')
    })
  })
}

function revert () {
  var archive = hyperdrive('.dat')
  var staging = hyperstaging(archive, '.')

  archive.on('ready', function () {
    console.log('Reverting', process.cwd())
    console.log('Key is: ' + archive.key.toString('hex'))

    staging.revert({skipIgnore: argv.all}, function (err, changes) {
      if (err) return console.error(err)
      renderDiff(changes, {opposite: true})
    })
  })
}

function renderDiff (changes, opts) {
  var opposite = opts && opts.opposite
  if (changes.length === 0) {
    return console.log('No changes')
  }
  changes.forEach(d => {
    var op = d.change
    if (opposite) {
      if (op === 'add') op = '--'
      if (op === 'mod') op = '~~'
      if (op === 'del') op = '++'
    } else {
      if (op === 'add') op = '++'
      if (op === 'mod') op = '~~'
      if (op === 'del') op = '--'      
    }
    console.log(op.toUpperCase(), d.path)
  })
}

function ignore (name, st) {
  if (st && st.isDirectory()) return true // ignore dirs
  if (name.indexOf('.DS_Store') > -1) return true
  if (name.indexOf('.dat') > -1) return true
  return false
}
