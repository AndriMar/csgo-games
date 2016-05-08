'use strict'
const _ = require('underscore')
function parseGame(game, time) {
  const theZip = _.zip(game.reservation.account_ids, game.kills, game.assists, game.deaths, game.scores, game.enemy_kills, game.enemy_headshots, game.mvps)
  const players = theZip.map((player) => {
    return _.object(['account_id', 'kills', 'assists', 'deaths', 'scores', 'enemy_kills', 'enemy_headshots', 'mvps'], player)
  })
  const result = {}
  result.players = players
  result.match_result = game.match_result
  result.replay = game.map
  result.team_scores = game.team_scores
  const id = game.map.match(/[0-9]*_[0-9]*/g)
  result.id = id ? id[0] : ''
  result.time = time

  return result
}
module.exports = function (games) {
  return games.matches.map((match) => {
    return parseGame(_(match.roundstatsall).last(), match.matchtime)
  })
}
