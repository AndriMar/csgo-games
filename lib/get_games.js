'use strict'
const Steam = require('steam')
const steamClient = new Steam.SteamClient()
const steamUser = new Steam.SteamUser(steamClient)
const steamFriends = new Steam.SteamFriends(steamClient)
const fs = require('fs')
const mkdir = require('mkdirp')
const gameParser = require('./game_parser')
const _ = require('underscore')
let friends = []
const steamGC = new Steam.SteamGameCoordinator(steamClient, 730)
const csgo = require('csgo')
const CSGO = new csgo.CSGOClient(steamUser, steamGC, false)
let friendSincCounter = 0
let totalFriends = 0

function getAvatarURL(hash) {
  const tag = hash.substr(0, 2)
  let url = `http://cdn.akamai.steamstatic.com/steamcommunity/public/images/avatars/${tag}/${hash}_full.jpg`
  if (hash === '0000000000000000000000000000000000000000') {
    url = 'http://cdn.akamai.steamstatic.com/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
  }
  return url
}
// Hack
function getNextCSGO() {
  if (friends.length === 0) {
    process.exit(1)
  }
  const f = friends.pop()
  const accountId = CSGO.ToAccountID(f)
  const p = Math.floor(((totalFriends - friends.length) / totalFriends) * 100)
  console.log(`Getting csgo info: ${p}%`)
  //  Hack to get responce from steam
  setTimeout(() => {
    CSGO.playerProfileRequest(accountId)
  }, 1000)
}
steamClient.connect()
steamClient.on('connected', () => {
  steamUser.logOn({
    account_name: process.env.STEAM_USERNAME,
    password: process.env.STEAM_PASSWORD,
  })
})
steamClient.on('logOnResponse', (logonResp) => {
  if (logonResp.eresult === Steam.EResult.OK) {
    console.log('logged in on steam', steamClient.steamID)
    CSGO.launch()
  } else {
    console.log('Failed to login', logonResp)
  }
})
steamClient.on('error', (e) => {
  console.log('Error:', e)
})
steamFriends.on('relationships', () => {
  console.log('got relations')
  friends = Object.keys(steamFriends.friends)
  friends.push(steamClient.steamID)
  totalFriends = friends.length
  steamFriends.requestFriendData(friends)
})

steamFriends.on('personaState', (friend) => {
  mkdir(`db/${friend.friendid}`, (err) => {
    if (err) {
      console.log(err)
    } else {
      friendSincCounter++
      const friendSave = {}
      friendSave.friendid = friend.friendid
      friendSave.avatar = getAvatarURL(friend.avatar_hash.toString('hex'))
      friendSave.player_name = friend.player_name
      fs.writeFileSync(`db/${friend.friendid}/info.json`, JSON.stringify(friendSave))
      mkdir(`db/${friend.friendid}/matches`)
      const p = Math.floor((friendSincCounter / totalFriends) * 100)
      console.log(`Friend sinc ${p}%`)
    }
  })
})
steamFriends.on('personaState', (person) => {
  const accountId = CSGO.ToAccountID(person.friendid)
  CSGO.playerProfileRequest(accountId)
})

CSGO.on('ready', function () {
  console.log('csgo ready')
  CSGO.requestRecentGames()
  getNextCSGO()
})

CSGO.on('matchList', (matches) => {
  const parsed = gameParser(matches)
  parsed.forEach((match) => {
    match.players.forEach((_player) => {
      const steamID = CSGO.ToSteamID(_player.account_id)
      fs.exists(`db/${steamID}`, function (exists) {
        if (exists) {
          const player = _player
          player.match_result = match.match_result
          player.replay = match.replay
          player.team_scores = match.team_scores
          player.time = match.time
          fs.writeFileSync(`db/${steamID}/matches/${match.id}`, JSON.stringify(player))
        }
      })
    })
  })
})

CSGO.on('playerProfile', (player) => {
  if (player.account_profiles.length === 0 || !player.account_profiles[0].ranking) {
    getNextCSGO()
    return
  }
  const playerProfile = player.account_profiles[0]
  const steamID = CSGO.ToSteamID(playerProfile.account_id)
  fs.exists(`db/${steamID}/ranks.json`, (exists) => {
    if (exists) {
      const newRanking = playerProfile.ranking
      const ranks = require(`../db/${steamID}/ranks.json`)
      const lastRank = _(ranks).last()
      if (lastRank.rank_id === newRanking.rank_id) {
        _(ranks).last().wins = newRanking.wins
      } else {
        newRanking.date = new Date()
        ranks.push(newRanking)
      }
      fs.writeFileSync(`db/${steamID}/ranks.json`, JSON.stringify(ranks))
    } else {
      playerProfile.ranking.date = new Date()
      fs.writeFileSync(`db/${steamID}/ranks.json`, JSON.stringify([playerProfile.ranking]))
    }
  })
  getNextCSGO()
})
